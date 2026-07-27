<script setup lang="ts">
import { computed } from 'vue'

import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type {
  DimensionGuide,
  TerraceConfig,
  TerraceDimensions,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
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

const geometry = computed(() =>
  createTerraceGeometry(
    props.config.shape,
    props.config.dimensions as TerraceDimensions,
  ),
)

const texture = computed(() => woodTextureById[props.config.texture])

const maximumExtent = computed(() =>
  Math.max(geometry.value.bounds.width, geometry.value.bounds.height),
)

const viewPadding = computed(() =>
  Math.max(78, maximumExtent.value * 0.14),
)

const viewBox = computed(() => {
  const { x, y, width, height } = geometry.value.bounds
  const padding = viewPadding.value
  return `${x - padding} ${y - padding} ${width + padding * 2} ${
    height + padding * 2
  }`
})

const labelFontSize = computed(() =>
  Math.max(7, maximumExtent.value * 0.034),
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

const labelBoxWidth = (label: string): number =>
  label.length * labelFontSize.value * 0.58 + labelFontSize.value * 1.25
</script>

<template>
  <div
    class="preview-stage relative h-[min(58vh,650px)] min-h-[390px] overflow-hidden sm:min-h-[520px] lg:h-[calc(100dvh-274px)] lg:min-h-[520px]"
  >
    <div
      class="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full border border-black/8 bg-[#f7f5ef]/75 px-3 py-1.5 text-[10px] font-semibold tracking-[0.16em] text-black/45 uppercase backdrop-blur-md sm:top-5 sm:left-5"
      aria-hidden="true"
    >
      <span class="size-1.5 rounded-full bg-[#587064]" />
      Top / 2D
    </div>

    <svg
      class="h-full w-full"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby="terrace-preview-title terrace-preview-description"
    >
      <title id="terrace-preview-title">Configured terrace plan</title>
      <desc id="terrace-preview-description">
        A proportional top-down terrace drawing with board texture and dimension
        lines in centimeters.
      </desc>

      <defs>
        <pattern
          id="terrace-board-pattern"
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
            stroke-opacity="0.55"
            stroke-width="1.35"
            vector-effect="non-scaling-stroke"
          />
          <line
            v-else
            x1="0"
            y1="0"
            x2="0"
            :y2="patternHeight"
            :stroke="texture.grainColor"
            stroke-opacity="0.55"
            stroke-width="1.35"
            vector-effect="non-scaling-stroke"
          />
          <path
            :d="grainPath"
            fill="none"
            :stroke="texture.grainColor"
            stroke-linecap="round"
            stroke-opacity="0.28"
            stroke-width="0.9"
            vector-effect="non-scaling-stroke"
          />
          <path
            :d="secondaryGrainPath"
            fill="none"
            :stroke="texture.secondaryColor"
            stroke-linecap="round"
            stroke-opacity="0.42"
            stroke-width="0.8"
            vector-effect="non-scaling-stroke"
          />
        </pattern>

        <marker
          id="dimension-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path d="M 7 0 L 0 3.5 L 7 7 Z" fill="#52554e" />
        </marker>
      </defs>

      <path
        :d="geometry.path"
        fill="url(#terrace-board-pattern)"
        stroke="#5b422e"
        stroke-width="2"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        class="terrace-shape"
      />

      <g
        v-for="guide in renderedGuides"
        :key="guide.id"
        class="dimension-guide"
      >
        <line
          :x1="guide.start.x"
          :y1="guide.start.y"
          :x2="guide.lineStartX"
          :y2="guide.lineStartY"
          stroke="#676961"
          stroke-opacity="0.42"
          stroke-width="1"
          stroke-dasharray="3 3"
          vector-effect="non-scaling-stroke"
        />
        <line
          :x1="guide.end.x"
          :y1="guide.end.y"
          :x2="guide.lineEndX"
          :y2="guide.lineEndY"
          stroke="#676961"
          stroke-opacity="0.42"
          stroke-width="1"
          stroke-dasharray="3 3"
          vector-effect="non-scaling-stroke"
        />
        <line
          :x1="guide.lineStartX"
          :y1="guide.lineStartY"
          :x2="guide.lineEndX"
          :y2="guide.lineEndY"
          stroke="#52554e"
          stroke-width="1.1"
          marker-start="url(#dimension-arrow)"
          marker-end="url(#dimension-arrow)"
          vector-effect="non-scaling-stroke"
        />

        <g
          :transform="`translate(${guide.labelX} ${guide.labelY}) rotate(${guide.labelRotation})`"
        >
          <rect
            :x="-labelBoxWidth(guide.label) / 2"
            :y="-labelFontSize * 0.78"
            :width="labelBoxWidth(guide.label)"
            :height="labelFontSize * 1.56"
            :rx="labelFontSize * 0.4"
            fill="#f3f1ea"
            fill-opacity="0.96"
            stroke="#595b55"
            stroke-opacity="0.12"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
          <text
            x="0"
            y="0"
            :font-size="labelFontSize"
            font-family="Inter, ui-sans-serif, system-ui, sans-serif"
            font-weight="650"
            text-anchor="middle"
            dominant-baseline="central"
            fill="#3f413c"
          >
            {{ guide.label }}
          </text>
        </g>
      </g>
    </svg>

    <p
      class="pointer-events-none absolute right-4 bottom-4 rounded-full border border-black/8 bg-[#f7f5ef]/75 px-3 py-1.5 text-[10px] font-medium text-black/40 backdrop-blur-md sm:right-5 sm:bottom-5"
    >
      Proportions update live
    </p>
  </div>
</template>

<style scoped>
.preview-stage {
  background-color: #e8e5dc;
  background-image:
    linear-gradient(rgb(54 61 54 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(54 61 54 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(54 61 54 / 2.5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(54 61 54 / 2.5%) 1px, transparent 1px);
  background-position: center;
  background-size:
    80px 80px,
    80px 80px,
    16px 16px,
    16px 16px;
}

.terrace-shape {
  filter: drop-shadow(0 18px 16px rgb(63 50 38 / 0.16));
}

.dimension-guide {
  pointer-events: none;
}
</style>
