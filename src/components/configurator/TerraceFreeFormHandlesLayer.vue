<script setup lang="ts">
import type { ShapeGeometry } from '@/types/terrace'

defineProps<{
  geometry: ShapeGeometry
  annotationScale: number
  handleRadius: number
  isClosed: boolean
}>()

const emit = defineEmits<{
  'pointer-down': [event: PointerEvent, index: number]
  activate: [index: number]
  remove: [index: number]
}>()
</script>

<template>
  <g class="free-form-handles">
    <g
      v-for="(point, index) in geometry.points"
      :key="`free-form-handle-${index}`"
      data-free-form-control
      :transform="`translate(${point.x} ${point.y}) scale(${annotationScale})`"
      tabindex="0"
      role="button"
      :aria-label="`Point ${geometry.vertices[index]?.label ?? index + 1}. Drag to move; press Delete to remove.`"
      @pointerdown.stop="emit('pointer-down', $event, index)"
      @click.stop="emit('activate', index)"
      @keydown.enter.prevent.stop="emit('activate', index)"
      @keydown.space.prevent.stop="emit('activate', index)"
      @keydown.delete.prevent.stop="emit('remove', index)"
      @keydown.backspace.prevent.stop="emit('remove', index)"
    >
      <circle
        :r="handleRadius + (index === 0 && !isClosed ? 4 : 2)"
        class="free-form-handle-hit"
      />
      <circle
        :r="handleRadius"
        class="free-form-handle"
        :class="{
          'free-form-handle--start': index === 0 && !isClosed,
        }"
        vector-effect="non-scaling-stroke"
      />
      <circle
        :r="Math.max(2.5, handleRadius * 0.34)"
        class="free-form-handle-dot"
      />
    </g>
  </g>
</template>

<style scoped>
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
</style>
