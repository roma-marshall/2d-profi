<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { shapeOptionById } from '@/data/shapes'
import { specialElementOptionById } from '@/data/specialElements'
import { woodTextureById } from '@/data/textures'
import {
  FREE_FORM_GRID_SIZE,
  FREE_FORM_MAX_EDGE,
  FREE_FORM_MAX_VERTICES,
  FREE_FORM_MIN_EDGE,
  calculateInteriorAngles,
} from '@/geometry/freeForm'
import { createTerraceGeometry } from '@/geometry/registry'
import { createSpecialElementGeometry } from '@/geometry/specialElements'
import type {
  DimensionGuide,
  FreeFormDimensions,
  GeometryEdge,
  Point,
  SpecialElement,
  SpecialElementGeometry,
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

interface RenderedDimensionGuide extends DimensionGuide {
  lineStartX: number
  lineStartY: number
  lineEndX: number
  lineEndY: number
  labelX: number
  labelY: number
  labelRotation: number
  label: string
}

interface RenderedSpecialElement {
  element: SpecialElement
  geometry: SpecialElementGeometry
  label: string
}

const patternId = `terrace-board-pattern-${useId()}`
const arrowId = `dimension-arrow-${useId()}`
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

const renderedSpecialElements = computed<RenderedSpecialElement[]>(() =>
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
  Math.max(96, maximumExtent.value * 0.22),
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

const vertexFontSize = computed(() =>
  Math.max(10, maximumExtent.value * 0.025),
)

const freeFormHandleRadius = computed(() =>
  Math.max(8, maximumExtent.value * 0.014),
)

const freeFormAngleLabels = computed(() => {
  const points = freeFormVertices.value
  if (!isFreeFormClosed.value || points.length < 3) {
    return []
  }

  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  )
  const distance = Math.max(32, labelFontSize.value * 2.4)

  return calculateInteriorAngles(points).map((value, index) => {
    const point = points[index]!
    const delta = { x: center.x - point.x, y: center.y - point.y }
    const length = Math.hypot(delta.x, delta.y) || 1

    return {
      id: geometry.value.vertices[index]?.id ?? String(index),
      value: Math.round(value),
      position: {
        x: point.x + (delta.x / length) * distance,
        y: point.y + (delta.y / length) * distance,
      },
    }
  })
})

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

const hasArcEdges = computed(() =>
  geometry.value.edges.some((edge) => edge.kind === 'arc'),
)

const activeEdgeIds = computed(() => {
  if (props.activeDimensionKey === null) {
    return new Set<string>()
  }

  return new Set(
    Object.entries(fieldKeyByEdgeId.value)
      .filter(([, fieldKey]) => fieldKey === props.activeDimensionKey)
      .map(([edgeId]) => edgeId),
  )
})

const formatMeasurement = (value: number): string => {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} cm`
}

const renderedGuides = computed<RenderedDimensionGuide[]>(() =>
  geometry.value.dimensionGuides.map((guide) => {
    const isHorizontal = guide.orientation === 'horizontal'
    const lineStartX = guide.start.x + (isHorizontal ? 0 : guide.offset)
    const lineStartY = guide.start.y + (isHorizontal ? guide.offset : 0)
    const lineEndX = guide.end.x + (isHorizontal ? 0 : guide.offset)
    const lineEndY = guide.end.y + (isHorizontal ? guide.offset : 0)
    const labelDistance = labelFontSize.value * 0.95
    const offsetSign = guide.offset < 0 ? -1 : 1

    return {
      ...guide,
      lineStartX,
      lineStartY,
      lineEndX,
      lineEndY,
      labelX:
        (lineStartX + lineEndX) / 2 +
        (isHorizontal ? 0 : offsetSign * labelDistance),
      labelY:
        (lineStartY + lineEndY) / 2 +
        (isHorizontal ? offsetSign * labelDistance : 0),
      labelRotation: isHorizontal ? 0 : -90,
      label: formatMeasurement(guide.value),
    }
  }),
)

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

const edgeLabelBoxWidth = (edge: GeometryEdge): number =>
  formatMeasurement(edge.dimension.value).length *
    labelFontSize.value *
    0.58 +
  labelFontSize.value * 1.25

const guideLabelBoxWidth = (label: string): number =>
  label.length * labelFontSize.value * 0.58 + labelFontSize.value * 1.25

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

const activateEdge = (edgeId: string): void => {
  const fieldKey = fieldKeyByEdgeId.value[edgeId]
  if (fieldKey !== undefined) {
    emit('activate-dimension', fieldKey)
  }
}

const edgeAccessibleLabel = (edge: GeometryEdge): string => {
  const fieldKey = fieldKeyByEdgeId.value[edge.id]
  const fieldLabel =
    fieldKey === undefined
      ? `edge ${edge.startVertexId} to ${edge.endVertexId}`
      : (dimensionLabelByKey.value[fieldKey] ??
        `edge ${edge.startVertexId} to ${edge.endVertexId}`)

  return `Edit ${fieldLabel}, ${formatMeasurement(edge.dimension.value)}`
}

const guideAccessibleLabel = (guide: DimensionGuide): string =>
  `Edit ${dimensionLabelByKey.value[guide.id] ?? guide.id}, ${formatMeasurement(
    guide.value,
  )}`

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
    <div
      class="absolute inset-x-0 top-0 z-20 flex h-11 items-center justify-between border-b border-stone-300/80 bg-white/92 px-3 backdrop-blur"
    >
      <div class="flex h-full items-center gap-1">
        <button
          type="button"
          class="flex h-full items-center gap-2 border-b-2 border-[#648349] px-3 text-xs font-bold text-stone-900"
          aria-current="page"
        >
          <span class="size-2 rounded-full bg-[#648349]" aria-hidden="true" />
          Area 1
        </button>
      </div>

      <div
        class="inline-flex rounded-md border border-stone-200 bg-stone-100 p-0.5 text-[0.6875rem] font-bold"
        aria-label="View mode"
      >
        <span class="rounded bg-white px-3 py-1.5 text-stone-900 shadow-sm">
          2D
        </span>
        <span class="w-12 text-center px-2 py-1.5 tabular-nums text-stone-500">
          {{ Math.round(zoom * 100) }}%
        </span>
      </div>
    </div>

    <div
      class="absolute top-14 left-3 z-20 grid overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-md backdrop-blur"
      aria-label="Canvas zoom controls"
    >
      <button
        type="button"
        class="canvas-tool"
        :disabled="!canUndo"
        aria-label="Undo last change"
        @click="emit('undo')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 20V17.6C20 14.2397 20 12.5595 19.346 11.2761C18.7708 10.1471 17.8529 9.2292 16.7239 8.65396C15.4405 8 13.7603 8 10.4 8H4M4 8L8 12M4 8L8 4" />
        </svg>
      </button>
      <button
        type="button"
        class="canvas-tool"
        :disabled="!canRedo"
        aria-label="Redo last change"
        @click="emit('redo')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 20V17.6C4 14.2397 4 12.5595 4.65396 11.2761C5.2292 10.1471 6.14708 9.2292 7.27606 8.65396C8.55953 8 10.2397 8 13.6 8H20M20 8L16 12M20 8L16 4" />
        </svg>
      </button>
      <button
        type="button"
        class="canvas-tool"
        :disabled="zoom >= MAX_ZOOM"
        aria-label="Zoom in"
        @click="setZoom(zoom + 0.25)"
      >
        +
      </button>
      <button
        type="button"
        class="canvas-tool"
        :disabled="zoom <= MIN_ZOOM"
        aria-label="Zoom out"
        @click="setZoom(zoom - 0.25)"
      >
        −
      </button>
      <button
        type="button"
        class="canvas-tool canvas-tool--orientation"
        :aria-label="
          isPlanRotated
            ? 'Switch plan to horizontal orientation'
            : 'Switch plan to vertical orientation'
        "
        :aria-pressed="isPlanRotated"
        @click="togglePlanOrientation"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21C7.02944 21 3 16.9706 3 12C3 9.69494 3.86656 7.59227 5.29168 6L8 3M12 3C16.9706 3 21 7.02944 21 12C21 14.3051 20.1334 16.4077 18.7083 18L16 21M3 3H8M8 3V8M21 21H16M16 21V16" />
        </svg>
      </button>
      <button
        type="button"
        class="canvas-tool canvas-tool--fit"
        aria-label="Fit plan to canvas"
        @click="resetView"
      >
        Fit
      </button>
    </div>

    <div
      v-if="isFreeForm"
      data-free-form-control
      class="absolute top-14 right-3 z-20 rounded-lg border border-stone-200 bg-white/95 shadow-md backdrop-blur"
      :class="isFreeFormClosed ? 'p-2' : 'w-56 p-3'"
    >
      <template v-if="isFreeFormClosed">
        <div class="flex items-center gap-2">
          <p class="text-[0.625rem] font-bold text-stone-500">
            {{ freeFormVertices.length }} points · Drag to edit
          </p>
          <button
            type="button"
            class="free-form-action shrink-0"
            @click="clearFreeForm"
          >
            Clear
          </button>
        </div>
      </template>
      <template v-else>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[0.625rem] font-extrabold tracking-[0.1em] text-[#648349] uppercase">
              Free-form outline
            </p>
            <p class="mt-1 text-[0.6875rem] leading-4 text-stone-500">
              Click the grid to add points. Click A to close.
            </p>
          </div>
          <span class="shrink-0 text-[0.625rem] font-bold text-stone-400">
            {{ freeFormVertices.length }}/{{ FREE_FORM_MAX_VERTICES }}
          </span>
        </div>
        <div class="mt-2.5 flex gap-2">
          <button
            type="button"
            class="free-form-action free-form-action--primary"
            :disabled="freeFormVertices.length < 3"
            @click="closeFreeForm"
          >
            Close outline
          </button>
          <button
            v-if="freeFormVertices.length > 0"
            type="button"
            class="free-form-action"
            @click="clearFreeForm"
          >
            Clear
          </button>
        </div>
      </template>
    </div>

    <svg
      ref="svgRef"
      class="absolute inset-x-0 top-11 bottom-0 h-[calc(100%-2.75rem)] min-h-[386px] w-full touch-pan-y lg:min-h-0"
      :class="
        isPanning || draggedSpecialElementId !== null
          ? 'cursor-grabbing'
          : isFreeForm && !isFreeFormClosed
            ? 'cursor-crosshair'
            : 'cursor-grab'
      "
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-labelledby="terrace-preview-title terrace-preview-description"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @click="handleCanvasClick"
    >
      <title id="terrace-preview-title">
        {{ shapeLabel }} terrace plan
      </title>
      <desc id="terrace-preview-description">
        Proportional top-down plan using {{ texture.label }} boards at
        {{ config.decking.angle }} degrees. Dimensions are shown in centimetres.
        {{ config.specialElements.length }} special elements are placed on the
        plan.
      </desc>

      <defs>
        <pattern
          :id="patternId"
          patternUnits="userSpaceOnUse"
          :x="patternOrigin.x"
          :y="patternOrigin.y"
          :width="patternWidth"
          :height="patternHeight"
          :patternTransform="patternTransform"
        >
          <rect
            x="0"
            y="0"
            :width="patternWidth"
            :height="patternHeight"
            :fill="texture.grainColor"
            opacity="0.7"
          />
          <rect
            x="0"
            y="0"
            :width="patternWidth"
            :height="config.decking.boardWidth"
            :fill="texture.baseColor"
          />
          <rect
            x="0"
            y="0"
            :width="patternWidth"
            :height="config.decking.boardWidth * 0.47"
            :fill="texture.secondaryColor"
            opacity="0.22"
          />
          <path
            :d="grainPath"
            fill="none"
            :stroke="texture.grainColor"
            stroke-linecap="round"
            stroke-opacity="0.27"
            stroke-width="0.9"
            vector-effect="non-scaling-stroke"
          />
          <path
            :d="secondaryGrainPath"
            fill="none"
            :stroke="texture.secondaryColor"
            stroke-linecap="round"
            stroke-opacity="0.4"
            stroke-width="0.8"
            vector-effect="non-scaling-stroke"
          />
        </pattern>

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

      <g class="special-elements">
        <g
          v-for="renderedElement in renderedSpecialElements"
          :key="renderedElement.element.id"
          data-special-element-control
          class="special-element"
          :class="[
            `special-element--${renderedElement.element.type}`,
            {
              'special-element--active':
                activeSpecialElementId === renderedElement.element.id,
              'special-element--dragging':
                draggedSpecialElementId === renderedElement.element.id,
            },
          ]"
          :transform="`translate(${renderedElement.element.position.x} ${renderedElement.element.position.y}) rotate(${renderedElement.element.rotation})`"
          tabindex="0"
          role="button"
          :aria-label="`${renderedElement.label}. Drag to move; press Delete to remove.`"
          @pointerdown.stop="
            handleSpecialElementPointerDown(
              $event,
              renderedElement.element,
            )
          "
          @click.stop="
            emit('select-special-element', renderedElement.element.id)
          "
          @keydown.enter.prevent.stop="
            emit('select-special-element', renderedElement.element.id)
          "
          @keydown.space.prevent.stop="
            emit('select-special-element', renderedElement.element.id)
          "
          @keydown.delete.prevent.stop="
            emit('remove-special-element', renderedElement.element.id)
          "
          @keydown.backspace.prevent.stop="
            emit('remove-special-element', renderedElement.element.id)
          "
        >
          <path
            :d="renderedElement.geometry.path"
            class="special-element__shape"
            vector-effect="non-scaling-stroke"
          />
          <path
            v-for="detailPath in renderedElement.geometry.detailPaths"
            :key="detailPath"
            :d="detailPath"
            class="special-element__detail"
            vector-effect="non-scaling-stroke"
          />
          <circle
            v-if="
              activeSpecialElementId === renderedElement.element.id
            "
            r="3"
            class="special-element__centre"
            vector-effect="non-scaling-stroke"
          />
          <g
            class="special-element__label"
            :transform="`rotate(${-renderedElement.element.rotation}) scale(${annotationScale})`"
          >
            <rect
              :x="-(renderedElement.label.length * 7.2 + 20) / 2"
              y="-12"
              :width="renderedElement.label.length * 7.2 + 20"
              height="24"
              rx="12"
              vector-effect="non-scaling-stroke"
            />
            <text
              x="0"
              y="0"
              font-size="10"
              font-family="Inter, ui-sans-serif, system-ui, sans-serif"
              font-weight="800"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ renderedElement.label }}
            </text>
          </g>
        </g>
      </g>

      <template v-if="showDimensions && !hasArcEdges">
        <g
          v-for="edge in geometry.edges"
          :key="edge.id"
          class="dimension-edge"
          :class="{
            'dimension-edge--interactive':
              fieldKeyByEdgeId[edge.id] !== undefined,
            'dimension-edge--active': activeEdgeIds.has(edge.id),
          }"
          :tabindex="
            fieldKeyByEdgeId[edge.id] === undefined ? undefined : 0
          "
          :role="
            fieldKeyByEdgeId[edge.id] === undefined ? undefined : 'button'
          "
          :aria-label="
            fieldKeyByEdgeId[edge.id] === undefined
              ? undefined
              : edgeAccessibleLabel(edge)
          "
          @click.stop="activateEdge(edge.id)"
          @keydown.enter.prevent.stop="activateEdge(edge.id)"
          @keydown.space.prevent.stop="activateEdge(edge.id)"
        >
          <line
            :x1="edge.start.x"
            :y1="edge.start.y"
            :x2="edge.dimension.guideStart.x"
            :y2="edge.dimension.guideStart.y"
            class="dimension-extension"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="edge.end.x"
            :y1="edge.end.y"
            :x2="edge.dimension.guideEnd.x"
            :y2="edge.dimension.guideEnd.y"
            class="dimension-extension"
            vector-effect="non-scaling-stroke"
          />
          <path
            :d="edge.dimension.guidePath"
            fill="none"
            class="dimension-line"
            :marker-start="`url(#${arrowId})`"
            :marker-end="`url(#${arrowId})`"
            vector-effect="non-scaling-stroke"
          />

          <g
            :transform="`translate(${edge.dimension.labelPosition.x} ${edge.dimension.labelPosition.y}) rotate(${edge.dimension.labelRotationDegrees}) scale(${annotationScale})`"
          >
            <rect
              :x="-edgeLabelBoxWidth(edge) / 2"
              :y="-labelFontSize * 0.76"
              :width="edgeLabelBoxWidth(edge)"
              :height="labelFontSize * 1.52"
              :rx="labelFontSize * 0.38"
              class="dimension-label-box"
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
              class="dimension-label-text"
            >
              {{ formatMeasurement(edge.dimension.value) }}
            </text>
          </g>
        </g>
      </template>

      <template v-if="showDimensions && hasArcEdges">
        <g
          v-for="guide in renderedGuides"
          :key="guide.id"
          class="dimension-edge dimension-edge--interactive"
          :class="{
            'dimension-edge--active': activeDimensionKey === guide.id,
          }"
          tabindex="0"
          role="button"
          :aria-label="guideAccessibleLabel(guide)"
          @click.stop="emit('activate-dimension', guide.id)"
          @keydown.enter.prevent.stop="emit('activate-dimension', guide.id)"
          @keydown.space.prevent.stop="emit('activate-dimension', guide.id)"
        >
          <line
            :x1="guide.start.x"
            :y1="guide.start.y"
            :x2="guide.lineStartX"
            :y2="guide.lineStartY"
            class="dimension-extension"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="guide.end.x"
            :y1="guide.end.y"
            :x2="guide.lineEndX"
            :y2="guide.lineEndY"
            class="dimension-extension"
            vector-effect="non-scaling-stroke"
          />
          <line
            :x1="guide.lineStartX"
            :y1="guide.lineStartY"
            :x2="guide.lineEndX"
            :y2="guide.lineEndY"
            class="dimension-line"
            :marker-start="`url(#${arrowId})`"
            :marker-end="`url(#${arrowId})`"
            vector-effect="non-scaling-stroke"
          />
          <g
            :transform="`translate(${guide.labelX} ${guide.labelY}) rotate(${guide.labelRotation}) scale(${annotationScale})`"
          >
            <rect
              :x="-guideLabelBoxWidth(guide.label) / 2"
              :y="-labelFontSize * 0.76"
              :width="guideLabelBoxWidth(guide.label)"
              :height="labelFontSize * 1.52"
              :rx="labelFontSize * 0.38"
              class="dimension-label-box"
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
              class="dimension-label-text"
            >
              {{ guide.label }}
            </text>
          </g>
        </g>
      </template>

      <g v-if="showDimensions" class="vertex-labels">
        <g
          v-for="vertex in geometry.vertices"
          :key="vertex.id"
          :transform="`translate(${vertex.labelPosition.x} ${vertex.labelPosition.y}) scale(${annotationScale})`"
        >
          <circle
            r="10"
            fill="#ffffff"
            stroke="#3e443b"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
          <text
            x="0"
            y="0"
            :font-size="vertexFontSize"
            font-family="Inter, ui-sans-serif, system-ui, sans-serif"
            font-weight="800"
            text-anchor="middle"
            dominant-baseline="central"
            fill="#363b34"
          >
            {{ vertex.label }}
          </text>
        </g>
      </g>

      <g
        v-if="showDimensions && isFreeFormClosed"
        class="free-form-angle-labels"
      >
        <g
          v-for="angle in freeFormAngleLabels"
          :key="`angle-${angle.id}`"
          :transform="`translate(${angle.position.x} ${angle.position.y}) scale(${annotationScale})`"
        >
          <circle
            :r="labelFontSize * 1.5"
            class="free-form-angle-sector"
            vector-effect="non-scaling-stroke"
          />
          <rect
            :x="-labelFontSize * 1.55"
            :y="-labelFontSize * 0.72"
            :width="labelFontSize * 3.1"
            :height="labelFontSize * 1.44"
            :rx="labelFontSize * 0.72"
            class="free-form-angle-box"
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
            class="free-form-angle-text"
          >
            {{ angle.value }}°
          </text>
        </g>
      </g>

      <g v-if="isFreeForm" class="free-form-handles">
        <g
          v-for="(point, index) in freeFormVertices"
          :key="`free-form-handle-${index}`"
          data-free-form-control
          :transform="`translate(${point.x} ${point.y}) scale(${annotationScale})`"
          tabindex="0"
          role="button"
          :aria-label="`Point ${geometry.vertices[index]?.label ?? index + 1}. Drag to move; press Delete to remove.`"
          @pointerdown.stop="handleVertexPointerDown($event, index)"
          @click.stop="handleVertexClick(index)"
          @keydown.enter.prevent.stop="handleVertexClick(index)"
          @keydown.space.prevent.stop="handleVertexClick(index)"
          @keydown.delete.prevent.stop="removeFreeFormVertex(index)"
          @keydown.backspace.prevent.stop="removeFreeFormVertex(index)"
        >
          <circle
            :r="freeFormHandleRadius + (index === 0 && !isFreeFormClosed ? 4 : 2)"
            class="free-form-handle-hit"
          />
          <circle
            :r="freeFormHandleRadius"
            class="free-form-handle"
            :class="{
              'free-form-handle--start':
                index === 0 && !isFreeFormClosed,
            }"
            vector-effect="non-scaling-stroke"
          />
          <circle
            :r="Math.max(2.5, freeFormHandleRadius * 0.34)"
            class="free-form-handle-dot"
          />
        </g>
      </g>
      </g>
    </svg>

    <div
      class="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto rounded-lg border border-stone-200 bg-white/95 p-1 shadow-md backdrop-blur"
      aria-label="Plan display options"
    >
      <button
        type="button"
        class="display-toggle"
        :class="{ 'display-toggle--active': showDecking }"
        :aria-pressed="showDecking"
        @click="showDecking = !showDecking"
      >
        Decking
      </button>
      <button
        type="button"
        class="display-toggle"
        :class="{ 'display-toggle--active': showDimensions }"
        :aria-pressed="showDimensions"
        @click="showDimensions = !showDimensions"
      >
        Dimensions
      </button>
      <button
        type="button"
        class="display-toggle"
        :class="{ 'display-toggle--active': showGrid }"
        :aria-pressed="showGrid"
        @click="showGrid = !showGrid"
      >
        Grid
      </button>
    </div>
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

.special-element {
  cursor: grab;
  outline: none;
}

.special-element:active,
.special-element--dragging {
  cursor: grabbing;
}

.special-element__shape {
  stroke: #3f463a;
  stroke-width: 1.5;
  transition:
    stroke 120ms ease,
    filter 120ms ease;
}

.special-element--house-wall .special-element__shape {
  fill: #545951;
  stroke: #292d27;
}

.special-element--rect-cutout .special-element__shape,
.special-element--circle-cutout .special-element__shape {
  fill: #f2f3f0;
  fill-opacity: 0.97;
  stroke-dasharray: 5 3;
}

.special-element--stairs .special-element__shape {
  fill: #e6dfd3;
  fill-opacity: 0.94;
}

.special-element__detail {
  fill: none;
  stroke: #4c5149;
  stroke-width: 1;
  pointer-events: none;
}

.special-element:hover .special-element__shape,
.special-element:focus-visible .special-element__shape,
.special-element--active .special-element__shape {
  stroke: #4f7a30;
  stroke-width: 2.5;
  filter: drop-shadow(0 2px 3px rgb(53 75 39 / 0.28));
}

.special-element:focus-visible .special-element__shape {
  stroke-width: 3;
}

.special-element__centre {
  fill: #fff;
  stroke: #4f7a30;
  stroke-width: 1.5;
  pointer-events: none;
}

.special-element__label {
  pointer-events: none;
}

.special-element__label rect {
  fill: #fff;
  fill-opacity: 0.96;
  stroke: #697065;
  stroke-opacity: 0.5;
  stroke-width: 1;
}

.special-element__label text {
  fill: #464c43;
}

.special-element--active .special-element__label rect {
  fill: #edf5e7;
  stroke: #4f7a30;
  stroke-opacity: 1;
}

.special-element--active .special-element__label text {
  fill: #3f612d;
}

.free-form-action {
  flex: 1;
  border: 1px solid #d6d3d1;
  border-radius: 0.4rem;
  padding: 0.45rem 0.55rem;
  color: #57534e;
  font-size: 0.625rem;
  font-weight: 750;
  line-height: 1;
  outline: none;
}

.free-form-action:hover:not(:disabled) {
  background: #f5f5f4;
}

.free-form-action:focus-visible {
  box-shadow: 0 0 0 2px #dce8d1;
}

.free-form-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.free-form-action--primary {
  border-color: #648349;
  background: #648349;
  color: #fff;
}

.free-form-action--primary:hover:not(:disabled) {
  background: #56743e;
}

.free-form-handles > g {
  cursor: grab;
  outline: none;
}

.free-form-handles > g:active {
  cursor: grabbing;
}

.free-form-handle-hit {
  fill: transparent;
}

.free-form-handle {
  fill: #fff;
  stroke: #4f6f39;
  stroke-width: 2;
  transition: fill 120ms ease;
}

.free-form-handles > g:hover .free-form-handle,
.free-form-handles > g:focus-visible .free-form-handle,
.free-form-handle--start {
  fill: #e8f2df;
  stroke-width: 3;
}

.free-form-handle-dot {
  fill: #648349;
  pointer-events: none;
}

.free-form-angle-labels {
  pointer-events: none;
}

.free-form-angle-sector {
  fill: #80bd5f;
  fill-opacity: 0.55;
  stroke: #5f9f3e;
  stroke-width: 1;
}

.free-form-angle-box {
  fill: #dededb;
  fill-opacity: 0.94;
}

.free-form-angle-text {
  fill: #272822;
}

.canvas-tool {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-bottom: 1px solid #e7e5e4;
  color: #44403c;
  font-size: 1.125rem;
  font-weight: 600;
  outline: none;
}

.canvas-tool:hover:not(:disabled) {
  background: #fafaf9;
}

.canvas-tool:focus-visible {
  box-shadow: inset 0 0 0 2px #648349;
}

.canvas-tool:disabled {
  cursor: not-allowed;
  color: #d6d3d1;
}

.canvas-tool--fit {
  border-bottom: 0;
  color: #57534e;
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.dimension-edge {
  --dimension-color: #5d635a;
  color: var(--dimension-color);
}

.dimension-edge--interactive {
  cursor: pointer;
  outline: none;
}

.dimension-edge--interactive:hover,
.dimension-edge--interactive:focus-visible,
.dimension-edge--active {
  --dimension-color: #4f7a30;
}

.dimension-edge--interactive:focus-visible .dimension-label-box {
  stroke-width: 2.5;
}

.dimension-extension {
  stroke: var(--dimension-color);
  stroke-dasharray: 3 3;
  stroke-opacity: 0.48;
  stroke-width: 1;
}

.dimension-line {
  stroke: var(--dimension-color);
  stroke-width: 1.1;
}

.dimension-label-box {
  fill: #fff;
  fill-opacity: 0.96;
  stroke: var(--dimension-color);
  stroke-opacity: 0.28;
  stroke-width: 1;
}

.dimension-label-text {
  fill: var(--dimension-color);
}

.vertex-labels {
  pointer-events: none;
}

.display-toggle {
  flex: none;
  border-radius: 0.35rem;
  padding: 0.45rem 0.7rem;
  color: #787870;
  font-size: 0.625rem;
  font-weight: 750;
  line-height: 1;
  outline: none;
}

.display-toggle:hover {
  background: #f5f5f2;
  color: #34342f;
}

.display-toggle:focus-visible {
  box-shadow: 0 0 0 2px #648349;
}

.display-toggle--active {
  background: #eaf1e4;
  color: #52723b;
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
