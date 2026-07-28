<script setup lang="ts">
defineProps<{
  zoom: number
  canUndo: boolean
  canRedo: boolean
  minZoom: number
  maxZoom: number
  isPlanRotated: boolean
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  'zoom-in': []
  'zoom-out': []
  'toggle-orientation': []
  'reset-view': []
}>()
</script>

<template>
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
      :disabled="zoom >= maxZoom"
      aria-label="Zoom in"
      @click="emit('zoom-in')"
    >
      +
    </button>
    <button
      type="button"
      class="canvas-tool"
      :disabled="zoom <= minZoom"
      aria-label="Zoom out"
      @click="emit('zoom-out')"
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
      @click="emit('toggle-orientation')"
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
      @click="emit('reset-view')"
    >
      Fit
    </button>
  </div>
</template>

<style scoped>
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
</style>
