<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import ConfiguratorHeader from '@/components/configurator/ConfiguratorHeader.vue'
import ConfiguratorNotification from '@/components/configurator/ConfiguratorNotification.vue'
import PlanSummaryDialog from '@/components/configurator/PlanSummaryDialog.vue'
import SettingsPanel from '@/components/configurator/SettingsPanel.vue'
import TerracePlanMetrics from '@/components/configurator/TerracePlanMetrics.vue'
import TerracePreview from '@/components/configurator/TerracePreview.vue'
import { useTerraceConfig } from '@/composables/useTerraceConfig'
import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type {
  Point,
  SpecialElementPatch,
  SpecialElementType,
  TerraceDimensions,
} from '@/types/terrace'

type ConfiguratorSection = 'layout' | 'decking' | 'summary'

const {
  config,
  areaSquareMeters,
  isSaved,
  canUndo,
  canRedo,
  selectShape,
  updateDimension,
  setFreeForm,
  updateFreeFormEdge,
  addSpecialElement,
  updateSpecialElement,
  removeSpecialElement,
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
const activeSpecialElementId = ref<string | null>(null)
const summaryOpen = ref(false)
const summaryTrigger = ref<HTMLElement | null>(null)
const notification = ref<{
  type: 'success' | 'error'
  message: string
} | null>(null)
let notificationTimer: ReturnType<typeof setTimeout> | undefined

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
  () => {
    if (
      config.value.shape === 'free-form' &&
      !config.value.dimensions.closed
    ) {
      return config.value.dimensions.vertices.length > 0
        ? 'Draft outline'
        : 'Not drawn'
    }

    return `${Math.round(geometry.value.bounds.width)} × ${Math.round(
      geometry.value.bounds.height,
    )} cm`
  },
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
    length: Math.round(edge.length * 10) / 10,
  })),
)

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
  activeSpecialElementId.value = null
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
  activeSpecialElementId.value = null
}

const openSummary = (): void => {
  summaryTrigger.value =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  summaryOpen.value = true
}

const handleSummaryOpenUpdate = (open: boolean): void => {
  summaryOpen.value = open
  if (!open) {
    summaryTrigger.value?.focus()
  }
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

const handleFreeFormUpdate = ({
  vertices,
  closed,
}: {
  vertices: readonly Point[]
  closed: boolean
}): void => {
  if (!setFreeForm(vertices, closed)) {
    showNotification(
      'The outline cannot intersect itself or contain edges shorter than 20 cm.',
      'error',
    )
  }
}

const handleFreeFormEdgeUpdate = ({
  edgeId,
  value,
}: {
  edgeId: string
  value: number
}): void => {
  if (!updateFreeFormEdge(edgeId, value)) {
    showNotification(
      'This edge length would create an invalid outline.',
      'error',
    )
  }
}

const handleSpecialElementAdd = (type: SpecialElementType): void => {
  const id = addSpecialElement(type)
  if (id === null) {
    showNotification(
      'There is not enough valid space for this element.',
      'error',
    )
    return
  }

  activeSpecialElementId.value = id
  activeDimensionKey.value = null
  activeSection.value = 'layout'
}

const handleSpecialElementUpdate = ({
  id,
  patch,
}: {
  id: string
  patch: SpecialElementPatch
}): void => {
  if (!updateSpecialElement(id, patch)) {
    showNotification(
      'Keep the element inside the terrace and away from other cutouts.',
      'error',
    )
  }
}

const handleSpecialElementSelection = (id: string | null): void => {
  activeSpecialElementId.value = id
  if (id !== null) {
    activeDimensionKey.value = null
    activeSection.value = 'layout'
  }
}

const handleSpecialElementRemove = (id: string): void => {
  removeSpecialElement(id)
  if (activeSpecialElementId.value === id) {
    activeSpecialElementId.value = null
  }
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

const handleConfigImport = async (file: File): Promise<void> => {
  try {
    const parsed = JSON.parse(await file.text()) as unknown
    if (!replaceConfig(parsed)) {
      throw new TypeError('Unsupported terrace configuration')
    }

    activeSection.value = 'layout'
    activeDimensionKey.value = null
    activeSpecialElementId.value = null
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

watch(
  () => config.value.specialElements.map((element) => element.id),
  (ids) => {
    if (
      activeSpecialElementId.value !== null &&
      !ids.includes(activeSpecialElementId.value)
    ) {
      activeSpecialElementId.value = null
    }
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)

  if (notificationTimer !== undefined) {
    clearTimeout(notificationTimer)
  }
})
</script>

<template>
  <div
    class="app-shell min-h-dvh text-[#252720]"
    :class="{ 'app-shell--summary-open': summaryOpen }"
  >
    <ConfiguratorHeader
      :active-section="activeSection"
      @update:active-section="activeSection = $event"
      @load-config="handleConfigImport"
      @save-config="exportConfig"
    />

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
          :active-special-element-id="activeSpecialElementId"
          class="min-h-0 flex-1"
          @activate-dimension="handleDimensionActivation"
          @update-free-form="handleFreeFormUpdate"
          @select-special-element="handleSpecialElementSelection"
          @update-special-element="handleSpecialElementUpdate"
          @remove-special-element="handleSpecialElementRemove"
          @undo="undo"
          @redo="redo"
        />

        <TerracePlanMetrics
          :area-square-meters="areaSquareMeters"
          :footprint="footprint"
          :texture-label="textureLabel"
          :board-layout-label="boardLayoutLabel"
        />
      </section>

      <SettingsPanel
        :config="config"
        :area-square-meters="areaSquareMeters"
        :is-saved="isSaved"
        :active-section="activeSection"
        :active-dimension-key="activeDimensionKey"
        :edge-options="edgeOptions"
        :plan-bounds="geometry.bounds"
        :active-special-element-id="activeSpecialElementId"
        @select-shape="handleShapeSelection"
        @update-dimension="handleDimensionUpdate"
        @update-free-form-edge="handleFreeFormEdgeUpdate"
        @add-special-element="handleSpecialElementAdd"
        @select-special-element="handleSpecialElementSelection"
        @update-special-element="handleSpecialElementUpdate"
        @remove-special-element="handleSpecialElementRemove"
        @set-texture="setTexture"
        @set-direction="setBoardDirection"
        @set-board-angle="setBoardAngle"
        @set-board-width="setBoardWidth"
        @set-board-gap="setBoardGap"
        @set-board-offset="setBoardOffset"
        @set-start-edge="setStartEdge"
        @update:active-section="activeSection = $event"
        @activate-dimension="handleDimensionActivation"
        @open-summary="openSummary"
        @reset="handleReset"
      />
    </main>

    <ConfiguratorNotification :notification="notification" />

    <PlanSummaryDialog
      :open="summaryOpen"
      :config="config"
      :area-square-meters="areaSquareMeters"
      :is-saved="isSaved"
      @update:open="handleSummaryOpenUpdate"
      @print="printPlan"
      @save="exportConfig"
    />
  </div>
</template>
