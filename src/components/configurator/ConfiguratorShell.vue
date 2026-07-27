<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

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
  canUndo,
  canRedo,
  selectShape,
  updateDimension,
  setTexture,
  setBoardDirection,
  setBoardAngle,
  setBoardWidth,
  setBoardGap,
  setBoardOffset,
  setStartEdge,
  replaceConfig,
  undo,
  redo,
  resetConfig,
} = useTerraceConfig()

const activeSection = ref<ConfiguratorSection>('layout')
const activeDimensionKey = ref<string | null>(null)
const summaryOpen = ref(false)
const summaryDialog = ref<HTMLDialogElement | null>(null)
const summaryTrigger = ref<HTMLButtonElement | null>(null)
const configFileInput = ref<HTMLInputElement | null>(null)
const notification = ref<{
  type: 'success' | 'error'
  message: string
} | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | undefined

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

const boardLayoutLabel = computed(() =>
  config.value.boardDirection === 'custom'
    ? `${config.value.decking.angle}° custom`
    : `${config.value.boardDirection} (${config.value.decking.angle}°)`,
)

const edgeOptions = computed(() =>
  geometry.value.edges.map((edge) => ({
    id: edge.id,
    label: `${edge.startVertexId}–${edge.endVertexId} · ${
      Math.round(edge.length * 10) / 10
    } cm`,
  })),
)

const estimatedDeckingArea = computed(() => areaSquareMeters.value * 1.1)
const estimatedLinearMeters = computed(
  () =>
    estimatedDeckingArea.value /
    (config.value.decking.boardWidth / 100),
)
const estimatedThreeMeterBoards = computed(() =>
  Math.ceil(estimatedLinearMeters.value / 3),
)

const dimensionSummary = computed(() => {
  const dimensions = config.value
    .dimensions as TerraceDimensions as unknown as Record<string, number>

  return shapeOptionById[config.value.shape].fields.map((field) => ({
    key: field.key,
    label: field.label,
    value: field.getValue?.(dimensions) ?? dimensions[field.key] ?? 0,
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

const showNotification = (
  message: string,
  type: 'success' | 'error' = 'success',
): void => {
  notification.value = { message, type }

  if (notificationTimer !== undefined) {
    clearTimeout(notificationTimer)
  }

  notificationTimer = setTimeout(() => {
    notification.value = null
  }, 3200)
}

const exportConfig = (): void => {
  const blob = new Blob([JSON.stringify(config.value, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'terrace-plan.json'
  anchor.click()
  URL.revokeObjectURL(url)
  showNotification('Plan file saved.')
}

const triggerConfigImport = (): void => {
  configFileInput.value?.click()
}

const handleConfigImport = async (event: Event): Promise<void> => {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const file = input.files?.[0]
  input.value = ''
  if (file === undefined) {
    return
  }

  try {
    const parsed = JSON.parse(await file.text()) as unknown
    if (!replaceConfig(parsed)) {
      throw new TypeError('Unsupported terrace configuration')
    }

    activeSection.value = 'layout'
    activeDimensionKey.value = null
    showNotification('Plan loaded successfully.')
  } catch {
    showNotification('This file is not a valid terrace plan.', 'error')
  }
}

const printPlan = (): void => {
  window.print()
}

const handleHistoryShortcut = (event: KeyboardEvent): void => {
  const target = event.target
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return
  }

  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) {
    return
  }

  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      redo()
    } else {
      undo()
    }
  } else if (event.key.toLowerCase() === 'y') {
    event.preventDefault()
    redo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)

  if (notificationTimer !== undefined) {
    clearTimeout(notificationTimer)
  }
})
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

        <div class="flex shrink-0 items-center gap-1.5">
          <input
            ref="configFileInput"
            type="file"
            accept="application/json,.json"
            class="sr-only"
            tabindex="-1"
            @change="handleConfigImport"
          />
          <button
            type="button"
            class="header-action"
            aria-label="Load terrace plan"
            @click="triggerConfigImport"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                transform="rotate(270 12 12)"
                d="M16.9995 15.9995L20.9995 11.9995M20.9995 11.9995L16.9995 7.99951M20.9995 11.9995H8.99951M12.9995 20.9995H6.20029C5.08019 20.9995 4.52014 20.9995 4.09231 20.7815C3.71599 20.5898 3.41003 20.2838 3.21828 19.9075C3.00029 19.4797 3.00029 18.9196 3.00029 17.7995V6.19951C3.00029 5.07941 3.00029 4.51935 3.21828 4.09153C3.41003 3.71521 3.71599 3.40925 4.09231 3.2175C4.52014 2.99951 5.08019 2.99951 6.20029 2.99951L12.9995 2.99951"
              />
            </svg>
            <span class="hidden lg:inline">Load</span>
          </button>
          <button
            type="button"
            class="header-action"
            aria-label="Save terrace plan as JSON"
            @click="exportConfig"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                transform="rotate(90 12 12)"
                d="M11.0005 15.9995L15.0005 11.9995M15.0005 11.9995L11.0005 7.99951M15.0005 11.9995H3.00049M11.0005 2.99951H17.7997C18.9198 2.99951 19.4799 2.99951 19.9077 3.2175C20.284 3.40925 20.59 3.71521 20.7817 4.09153C20.9997 4.51935 20.9997 5.07941 20.9997 6.19951V17.7995C20.9997 18.9196 20.9997 19.4797 20.7817 19.9075C20.59 20.2838 20.284 20.5898 19.9077 20.7815C19.4799 20.9995 18.9198 20.9995 17.7997 20.9995H11.0005"
              />
            </svg>
            <span class="hidden lg:inline">Save</span>
          </button>
          <button
            ref="summaryTrigger"
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[#648349] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#56743e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce8d1]"
            @click="openSummary"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M8 10H21M3 14H21M8 18H21M3 6H21" />
            </svg>
            <span class="hidden sm:inline">Plan summary</span>
            <span class="sm:hidden">Summary</span>
          </button>
        </div>
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
          :can-undo="canUndo"
          :can-redo="canRedo"
          class="min-h-0 flex-1"
          @activate-dimension="handleDimensionActivation"
          @undo="undo"
          @redo="redo"
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
              {{ boardLayoutLabel }}
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
        :edge-options="edgeOptions"
        @select-shape="handleShapeSelection"
        @update-dimension="handleDimensionUpdate"
        @set-texture="setTexture"
        @set-direction="setBoardDirection"
        @set-board-angle="setBoardAngle"
        @set-board-width="setBoardWidth"
        @set-board-gap="setBoardGap"
        @set-board-offset="setBoardOffset"
        @set-start-edge="setStartEdge"
        @update:active-section="activeSection = $event"
        @activate-dimension="handleDimensionActivation"
        @reset="handleReset"
      />
    </main>

    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="-translate-y-2 opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="-translate-y-2 opacity-0"
    >
      <div
        v-if="notification"
        class="fixed top-3 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-bold shadow-lg"
        :class="
          notification.type === 'success'
            ? 'border-[#d8e4cd] bg-[#f2f7ed] text-[#4f6d39]'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        "
        :role="notification.type === 'error' ? 'alert' : 'status'"
      >
        <span aria-hidden="true">
          {{ notification.type === 'success' ? '✓' : '!' }}
        </span>
        {{ notification.message }}
      </div>
    </Transition>

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
            @click="printPlan"
          >
            Print plan
          </button>
          <button
            type="button"
            class="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-200"
            @click="exportConfig"
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
  </div>
</template>

<style scoped>
.header-action {
  display: inline-flex;
  height: 2.25rem;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.5rem;
  background: #fff;
  padding-inline: 0.65rem;
  color: #57534e;
  font-size: 0.75rem;
  font-weight: 700;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.header-action:hover {
  border-color: #d6d3d1;
  background: #fafaf9;
  color: #1c1917;
}

.header-action:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 4px #e7eedf;
}

.plan-summary-dialog::backdrop {
  background: rgb(12 10 9 / 0.46);
  backdrop-filter: blur(2px);
}
</style>
