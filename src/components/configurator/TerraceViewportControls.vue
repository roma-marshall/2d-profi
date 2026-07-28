<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import type { TerraceAreaSummary } from '@/types/terrace'

const props = defineProps<{
  areas: readonly TerraceAreaSummary[]
  activeAreaId: string
  zoom: number
  canUndo: boolean
  canRedo: boolean
  minZoom: number
  maxZoom: number
  isPlanRotated: boolean
}>()

const emit = defineEmits<{
  'add-area': []
  'close-area': [areaId: string]
  'select-area': [areaId: string]
  undo: []
  redo: []
  'zoom-in': []
  'zoom-out': []
  'toggle-orientation': []
  'reset-view': []
}>()

const areaTabsRef = ref<HTMLElement | null>(null)
let areaTabsResizeObserver: ResizeObserver | undefined

const findAreaTab = (areaId: string): HTMLElement | undefined =>
  Array.from(
    areaTabsRef.value?.querySelectorAll<HTMLElement>(
      '[data-area-id]',
    ) ?? [],
  ).find((tab) => tab.dataset.areaId === areaId)

const scrollAreaIntoView = (areaId: string): void => {
  findAreaTab(areaId)?.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
  })
}

const handleAreaTabKeydown = async (
  event: KeyboardEvent,
  areaId: string,
): Promise<void> => {
  const currentIndex = props.areas.findIndex((area) => area.id === areaId)
  if (currentIndex < 0 || props.areas.length === 0) {
    return
  }

  let nextIndex: number | null = null
  if (event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % props.areas.length
  } else if (event.key === 'ArrowLeft') {
    nextIndex =
      (currentIndex - 1 + props.areas.length) % props.areas.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = props.areas.length - 1
  }

  if (nextIndex === null) {
    return
  }

  event.preventDefault()
  const nextArea = props.areas[nextIndex]
  if (nextArea === undefined) {
    return
  }

  emit('select-area', nextArea.id)
  await nextTick()
  findAreaTab(nextArea.id)?.focus()
}

const handleAreaClose = async (areaId: string): Promise<void> => {
  if (props.areas.length === 1) {
    return
  }

  emit('close-area', areaId)
  await nextTick()
  findAreaTab(props.activeAreaId)?.focus()
}

watch(
  () => props.activeAreaId,
  async (areaId) => {
    await nextTick()
    scrollAreaIntoView(areaId)
  },
  { immediate: true },
)

onMounted(() => {
  if (
    typeof ResizeObserver === 'undefined' ||
    areaTabsRef.value === null
  ) {
    return
  }

  areaTabsResizeObserver = new ResizeObserver(() => {
    scrollAreaIntoView(props.activeAreaId)
  })
  areaTabsResizeObserver.observe(areaTabsRef.value)
})

onBeforeUnmount(() => {
  areaTabsResizeObserver?.disconnect()
})
</script>

<template>
  <div
    class="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between gap-2 border-b border-stone-200/80 bg-white/92 px-2 backdrop-blur"
  >
    <div class="flex h-full min-w-0 flex-1 items-center gap-1">
      <div
        ref="areaTabsRef"
        class="area-tabs flex h-full min-w-0 items-center gap-0.5 overflow-x-auto py-1"
        role="tablist"
        aria-label="Terrace areas"
      >
        <div
          v-for="area in areas"
          :key="area.id"
          class="group flex h-8 min-w-28 max-w-40 shrink-0 items-center overflow-hidden rounded-lg border transition-colors"
          :class="
            area.id === activeAreaId
              ? 'border-[#dfe8d8] bg-[#f7faf5] text-stone-800'
              : 'border-transparent text-stone-500 hover:bg-stone-50 hover:text-stone-700'
          "
          role="presentation"
        >
          <button
            type="button"
            class="flex h-full min-w-0 flex-1 cursor-default items-center gap-1.5 pl-2.5 text-left text-xs font-medium outline-none"
            :class="areas.length > 1 ? 'pr-1' : 'pr-3'"
            role="tab"
            :data-area-id="area.id"
            :aria-selected="area.id === activeAreaId"
            :tabindex="area.id === activeAreaId ? 0 : -1"
            @click="emit('select-area', area.id)"
            @keydown="handleAreaTabKeydown($event, area.id)"
          >
            <span
              class="size-1.5 shrink-0 rounded-full"
              :class="
                area.id === activeAreaId
                  ? 'bg-[#78965e]'
                  : 'bg-stone-300'
              "
              aria-hidden="true"
            />
            <span class="truncate">{{ area.name }}</span>
          </button>

          <button
            v-if="areas.length > 1"
            type="button"
            class="mr-1 grid size-5 shrink-0 place-items-center rounded-md text-stone-400 outline-none transition hover:bg-stone-200/60 hover:text-stone-700 focus-visible:bg-stone-200/60 focus-visible:ring-2 focus-visible:ring-[#78965e]"
            :aria-label="`Close ${area.name}`"
            :title="`Close ${area.name}`"
            @click.stop="handleAreaClose(area.id)"
          >
            <svg
              class="size-3"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M5 5L15 15M15 5L5 15" />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-lg text-stone-400 outline-none transition hover:bg-stone-50 hover:text-stone-700 focus-visible:bg-stone-50 focus-visible:ring-2 focus-visible:ring-[#78965e]"
        aria-label="Add new area"
        title="Add new area"
        @click="emit('add-area')"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M12 5V19M5 12H19" />
        </svg>
      </button>
    </div>

    <div
      class="ml-1 inline-flex shrink-0 rounded-md border border-stone-200 bg-stone-50/80 p-0.5 text-[0.625rem] font-semibold"
      aria-label="View mode"
    >
      <span class="rounded bg-white px-2 py-1 text-stone-700 shadow-sm">
        2D
      </span>
      <span class="w-10 px-1.5 py-1 text-center tabular-nums text-stone-400">
        {{ Math.round(zoom * 100) }}%
      </span>
    </div>
  </div>

  <div
    class="absolute top-[3.75rem] left-3 z-20 grid overflow-hidden rounded-lg border border-stone-200 bg-white/95 shadow-md backdrop-blur"
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
.area-tabs {
  scrollbar-width: none;
}

.area-tabs [role='tab'] {
  cursor: default;
}

.area-tabs::-webkit-scrollbar {
  display: none;
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
</style>
