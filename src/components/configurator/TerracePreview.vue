<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { shapeOptionById } from '@/data/shapes'
import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type {
  DimensionGuide,
  GeometryEdge,
  Point,
  TerraceConfig,
  TerraceDimensions,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  activeDimensionKey: string | null
}>()

const emit = defineEmits<{
  'activate-dimension': [key: string | null]
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

const patternId = `terrace-board-pattern-${useId()}`
const arrowId = `dimension-arrow-${useId()}`

const zoom = ref(1)
const showDimensions = ref(true)
const showGrid = ref(true)
const showDecking = ref(true)

const geometry = computed(() =>
  createTerraceGeometry(
    props.config.shape,
    props.config.dimensions as TerraceDimensions,
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

const viewBox = computed(() => {
  const viewport = baseViewport.value
  const width = viewport.width / zoom.value
  const height = viewport.height / zoom.value
  const centerX = viewport.x + viewport.width / 2
  const centerY = viewport.y + viewport.height / 2

  return `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`
})

const labelFontSize = computed(() =>
  Math.max(9, maximumExtent.value * 0.026),
)

const vertexFontSize = computed(() =>
  Math.max(10, maximumExtent.value * 0.025),
)

const boardWidth = computed(() =>
  Math.max(12, maximumExtent.value / 22),
)

const patternWidth = computed(() =>
  props.config.boardDirection === 'horizontal'
    ? boardWidth.value * 5
    : boardWidth.value,
)

const patternHeight = computed(() =>
  props.config.boardDirection === 'horizontal'
    ? boardWidth.value
    : boardWidth.value * 5,
)

const pointsMatch = (first: Point, second: Point): boolean =>
  first.x === second.x && first.y === second.y

const fieldKeyByEdgeId = computed<Record<string, string>>(() =>
  Object.fromEntries(
    geometry.value.edges.flatMap((edge) => {
      const matchingGuide = geometry.value.dimensionGuides.find(
        (guide) =>
          (pointsMatch(edge.start, guide.start) &&
            pointsMatch(edge.end, guide.end)) ||
          (pointsMatch(edge.start, guide.end) &&
            pointsMatch(edge.end, guide.start)),
      )

      return matchingGuide === undefined
        ? []
        : [[edge.id, matchingGuide.id] as const]
    }),
  ),
)

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
  const board = boardWidth.value
  const run = board * 5

  if (props.config.boardDirection === 'horizontal') {
    return [
      `M ${run * 0.08} ${board * 0.33}`,
      `C ${run * 0.25} ${board * 0.16}, ${run * 0.4} ${
        board * 0.58
      }, ${run * 0.58} ${board * 0.38}`,
      `S ${run * 0.85} ${board * 0.24}, ${run * 0.96} ${board * 0.5}`,
    ].join(' ')
  }

  return [
    `M ${board * 0.33} ${run * 0.08}`,
    `C ${board * 0.16} ${run * 0.25}, ${board * 0.58} ${
      run * 0.4
    }, ${board * 0.38} ${run * 0.58}`,
    `S ${board * 0.24} ${run * 0.85}, ${board * 0.5} ${run * 0.96}`,
  ].join(' ')
})

const secondaryGrainPath = computed(() => {
  const board = boardWidth.value
  const run = board * 5

  return props.config.boardDirection === 'horizontal'
    ? `M ${run * 0.16} ${board * 0.72} Q ${run * 0.5} ${
        board * 0.48
      } ${run * 0.86} ${board * 0.7}`
    : `M ${board * 0.72} ${run * 0.16} Q ${board * 0.48} ${
        run * 0.5
      } ${board * 0.7} ${run * 0.86}`
})

const edgeLabelBoxWidth = (edge: GeometryEdge): number =>
  formatMeasurement(edge.dimension.value).length *
    labelFontSize.value *
    0.58 +
  labelFontSize.value * 1.25

const guideLabelBoxWidth = (label: string): number =>
  label.length * labelFontSize.value * 0.58 + labelFontSize.value * 1.25

const setZoom = (nextZoom: number): void => {
  zoom.value = Math.min(Math.max(nextZoom, 0.65), 2.4)
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
      : dimensionLabelByKey.value[fieldKey]

  return `Edit ${fieldLabel}, ${formatMeasurement(edge.dimension.value)}`
}

const guideAccessibleLabel = (guide: DimensionGuide): string =>
  `Edit ${dimensionLabelByKey.value[guide.id] ?? guide.id}, ${formatMeasurement(
    guide.value,
  )}`

watch(
  () => props.config.shape,
  () => {
    zoom.value = 1
  },
)
</script>

<template>
  <div
    class="preview-stage relative min-h-[430px] overflow-hidden lg:h-full lg:min-h-0"
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
      </div>
    </div>

    <div
      class="absolute top-14 left-3 z-20 grid overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-md backdrop-blur"
      aria-label="Canvas zoom controls"
    >
      <button
        type="button"
        class="grid size-10 place-items-center border-b border-stone-200 text-lg font-medium text-stone-700 hover:bg-stone-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
        aria-label="Zoom in"
        @click="setZoom(zoom + 0.2)"
      >
        +
      </button>
      <button
        type="button"
        class="grid size-10 place-items-center border-b border-stone-200 text-lg font-medium text-stone-700 hover:bg-stone-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
        aria-label="Zoom out"
        @click="setZoom(zoom - 0.2)"
      >
        −
      </button>
      <button
        type="button"
        class="grid size-10 place-items-center text-[0.625rem] font-extrabold tracking-tight text-stone-600 uppercase hover:bg-stone-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
        aria-label="Fit plan to canvas"
        @click="setZoom(1)"
      >
        Fit
      </button>
    </div>

    <div
      class="pointer-events-none absolute top-14 right-3 z-10 rounded-md border border-stone-200 bg-white/88 px-2.5 py-1.5 text-[0.625rem] font-bold tracking-[0.1em] text-stone-500 uppercase backdrop-blur"
    >
      {{ Math.round(zoom * 100) }}%
    </div>

    <svg
      class="absolute inset-x-0 top-11 bottom-0 h-[calc(100%-2.75rem)] min-h-[386px] w-full touch-pan-y lg:min-h-0"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-labelledby="terrace-preview-title terrace-preview-description"
      @wheel="handleWheel"
      @click.self="emit('activate-dimension', null)"
    >
      <title id="terrace-preview-title">
        {{ shapeLabel }} terrace plan
      </title>
      <desc id="terrace-preview-description">
        Proportional top-down plan using {{ texture.label }} boards in a
        {{ config.boardDirection }} direction. Dimensions are shown in
        centimetres.
      </desc>

      <defs>
        <pattern
          :id="patternId"
          patternUnits="userSpaceOnUse"
          :width="patternWidth"
          :height="patternHeight"
        >
          <rect
            x="0"
            y="0"
            :width="patternWidth"
            :height="patternHeight"
            :fill="texture.baseColor"
          />
          <rect
            x="0"
            y="0"
            :width="
              config.boardDirection === 'horizontal'
                ? patternWidth
                : patternWidth * 0.47
            "
            :height="
              config.boardDirection === 'horizontal'
                ? patternHeight * 0.47
                : patternHeight
            "
            :fill="texture.secondaryColor"
            opacity="0.2"
          />
          <line
            v-if="config.boardDirection === 'horizontal'"
            x1="0"
            y1="0"
            :x2="patternWidth"
            y2="0"
            :stroke="texture.grainColor"
            stroke-opacity="0.62"
            stroke-width="1.2"
            vector-effect="non-scaling-stroke"
          />
          <line
            v-else
            x1="0"
            y1="0"
            x2="0"
            :y2="patternHeight"
            :stroke="texture.grainColor"
            stroke-opacity="0.62"
            stroke-width="1.2"
            vector-effect="non-scaling-stroke"
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

      <path
        :d="geometry.path"
        :fill="showDecking ? `url(#${patternId})` : '#d7d8d2'"
        stroke="#3e443b"
        stroke-width="2"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        class="terrace-shape"
      />

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
            :transform="`translate(${edge.dimension.labelPosition.x} ${edge.dimension.labelPosition.y}) rotate(${edge.dimension.labelRotationDegrees})`"
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
            :transform="`translate(${guide.labelX} ${guide.labelY}) rotate(${guide.labelRotation})`"
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
          :transform="`translate(${vertex.labelPosition.x} ${vertex.labelPosition.y})`"
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
