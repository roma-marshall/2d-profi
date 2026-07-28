<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import TerracePreview from '@/components/configurator/TerracePreview.vue'
import { shapeOptionById } from '@/data/shapes'
import { specialElementOptionById } from '@/data/specialElements'
import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type {
  SpecialElementType,
  TerraceConfig,
  TerraceDimensions,
} from '@/types/terrace'

const props = defineProps<{
  open: boolean
  config: TerraceConfig
  areaSquareMeters: number
  isSaved: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  print: []
  save: []
}>()

const summaryDialog = ref<HTMLDialogElement | null>(null)

const shapeLabel = computed(
  () => shapeOptionById[props.config.shape].label,
)
const textureLabel = computed(
  () => woodTextureById[props.config.texture].label,
)
const geometry = computed(() =>
  createTerraceGeometry(
    props.config.shape,
    props.config.dimensions as TerraceDimensions,
  ),
)
const boardLayoutLabel = computed(() =>
  props.config.boardDirection === 'custom'
    ? `${props.config.decking.angle}° custom`
    : `${props.config.boardDirection} (${props.config.decking.angle}°)`,
)

const estimatedDeckingArea = computed(
  () => props.areaSquareMeters * 1.1,
)
const estimatedLinearMeters = computed(
  () =>
    estimatedDeckingArea.value /
    (props.config.decking.boardWidth / 100),
)
const estimatedThreeMeterBoards = computed(() =>
  Math.ceil(estimatedLinearMeters.value / 3),
)

const dimensionSummary = computed(() => {
  if (props.config.shape === 'free-form') {
    return geometry.value.edges.map((edge) => ({
      key: `edge:${edge.id}`,
      label: `Edge ${edge.startVertexId}–${edge.endVertexId}`,
      value: Math.round(edge.length * 10) / 10,
    }))
  }

  const dimensions = props.config
    .dimensions as TerraceDimensions as unknown as Record<string, number>

  return shapeOptionById[props.config.shape].fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: field.getValue?.(dimensions) ?? dimensions[field.key] ?? 0,
  }))
})

const specialElementSummary = computed(() => {
  const occurrences = new Map<SpecialElementType, number>()

  return props.config.specialElements.map((element) => {
    const instance = (occurrences.get(element.type) ?? 0) + 1
    occurrences.set(element.type, instance)
    let dimensions: string
    switch (element.type) {
      case 'house-wall':
        dimensions = `${element.dimensions.length} × ${element.dimensions.thickness} cm`
        break
      case 'rect-cutout':
        dimensions = `${element.dimensions.width} × ${element.dimensions.depth} cm`
        break
      case 'circle-cutout':
        dimensions = `Ø ${element.dimensions.diameter} cm`
        break
      case 'stairs':
        dimensions = `${element.dimensions.width} × ${element.dimensions.depth} cm · ${element.dimensions.steps} steps`
        break
    }

    return {
      id: element.id,
      label: `${specialElementOptionById[element.type].shortLabel} ${instance}`,
      value: `${dimensions} · ${element.rotation}°`,
    }
  })
})

const closeSummary = (): void => {
  if (summaryDialog.value?.open) {
    summaryDialog.value.close()
  }
}

const handleSummaryCancel = (event: Event): void => {
  event.preventDefault()
  closeSummary()
}

const handleSummaryBackdropClick = (event: MouseEvent): void => {
  if (event.target === event.currentTarget) {
    closeSummary()
  }
}

watch(
  () => props.open,
  async (open) => {
    await nextTick()

    const dialog = summaryDialog.value
    if (dialog === null) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  },
  { immediate: true },
)
</script>

<template>
  <dialog
    ref="summaryDialog"
    class="plan-summary-dialog m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto border-0 bg-transparent p-0"
    aria-labelledby="plan-summary-title"
    @cancel="handleSummaryCancel"
    @click="handleSummaryBackdropClick"
    @close="emit('update:open', false)"
  >
    <section
      class="w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
    >
      <header
        class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4"
      >
        <div>
          <p class="text-[0.625rem] font-bold tracking-[0.14em] text-[#648349] uppercase">
            Local configuration
          </p>
          <h2
            id="plan-summary-title"
            class="mt-0.5 text-xl font-extrabold tracking-[-0.03em] text-stone-900"
          >
            Plan summary
          </h2>
        </div>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-lg border border-stone-200 text-lg text-stone-500 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-100"
          aria-label="Close plan summary"
          @click="closeSummary"
        >
          ×
        </button>
      </header>

      <div class="p-5">
        <TerracePreview
          class="print-plan-preview hidden"
          :config="config"
          :active-dimension-key="null"
          :active-special-element-id="null"
          :can-undo="false"
          :can-redo="false"
          :print-mode="true"
          aria-hidden="true"
        />

        <div
          class="mb-5 flex flex-col gap-3 rounded-lg border border-[#dce7d2] bg-[#f2f7ed] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-xs font-bold text-[#4e6c38]">
              {{ shapeLabel }} terrace
            </p>
            <p class="mt-0.5 text-[0.6875rem] text-[#6d805f]">
              {{
                isSaved
                  ? 'Saved automatically on this device'
                  : 'Local storage is unavailable'
              }}
            </p>
          </div>
          <p class="text-2xl font-black tracking-[-0.04em] tabular-nums text-[#3e592d]">
            {{ areaSquareMeters.toFixed(2) }} m²
          </p>
        </div>

        <div class="overflow-hidden rounded-lg border border-stone-200">
          <table class="w-full border-collapse text-left text-xs">
            <thead class="bg-stone-50 text-[0.625rem] tracking-[0.1em] text-stone-400 uppercase">
              <tr>
                <th class="px-4 py-3 font-bold">Property</th>
                <th class="px-4 py-3 text-right font-bold">Value</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr>
                <th class="px-4 py-3 font-medium text-stone-500">Shape</th>
                <td class="px-4 py-3 text-right font-bold text-stone-900">
                  {{ shapeLabel }}
                </td>
              </tr>
              <tr v-for="field in dimensionSummary" :key="field.key">
                <th class="px-4 py-3 font-medium text-stone-500">
                  {{ field.label }}
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ field.value }} cm
                </td>
              </tr>
              <tr
                v-for="element in specialElementSummary"
                :key="element.id"
              >
                <th class="px-4 py-3 font-medium text-stone-500">
                  {{ element.label }}
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ element.value }}
                </td>
              </tr>
              <tr>
                <th class="px-4 py-3 font-medium text-stone-500">
                  Wood finish
                </th>
                <td class="px-4 py-3 text-right font-bold text-stone-900">
                  {{ textureLabel }}
                </td>
              </tr>
              <tr>
                <th class="px-4 py-3 font-medium text-stone-500">
                  Board layout
                </th>
                <td class="px-4 py-3 text-right font-bold text-stone-900">
                  {{ boardLayoutLabel }}
                </td>
              </tr>
              <tr>
                <th class="px-4 py-3 font-medium text-stone-500">
                  Board width / gap
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ config.decking.boardWidth }} /
                  {{ config.decking.boardGap }} cm
                </td>
              </tr>
              <tr>
                <th class="px-4 py-3 font-medium text-stone-500">
                  Starting edge / offset
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ config.decking.startEdgeId }} /
                  {{ config.decking.offset }} cm
                </td>
              </tr>
              <tr class="bg-[#fafcf8]">
                <th class="px-4 py-3 font-medium text-stone-500">
                  Decking with 10% reserve
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ estimatedDeckingArea.toFixed(2) }} m²
                </td>
              </tr>
              <tr class="bg-[#fafcf8]">
                <th class="px-4 py-3 font-medium text-stone-500">
                  Approximate linear metres
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  {{ estimatedLinearMeters.toFixed(1) }} m
                </td>
              </tr>
              <tr class="bg-[#fafcf8]">
                <th class="px-4 py-3 font-medium text-stone-500">
                  Approximate 3 m boards
                </th>
                <td class="px-4 py-3 text-right font-bold tabular-nums text-stone-900">
                  ≈ {{ estimatedThreeMeterBoards }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-4 text-[0.6875rem] leading-5 text-stone-400">
          Concept dimensions only. Confirm all measurements and structural
          requirements before construction. No project data is uploaded.
        </p>
      </div>

      <footer
        class="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3"
      >
        <button
          type="button"
          class="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-200"
          @click="emit('print')"
        >
          Print plan
        </button>
        <button
          type="button"
          class="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-200"
          @click="emit('save')"
        >
          Save JSON
        </button>
        <button
          type="button"
          class="rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-stone-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-200"
          @click="closeSummary"
        >
          Back to configurator
        </button>
      </footer>
    </section>
  </dialog>
</template>

<style scoped>
.plan-summary-dialog::backdrop {
  background: rgb(12 10 9 / 0.46);
  backdrop-filter: blur(2px);
}
</style>
