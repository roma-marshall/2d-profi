<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import SettingsPanel from '@/components/configurator/SettingsPanel.vue'
import TerracePreview from '@/components/configurator/TerracePreview.vue'
import { useTerraceConfig } from '@/composables/useTerraceConfig'
import { shapeOptionById } from '@/data/shapes'
import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type { TerraceDimensions } from '@/types/terrace'

type ConfiguratorSection = 'layout' | 'decking' | 'summary'

const {
  config,
  areaSquareMeters,
  isSaved,
  selectShape,
  updateDimension,
  setTexture,
  setBoardDirection,
  resetConfig,
} = useTerraceConfig()

const activeSection = ref<ConfiguratorSection>('layout')
const activeDimensionKey = ref<string | null>(null)
const summaryOpen = ref(false)
const summaryDialog = ref<HTMLDialogElement | null>(null)
const summaryTrigger = ref<HTMLButtonElement | null>(null)

const shapeLabel = computed(() => shapeOptionById[config.value.shape].label)
const textureLabel = computed(
  () => woodTextureById[config.value.texture].label,
)
const geometry = computed(() =>
  createTerraceGeometry(
    config.value.shape,
    config.value.dimensions as TerraceDimensions,
  ),
)
const footprint = computed(
  () =>
    `${Math.round(geometry.value.bounds.width)} × ${Math.round(
      geometry.value.bounds.height,
    )} cm`,
)

const dimensionSummary = computed(() => {
  const dimensions = config.value
    .dimensions as TerraceDimensions as unknown as Record<string, number>

  return shapeOptionById[config.value.shape].fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: dimensions[field.key] ?? 0,
  }))
})

const workflowSteps = [
  {
    id: 'layout',
    number: 1,
    label: 'Floor plan',
    description: 'Shape & dimensions',
  },
  {
    id: 'decking',
    number: 2,
    label: 'Decking',
    description: 'Finish & direction',
  },
  {
    id: 'summary',
    number: 3,
    label: 'Summary',
    description: 'Review your plan',
  },
] as const satisfies readonly {
  id: ConfiguratorSection
  number: number
  label: string
  description: string
}[]

const handleDimensionUpdate = ({
  key,
  value,
}: {
  key: string
  value: number
}): void => {
  updateDimension(key, value)
}

const handleShapeSelection = (
  shape: Parameters<typeof selectShape>[0],
): void => {
  activeDimensionKey.value = null
  selectShape(shape)
}

const handleDimensionActivation = (key: string | null): void => {
  activeDimensionKey.value = key

  if (key !== null) {
    activeSection.value = 'layout'
  }
}

const handleReset = (): void => {
  resetConfig()
  activeSection.value = 'layout'
  activeDimensionKey.value = null
}

const openSummary = async (): Promise<void> => {
  summaryOpen.value = true
  await nextTick()

  if (summaryDialog.value !== null && !summaryDialog.value.open) {
    summaryDialog.value.showModal()
  }
}

const closeSummary = (): void => {
  if (summaryDialog.value?.open) {
    summaryDialog.value.close()
  }

  summaryOpen.value = false
  summaryTrigger.value?.focus()
}

const handleSummaryCancel = (event: Event): void => {
  event.preventDefault()
  closeSummary()
}
</script>

<template>
  <div class="app-shell min-h-dvh text-[#252720]">
    <header class="border-b border-stone-200 bg-white">
      <div class="flex h-14 items-center justify-between gap-4 px-4 lg:px-5">
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-[#648349] text-xs font-black tracking-tight text-white"
            aria-hidden="true"
          >
            2D
          </span>
          <div class="min-w-0">
            <h1 class="truncate text-sm font-extrabold tracking-[-0.02em] text-stone-900 sm:text-base">
              2D Terrace Configurator
            </h1>
            <p class="hidden text-[0.625rem] font-medium text-stone-400 sm:block">
              Local terrace planning workspace
            </p>
          </div>
        </div>

        <button
          ref="summaryTrigger"
          type="button"
          class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#648349] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#56743e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce8d1]"
          @click="openSummary"
        >
          <span aria-hidden="true">▤</span>
          <span class="hidden sm:inline">Plan summary</span>
          <span class="sm:hidden">Summary</span>
        </button>
      </div>

      <nav
        class="workflow-nav flex min-h-12 overflow-x-auto border-t border-stone-100 bg-[#fafaf8] px-2 lg:px-5"
        aria-label="Configurator steps"
      >
        <button
          v-for="(step, index) in workflowSteps"
          :key="step.id"
          type="button"
          class="group relative flex min-w-max flex-1 items-center gap-2.5 px-3 py-2 text-left outline-none transition hover:bg-white focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349] sm:px-5"
          :class="
            activeSection === step.id
              ? 'bg-white text-stone-900'
              : 'text-stone-400'
          "
          :aria-current="activeSection === step.id ? 'step' : undefined"
          @click="activeSection = step.id"
        >
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-black"
            :class="
              activeSection === step.id
                ? 'bg-[#648349] text-white'
                : 'border border-stone-300 bg-white text-stone-500'
            "
          >
            {{ step.number }}
          </span>
          <span>
            <span class="block text-[0.6875rem] font-bold sm:text-xs">
              {{ step.label }}
            </span>
            <span class="hidden text-[0.5625rem] font-medium text-stone-400 md:block">
              {{ step.description }}
            </span>
          </span>
          <span
            v-if="index < workflowSteps.length - 1"
            class="ml-auto hidden text-stone-300 sm:block"
            aria-hidden="true"
          >
            ›
          </span>
          <span
            v-if="activeSection === step.id"
            class="absolute inset-x-3 bottom-0 h-0.5 bg-[#648349]"
            aria-hidden="true"
          />
        </button>
      </nav>
    </header>

    <main
      class="configurator-workspace grid min-h-0 gap-3 bg-[#e8e9e5] p-3 lg:grid-cols-[minmax(0,1fr)_380px]"
    >
      <section
        class="canvas-shell flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-[0_12px_35px_rgba(42,47,38,0.08)]"
        aria-label="Terrace plan workspace"
      >
        <TerracePreview
          :config="config"
          :active-dimension-key="activeDimensionKey"
          class="min-h-0 flex-1"
          @activate-dimension="handleDimensionActivation"
        />

        <dl
          class="grid grid-cols-2 border-t border-stone-200 bg-white sm:grid-cols-4"
        >
          <div class="border-l border-stone-200 px-3.5 py-3">
            <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
              Surface
            </dt>
            <dd class="mt-0.5 text-xs font-extrabold tabular-nums text-stone-900">
              {{ areaSquareMeters.toFixed(2) }} m²
            </dd>
          </div>
          <div class="border-t border-stone-200 px-3.5 py-3 sm:border-t-0 sm:border-l">
            <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
              Footprint
            </dt>
            <dd class="mt-0.5 text-xs font-extrabold tabular-nums text-stone-900">
              {{ footprint }}
            </dd>
          </div>
          <div class="border-t border-l border-stone-200 px-3.5 py-3 sm:border-t-0">
            <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
              Finish
            </dt>
            <dd class="mt-0.5 truncate text-xs font-extrabold text-stone-900">
              {{ textureLabel }}
            </dd>
          </div>
          <div class="px-3.5 py-3">
            <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
              Boards
            </dt>
            <dd class="mt-0.5 text-xs font-extrabold capitalize text-stone-900">
              {{ config.boardDirection }}
            </dd>
          </div>
        </dl>
      </section>

      <SettingsPanel
        :config="config"
        :area-square-meters="areaSquareMeters"
        :is-saved="isSaved"
        :active-section="activeSection"
        :active-dimension-key="activeDimensionKey"
        @select-shape="handleShapeSelection"
        @update-dimension="handleDimensionUpdate"
        @set-texture="setTexture"
        @set-direction="setBoardDirection"
        @update:active-section="activeSection = $event"
        @activate-dimension="handleDimensionActivation"
        @reset="handleReset"
      />
    </main>

    <dialog
      ref="summaryDialog"
      class="plan-summary-dialog m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto border-0 bg-transparent p-0"
      aria-labelledby="plan-summary-title"
      @cancel="handleSummaryCancel"
      @close="summaryOpen = false"
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
                    Board direction
                  </th>
                  <td class="px-4 py-3 text-right font-bold capitalize text-stone-900">
                    {{ config.boardDirection }}
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
          class="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-5 py-3"
        >
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
  </div>
</template>

<style scoped>
.plan-summary-dialog::backdrop {
  background: rgb(12 10 9 / 0.46);
  backdrop-filter: blur(2px);
}
</style>
