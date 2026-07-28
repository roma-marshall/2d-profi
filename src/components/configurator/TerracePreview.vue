<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import TerraceDeckingPattern from '@/components/configurator/TerraceDeckingPattern.vue'
import TerraceDimensionsLayer from '@/components/configurator/TerraceDimensionsLayer.vue'
import TerraceDisplayOptions from '@/components/configurator/TerraceDisplayOptions.vue'
import TerraceFreeFormControls from '@/components/configurator/TerraceFreeFormControls.vue'
import TerraceFreeFormHandlesLayer from '@/components/configurator/TerraceFreeFormHandlesLayer.vue'
import TerraceSpecialElementsLayer from '@/components/configurator/TerraceSpecialElementsLayer.vue'
import TerraceViewportControls from '@/components/configurator/TerraceViewportControls.vue'
import { shapeOptionById } from '@/data/shapes'
import { specialElementOptionById } from '@/data/specialElements'
import { woodTextureById } from '@/data/textures'
import {
  FREE_FORM_GRID_SIZE,
  FREE_FORM_MAX_EDGE,
  FREE_FORM_MAX_VERTICES,
  FREE_FORM_MIN_EDGE,
} from '@/geometry/freeForm'
import { createTerraceGeometry } from '@/geometry/registry'
import { createSpecialElementGeometry } from '@/geometry/specialElements'
import type {
  FreeFormDimensions,
  Point,
  SpecialElement,
  SpecialElementPatch,
  TerraceConfig,
  TerraceDimensions,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  activeDimensionKey: string | null
  activeSpecialElementId: string | null
  canUndo: boolean
  canRedo: boolean
  printMode?: boolean
}>()

const emit = defineEmits<{
  'activate-dimension': [key: string | null]
  'update-free-form': [
    payload: { vertices: readonly Point[]; closed: boolean },
  ]
  'select-special-element': [id: string | null]
  'update-special-element': [
    payload: { id: string; patch: SpecialElementPatch },
  ]
  'remove-special-element': [id: string]
  undo: []
  redo: []
}>()

const patternId = `terrace-board-pattern-${useId()}`
const arrowId = `dimension-arrow-${useId()}`
const previewTitleId = `terrace-preview-title-${useId()}`
const previewDescriptionId = `terrace-preview-description-${useId()}`
const APP_SITE_URL = 'https://2d-profi.vercel.app'
const PRINT_BRAND_LABEL = '2D Profi · https://2d-profi.vercel.app'
const MIN_ZOOM = 0.65
const MAX_ZOOM = 5

const zoom = ref(1)
const showDimensions = ref(true)
const showGrid = ref(true)
const showDecking = ref(true)
const isPlanRotated = ref(false)
const pan = ref<Point>({ x: 0, y: 0 })
const isPanning = ref(false)
const panPointerId = ref<number | null>(null)
const lastPointerPosition = ref<Point>({ x: 0, y: 0 })
const pointerStartPosition = ref<Point>({ x: 0, y: 0 })
const didPan = ref(false)
const svgRef = ref<SVGSVGElement | null>(null)
const freeFormDraftVertices = ref<Point[] | null>(null)
const draggedVertexIndex = ref<number | null>(null)
const vertexPointerId = ref<number | null>(null)
const vertexPointerStart = ref<Point>({ x: 0, y: 0 })
const vertexMoved = ref(false)
const specialElementDraftPosition = ref<{
  id: string
  position: Point
} | null>(null)
const draggedSpecialElementId = ref<string | null>(null)
const specialElementPointerId = ref<number | null>(null)
const specialElementDragOffset = ref<Point>({ x: 0, y: 0 })
const specialElementPointerStart = ref<Point>({ x: 0, y: 0 })
const specialElementMoved = ref(false)

const configuredFreeForm = computed<FreeFormDimensions | null>(() =>
  props.config.shape === 'free-form' ? props.config.dimensions : null,
)
const isFreeForm = computed(() => configuredFreeForm.value !== null)
const isFreeFormClosed = computed(
  () => configuredFreeForm.value?.closed === true,
)
const renderedDimensions = computed<TerraceDimensions>(() => {
  const dimensions = configuredFreeForm.value
  if (dimensions === null || freeFormDraftVertices.value === null) {
    return props.config.dimensions
  }

  return {
    vertices: freeFormDraftVertices.value,
    closed: dimensions.closed,
  }
})

const geometry = computed(() =>
  createTerraceGeometry(
    props.config.shape,
    renderedDimensions.value,
  ),
)
const freeFormVertices = computed<readonly Point[]>(() =>
  isFreeForm.value ? geometry.value.points : [],
)

const renderedSpecialElements = computed(() =>
  props.config.specialElements
    .map((configuredElement) => {
      const draft = specialElementDraftPosition.value
      const element =
        draft?.id === configuredElement.id
          ? ({
              ...configuredElement,
              position: draft.position,
            } as SpecialElement)
          : configuredElement

      return {
        element,
        geometry: createSpecialElementGeometry(element),
        label: specialElementOptionById[element.type].shortLabel,
      }
    })
    .sort((first, second) =>
      first.element.id === props.activeSpecialElementId
        ? 1
        : second.element.id === props.activeSpecialElementId
          ? -1
          : 0,
    ),
)

const texture = computed(() => woodTextureById[props.config.texture])
const shapeLabel = computed(() => shapeOptionById[props.config.shape].label)
const dimensionLabelByKey = computed<Record<string, string>>(() =>
  Object.fromEntries(
    shapeOptionById[props.config.shape].fields.map((field) => [
      field.key,
      field.label,
    ]),
  ),
)

const maximumExtent = computed(() =>
  Math.max(geometry.value.bounds.width, geometry.value.bounds.height),
)

const viewPadding = computed(() =>
  props.printMode === true
    ? Math.max(150, maximumExtent.value * 0.38)
    : Math.max(96, maximumExtent.value * 0.22),
)

const baseViewport = computed(() => {
  const { x, y, width, height } = geometry.value.bounds
  const padding = viewPadding.value

  return {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2,
  }
})

const visibleViewport = computed(() => {
  const viewport = baseViewport.value

  if (!isPlanRotated.value) {
    return viewport
  }

  const centerX = viewport.x + viewport.width / 2
  const centerY = viewport.y + viewport.height / 2
  return {
    x: centerX - viewport.height / 2,
    y: centerY - viewport.width / 2,
    width: viewport.height,
    height: viewport.width,
  }
})

const viewBox = computed(() => {
  const viewport = visibleViewport.value
  const width = viewport.width / zoom.value
  const height = viewport.height / zoom.value
  const centerX = viewport.x + viewport.width / 2 + pan.value.x
  const centerY = viewport.y + viewport.height / 2 + pan.value.y

  return `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`
})

const planTransform = computed(() => {
  if (!isPlanRotated.value) {
    return undefined
  }

  const { x, y, width, height } = geometry.value.bounds
  return `rotate(90 ${x + width / 2} ${y + height / 2})`
})

const labelFontSize = computed(() =>
  Math.max(9, maximumExtent.value * 0.026),
)

const annotationScale = computed(() => 1 / zoom.value)

const printBrandWidth = computed(
  () => PRINT_BRAND_LABEL.length * labelFontSize.value * 0.56 + 24,
)

const printBrandPosition = computed(() => ({
  x:
    visibleViewport.value.x +
    visibleViewport.value.width -
    printBrandWidth.value / 2 -
    18,
  y:
    visibleViewport.value.y +
    visibleViewport.value.height -
    labelFontSize.value -
    18,
}))

const vertexFontSize = computed(() =>
  Math.max(10, maximumExtent.value * 0.025),
)

const freeFormHandleRadius = computed(() =>
  Math.max(8, maximumExtent.value * 0.014),
)

const patternWidth = computed(() =>
  Math.max(240, maximumExtent.value * 0.9),
)

const patternHeight = computed(
  () => props.config.decking.boardWidth + props.config.decking.boardGap,
)

const patternOrigin = computed(() => {
  const startEdge = geometry.value.edges.find(
    (edge) => edge.id === props.config.decking.startEdgeId,
  )

  return startEdge?.start ?? {
    x: geometry.value.bounds.x,
    y: geometry.value.bounds.y,
  }
})

const patternTransform = computed(
  () =>
    `rotate(${props.config.decking.angle} ${patternOrigin.value.x} ${patternOrigin.value.y}) translate(0 ${props.config.decking.offset})`,
)

const normalizeEdgeLabel = (label: string): string =>
  label.replace(/[^A-Z]/g, '')

const reverseEdgeId = (edgeId: string): string =>
  edgeId.length === 2 ? `${edgeId[1]}${edgeId[0]}` : edgeId

const fieldKeyByEdgeId = computed<Record<string, string>>(() => {
  if (isFreeForm.value) {
    return Object.fromEntries(
      geometry.value.edges.map((edge) => [
        edge.id,
        `edge:${edge.id}`,
      ]),
    )
  }

  return Object.fromEntries(
    geometry.value.edges.flatMap((edge) => {
      const matchingField = shapeOptionById[
        props.config.shape
      ].fields.find((field) => {
        if (field.edgeLabel === undefined) {
          return false
        }

        const fieldEdgeId = normalizeEdgeLabel(field.edgeLabel)
        return (
          fieldEdgeId === edge.id ||
          reverseEdgeId(fieldEdgeId) === edge.id
        )
      })

      return matchingField === undefined
        ? []
        : [[edge.id, matchingField.key] as const]
    }),
  )
})

const grainPath = computed(() => {
  const board = props.config.decking.boardWidth
  const run = patternWidth.value
  return [
    `M ${run * 0.08} ${board * 0.33}`,
    `C ${run * 0.25} ${board * 0.16}, ${run * 0.4} ${
      board * 0.58
    }, ${run * 0.58} ${board * 0.38}`,
    `S ${run * 0.85} ${board * 0.24}, ${run * 0.96} ${board * 0.5}`,
  ].join(' ')
})

const secondaryGrainPath = computed(() => {
  const board = props.config.decking.boardWidth
  const run = patternWidth.value

  return `M ${run * 0.16} ${board * 0.72} Q ${run * 0.5} ${
    board * 0.48
  } ${run * 0.86} ${board * 0.7}`
})

const setZoom = (nextZoom: number): void => {
  zoom.value = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM)
}

const resetView = (): void => {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

const togglePlanOrientation = (): void => {
  isPlanRotated.value = !isPlanRotated.value
  pan.value = { x: 0, y: 0 }
}

const handleWheel = (event: WheelEvent): void => {
  const shouldZoom =
    event.ctrlKey ||
    event.metaKey ||
    window.matchMedia('(min-width: 1024px)').matches

  if (!shouldZoom) {
    return
  }

  event.preventDefault()
  setZoom(zoom.value + (event.deltaY < 0 ? 0.12 : -0.12))
}

const pointFromPointer = (event: MouseEvent | PointerEvent): Point | null => {
  const svg = svgRef.value
  const screenMatrix = svg?.getScreenCTM()
  if (svg === null || svg === undefined || screenMatrix == null) {
    return null
  }

  const svgPoint = svg.createSVGPoint()
  svgPoint.x = event.clientX
  svgPoint.y = event.clientY
  const transformed = svgPoint.matrixTransform(screenMatrix.inverse())
  let point = { x: transformed.x, y: transformed.y }

  if (isPlanRotated.value) {
    const { x, y, width, height } = geometry.value.bounds
    const center = { x: x + width / 2, y: y + height / 2 }
    const delta = { x: point.x - center.x, y: point.y - center.y }
    point = {
      x: center.x + delta.y,
      y: center.y - delta.x,
    }
  }

  return {
    x: Math.round(point.x / FREE_FORM_GRID_SIZE) * FREE_FORM_GRID_SIZE,
    y: Math.round(point.y / FREE_FORM_GRID_SIZE) * FREE_FORM_GRID_SIZE,
  }
}

const handlePointerDown = (event: PointerEvent): void => {
  const target = event.target
  if (
    event.button !== 0 ||
    (target instanceof Element && target.closest('[role="button"]') !== null)
  ) {
    return
  }

  const svg = event.currentTarget
  if (!(svg instanceof SVGSVGElement)) {
    return
  }

  isPanning.value = true
  didPan.value = false
  panPointerId.value = event.pointerId
  lastPointerPosition.value = { x: event.clientX, y: event.clientY }
  pointerStartPosition.value = { x: event.clientX, y: event.clientY }
  svg.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent): void => {
  if (
    specialElementPointerId.value === event.pointerId &&
    draggedSpecialElementId.value !== null
  ) {
    const point = pointFromPointer(event)
    if (point !== null) {
      specialElementDraftPosition.value = {
        id: draggedSpecialElementId.value,
        position: {
          x:
            Math.round(
              (point.x - specialElementDragOffset.value.x) /
                FREE_FORM_GRID_SIZE,
            ) * FREE_FORM_GRID_SIZE,
          y:
            Math.round(
              (point.y - specialElementDragOffset.value.y) /
                FREE_FORM_GRID_SIZE,
            ) * FREE_FORM_GRID_SIZE,
        },
      }
    }
    specialElementMoved.value =
      Math.hypot(
        event.clientX - specialElementPointerStart.value.x,
        event.clientY - specialElementPointerStart.value.y,
      ) > 3
    return
  }

  if (
    vertexPointerId.value === event.pointerId &&
    draggedVertexIndex.value !== null &&
    freeFormDraftVertices.value !== null
  ) {
    const point = pointFromPointer(event)
    if (point !== null) {
      freeFormDraftVertices.value[draggedVertexIndex.value] = point
    }
    vertexMoved.value =
      Math.hypot(
        event.clientX - vertexPointerStart.value.x,
        event.clientY - vertexPointerStart.value.y,
      ) > 3
    return
  }

  if (!isPanning.value || panPointerId.value !== event.pointerId) {
    return
  }

  const svg = event.currentTarget
  if (!(svg instanceof SVGSVGElement)) {
    return
  }

  const rect = svg.getBoundingClientRect()
  const viewportWidth = visibleViewport.value.width / zoom.value
  const viewportHeight = visibleViewport.value.height / zoom.value
  const deltaX = event.clientX - lastPointerPosition.value.x
  const deltaY = event.clientY - lastPointerPosition.value.y
  didPan.value =
    Math.hypot(
      event.clientX - pointerStartPosition.value.x,
      event.clientY - pointerStartPosition.value.y,
    ) > 3

  pan.value = {
    x: pan.value.x - (deltaX * viewportWidth) / Math.max(rect.width, 1),
    y: pan.value.y - (deltaY * viewportHeight) / Math.max(rect.height, 1),
  }
  lastPointerPosition.value = { x: event.clientX, y: event.clientY }
}

const handlePointerUp = (event: PointerEvent): void => {
  if (
    specialElementPointerId.value === event.pointerId &&
    draggedSpecialElementId.value !== null
  ) {
    const svg = svgRef.value
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }

    if (
      specialElementMoved.value &&
      specialElementDraftPosition.value !== null
    ) {
      emit('update-special-element', {
        id: draggedSpecialElementId.value,
        patch: {
          position: specialElementDraftPosition.value.position,
        },
      })
    }

    specialElementDraftPosition.value = null
    draggedSpecialElementId.value = null
    specialElementPointerId.value = null
    specialElementMoved.value = false
    return
  }

  if (
    vertexPointerId.value === event.pointerId &&
    draggedVertexIndex.value !== null
  ) {
    const svg = svgRef.value
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }

    if (freeFormDraftVertices.value !== null) {
      emit('update-free-form', {
        vertices: freeFormDraftVertices.value,
        closed: isFreeFormClosed.value,
      })
    }

    freeFormDraftVertices.value = null
    draggedVertexIndex.value = null
    vertexPointerId.value = null
    return
  }

  if (panPointerId.value !== event.pointerId) {
    return
  }

  const svg = event.currentTarget
  if (svg instanceof SVGSVGElement && svg.hasPointerCapture(event.pointerId)) {
    svg.releasePointerCapture(event.pointerId)
  }

  isPanning.value = false
  panPointerId.value = null
}

const handleCanvasClick = (event: MouseEvent): void => {
  if (didPan.value) {
    didPan.value = false
    return
  }

  const target = event.target
  if (
    target instanceof Element &&
    target.closest('[data-special-element-control]') !== null
  ) {
    return
  }

  emit('select-special-element', null)

  if (!isFreeForm.value) {
    emit('activate-dimension', null)
    return
  }

  if (
    isFreeFormClosed.value ||
    (target instanceof Element &&
      target.closest('[data-free-form-control]') !== null) ||
    freeFormVertices.value.length >= FREE_FORM_MAX_VERTICES
  ) {
    return
  }

  const point = pointFromPointer(event)
  if (point === null) {
    return
  }

  const lastPoint = freeFormVertices.value.at(-1)
  if (
    lastPoint !== undefined &&
    (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) <
      FREE_FORM_MIN_EDGE ||
      Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >
        FREE_FORM_MAX_EDGE)
  ) {
    return
  }

  emit('update-free-form', {
    vertices: [...freeFormVertices.value, point],
    closed: false,
  })
}

const handleSpecialElementPointerDown = (
  event: PointerEvent,
  element: SpecialElement,
): void => {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  emit('select-special-element', element.id)
  emit('activate-dimension', null)

  const point = pointFromPointer(event)
  specialElementMoved.value = false
  draggedSpecialElementId.value = element.id
  specialElementPointerId.value = event.pointerId
  specialElementPointerStart.value = {
    x: event.clientX,
    y: event.clientY,
  }
  specialElementDraftPosition.value = {
    id: element.id,
    position: { ...element.position },
  }
  specialElementDragOffset.value =
    point === null
      ? { x: 0, y: 0 }
      : {
          x: point.x - element.position.x,
          y: point.y - element.position.y,
        }
  svgRef.value?.setPointerCapture(event.pointerId)
}

const handleVertexPointerDown = (
  event: PointerEvent,
  index: number,
): void => {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  vertexMoved.value = false
  draggedVertexIndex.value = index
  vertexPointerId.value = event.pointerId
  vertexPointerStart.value = { x: event.clientX, y: event.clientY }
  freeFormDraftVertices.value = freeFormVertices.value.map((point) => ({
    ...point,
  }))
  svgRef.value?.setPointerCapture(event.pointerId)
}

const closeFreeForm = (): void => {
  emit('update-free-form', {
    vertices: freeFormVertices.value,
    closed: true,
  })
}

const handleVertexClick = (index: number): void => {
  if (vertexMoved.value) {
    vertexMoved.value = false
    return
  }

  if (
    index === 0 &&
    !isFreeFormClosed.value &&
    freeFormVertices.value.length >= 3
  ) {
    closeFreeForm()
  }
}

const clearFreeForm = (): void => {
  freeFormDraftVertices.value = null
  emit('activate-dimension', null)
  emit('update-free-form', { vertices: [], closed: false })
}

const removeFreeFormVertex = (index: number): void => {
  const vertices = freeFormVertices.value.filter(
    (_, vertexIndex) => vertexIndex !== index,
  )
  emit('update-free-form', {
    vertices,
    closed: isFreeFormClosed.value && vertices.length >= 3,
  })
}

watch(
  () => props.config.shape,
  () => {
    resetView()
    freeFormDraftVertices.value = null
    draggedVertexIndex.value = null
    vertexPointerId.value = null
    specialElementDraftPosition.value = null
    draggedSpecialElementId.value = null
    specialElementPointerId.value = null
  },
)
</script>

<template>
  <div
    class="preview-stage relative min-h-[430px] select-none overflow-hidden lg:h-full lg:min-h-0"
    :class="{ 'preview-stage--grid': showGrid }"
  >
    <TerraceViewportControls
      v-if="!printMode"
      :zoom="zoom"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :min-zoom="MIN_ZOOM"
      :max-zoom="MAX_ZOOM"
      :is-plan-rotated="isPlanRotated"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @zoom-in="setZoom(zoom + 0.25)"
      @zoom-out="setZoom(zoom - 0.25)"
      @toggle-orientation="togglePlanOrientation"
      @reset-view="resetView"
    />

    <TerraceFreeFormControls
      v-if="!printMode && isFreeForm"
      :is-closed="isFreeFormClosed"
      :vertex-count="freeFormVertices.length"
      :max-vertices="FREE_FORM_MAX_VERTICES"
      @close="closeFreeForm"
      @clear="clearFreeForm"
    />

    <svg
      ref="svgRef"
      :class="[
        printMode
          ? 'absolute inset-0 h-full min-h-0 w-full'
          : 'absolute inset-x-0 top-11 bottom-0 h-[calc(100%-2.75rem)] min-h-[386px] w-full touch-pan-y lg:min-h-0',
        printMode
          ? ''
          : isPanning || draggedSpecialElementId !== null
            ? 'cursor-grabbing'
            : isFreeForm && !isFreeFormClosed
              ? 'cursor-crosshair'
              : 'cursor-grab',
      ]"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      :aria-labelledby="`${previewTitleId} ${previewDescriptionId}`"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @click="handleCanvasClick"
    >
      <title :id="previewTitleId">
        {{ shapeLabel }} terrace plan
      </title>
      <desc :id="previewDescriptionId">
        Proportional top-down plan using {{ texture.label }} boards at
        {{ config.decking.angle }} degrees. Dimensions are shown in centimetres.
        {{ config.specialElements.length }} special elements are placed on the
        plan.
      </desc>

      <defs>
        <TerraceDeckingPattern
          :pattern-id="patternId"
          :origin="patternOrigin"
          :width="patternWidth"
          :height="patternHeight"
          :pattern-transform="patternTransform"
          :board-width="config.decking.boardWidth"
          :texture="texture"
          :grain-path="grainPath"
          :secondary-grain-path="secondaryGrainPath"
        />

        <marker
          :id="arrowId"
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path d="M 7 0 L 0 3.5 L 7 7 Z" fill="context-stroke" />
        </marker>
      </defs>

      <g :transform="planTransform">
      <path
        :d="geometry.path"
        :fill="
          isFreeForm && !isFreeFormClosed
            ? 'none'
            : showDecking
              ? `url(#${patternId})`
              : '#d7d8d2'
        "
        fill-rule="evenodd"
        stroke="#3e443b"
        stroke-width="2"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        class="terrace-shape"
        :class="{
          'terrace-shape--draft': isFreeForm && !isFreeFormClosed,
        }"
      />

      <TerraceSpecialElementsLayer
        :rendered-elements="renderedSpecialElements"
        :active-element-id="activeSpecialElementId"
        :dragged-element-id="draggedSpecialElementId"
        :annotation-scale="annotationScale"
        @pointer-down="handleSpecialElementPointerDown"
        @select="emit('select-special-element', $event)"
        @remove="emit('remove-special-element', $event)"
      />

      <TerraceDimensionsLayer
        :geometry="geometry"
        :show-dimensions="showDimensions"
        :active-dimension-key="activeDimensionKey"
        :field-key-by-edge-id="fieldKeyByEdgeId"
        :dimension-label-by-key="dimensionLabelByKey"
        :arrow-id="arrowId"
        :label-font-size="labelFontSize"
        :annotation-scale="annotationScale"
        :vertex-font-size="vertexFontSize"
        :is-free-form-closed="isFreeFormClosed"
        @activate-dimension="emit('activate-dimension', $event)"
      />

      <TerraceFreeFormHandlesLayer
        v-if="isFreeForm"
        :geometry="geometry"
        :annotation-scale="annotationScale"
        :handle-radius="freeFormHandleRadius"
        :is-closed="isFreeFormClosed"
        @pointer-down="handleVertexPointerDown"
        @activate="handleVertexClick"
        @remove="removeFreeFormVertex"
      />
      </g>

      <a
        v-if="printMode"
        :href="APP_SITE_URL"
        target="_blank"
        rel="noreferrer"
        aria-label="Visit the 2D Profi website"
        class="print-brand-link"
      >
        <g
          :transform="`translate(${printBrandPosition.x} ${printBrandPosition.y})`"
        >
          <rect
            :x="-printBrandWidth / 2"
            :y="-labelFontSize"
            :width="printBrandWidth"
            :height="labelFontSize * 2"
            :rx="labelFontSize"
            vector-effect="non-scaling-stroke"
          />
          <text
            x="0"
            y="0"
            :font-size="labelFontSize"
            font-family="Inter, ui-sans-serif, system-ui, sans-serif"
            font-weight="700"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {{ PRINT_BRAND_LABEL }}
          </text>
        </g>
      </a>
    </svg>

    <TerraceDisplayOptions
      v-if="!printMode"
      :show-decking="showDecking"
      :show-dimensions="showDimensions"
      :show-grid="showGrid"
      @toggle-decking="showDecking = !showDecking"
      @toggle-dimensions="showDimensions = !showDimensions"
      @toggle-grid="showGrid = !showGrid"
    />
  </div>
</template>

<style scoped>
.preview-stage {
  background-color: #f2f3f0;
  -webkit-user-select: none;
  user-select: none;
}

.preview-stage--grid {
  background-image:
    linear-gradient(rgb(62 68 59 / 7%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(62 68 59 / 7%) 1px, transparent 1px),
    linear-gradient(rgb(62 68 59 / 3%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(62 68 59 / 3%) 1px, transparent 1px);
  background-position: center;
  background-size:
    80px 80px,
    80px 80px,
    16px 16px,
    16px 16px;
}

.terrace-shape {
  filter: drop-shadow(0 8px 8px rgb(48 43 36 / 0.12));
}

.terrace-shape--draft {
  stroke: #648349;
  stroke-dasharray: 7 5;
  filter: none;
}

.print-brand-link rect {
  fill: #fff;
  fill-opacity: 0.94;
  stroke: #648349;
  stroke-opacity: 0.5;
  stroke-width: 1;
}

.print-brand-link text {
  fill: #4f6d39;
}

@media (max-width: 639px) {
  .preview-stage {
    min-height: 360px;
  }

  .preview-stage svg {
    min-height: 316px;
  }
}
</style>
