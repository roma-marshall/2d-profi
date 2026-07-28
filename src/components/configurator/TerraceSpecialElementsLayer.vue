<script setup lang="ts">
import type {
  SpecialElement,
  SpecialElementGeometry,
} from '@/types/terrace'

interface RenderedSpecialElement {
  element: SpecialElement
  geometry: SpecialElementGeometry
  label: string
}

defineProps<{
  renderedElements: readonly RenderedSpecialElement[]
  activeElementId: string | null
  draggedElementId: string | null
  annotationScale: number
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
  'pointer-down': [event: PointerEvent, element: SpecialElement]
}>()
</script>

<template>
  <g class="special-elements">
    <g
      v-for="renderedElement in renderedElements"
      :key="renderedElement.element.id"
      data-special-element-control
      class="special-element"
      :class="[
        `special-element--${renderedElement.element.type}`,
        {
          'special-element--active':
            activeElementId === renderedElement.element.id,
          'special-element--dragging':
            draggedElementId === renderedElement.element.id,
        },
      ]"
      :transform="`translate(${renderedElement.element.position.x} ${renderedElement.element.position.y}) rotate(${renderedElement.element.rotation})`"
      tabindex="0"
      role="button"
      :aria-label="`${renderedElement.label}. Drag to move; press Delete to remove.`"
      @pointerdown.stop="
        emit('pointer-down', $event, renderedElement.element)
      "
      @click.stop="emit('select', renderedElement.element.id)"
      @keydown.enter.prevent.stop="
        emit('select', renderedElement.element.id)
      "
      @keydown.space.prevent.stop="
        emit('select', renderedElement.element.id)
      "
      @keydown.delete.prevent.stop="
        emit('remove', renderedElement.element.id)
      "
      @keydown.backspace.prevent.stop="
        emit('remove', renderedElement.element.id)
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
        v-if="activeElementId === renderedElement.element.id"
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
</template>

<style scoped>
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
</style>
