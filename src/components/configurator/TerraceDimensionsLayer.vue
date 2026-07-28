<script setup lang="ts">
import { computed } from 'vue'

import { calculateInteriorAngles } from '@/geometry/freeForm'
import type {
  DimensionGuide,
  GeometryEdge,
  ShapeGeometry,
} from '@/types/terrace'

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

const props = defineProps<{
  geometry: ShapeGeometry
  showDimensions: boolean
  activeDimensionKey: string | null
  fieldKeyByEdgeId: Readonly<Record<string, string>>
  dimensionLabelByKey: Readonly<Record<string, string>>
  arrowId: string
  labelFontSize: number
  annotationScale: number
  vertexFontSize: number
  isFreeFormClosed: boolean
}>()

const emit = defineEmits<{
  'activate-dimension': [key: string]
}>()

const hasArcEdges = computed(() =>
  props.geometry.edges.some((edge) => edge.kind === 'arc'),
)

const activeEdgeIds = computed(() => {
  if (props.activeDimensionKey === null) {
    return new Set<string>()
  }

  return new Set(
    Object.entries(props.fieldKeyByEdgeId)
      .filter(([, fieldKey]) => fieldKey === props.activeDimensionKey)
      .map(([edgeId]) => edgeId),
  )
})

const formatMeasurement = (value: number): string => {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} cm`
}

const renderedGuides = computed<RenderedDimensionGuide[]>(() =>
  props.geometry.dimensionGuides.map((guide) => {
    const isHorizontal = guide.orientation === 'horizontal'
    const lineStartX = guide.start.x + (isHorizontal ? 0 : guide.offset)
    const lineStartY = guide.start.y + (isHorizontal ? guide.offset : 0)
    const lineEndX = guide.end.x + (isHorizontal ? 0 : guide.offset)
    const lineEndY = guide.end.y + (isHorizontal ? guide.offset : 0)
    const labelDistance = props.labelFontSize * 0.95
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

const freeFormAngleLabels = computed(() => {
  const points = props.geometry.points
  if (!props.isFreeFormClosed || points.length < 3) {
    return []
  }

  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  )
  const distance = Math.max(32, props.labelFontSize * 2.4)

  return calculateInteriorAngles(points).map((value, index) => {
    const point = points[index]!
    const delta = { x: center.x - point.x, y: center.y - point.y }
    const length = Math.hypot(delta.x, delta.y) || 1

    return {
      id: props.geometry.vertices[index]?.id ?? String(index),
      value: Math.round(value),
      position: {
        x: point.x + (delta.x / length) * distance,
        y: point.y + (delta.y / length) * distance,
      },
    }
  })
})

const edgeLabelBoxWidth = (edge: GeometryEdge): number =>
  formatMeasurement(edge.dimension.value).length *
    props.labelFontSize *
    0.58 +
  props.labelFontSize * 1.25

const guideLabelBoxWidth = (label: string): number =>
  label.length * props.labelFontSize * 0.58 + props.labelFontSize * 1.25

const activateEdge = (edgeId: string): void => {
  const fieldKey = props.fieldKeyByEdgeId[edgeId]
  if (fieldKey !== undefined) {
    emit('activate-dimension', fieldKey)
  }
}

const edgeAccessibleLabel = (edge: GeometryEdge): string => {
  const fieldKey = props.fieldKeyByEdgeId[edge.id]
  const fieldLabel =
    fieldKey === undefined
      ? `edge ${edge.startVertexId} to ${edge.endVertexId}`
      : (props.dimensionLabelByKey[fieldKey] ??
        `edge ${edge.startVertexId} to ${edge.endVertexId}`)

  return `Edit ${fieldLabel}, ${formatMeasurement(edge.dimension.value)}`
}

const guideAccessibleLabel = (guide: DimensionGuide): string =>
  `Edit ${props.dimensionLabelByKey[guide.id] ?? guide.id}, ${formatMeasurement(
    guide.value,
  )}`
</script>

<template>
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
      :tabindex="fieldKeyByEdgeId[edge.id] === undefined ? undefined : 0"
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
</template>

<style scoped>
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
</style>
