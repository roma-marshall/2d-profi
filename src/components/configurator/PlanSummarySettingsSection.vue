<script setup lang="ts">
import { computed } from 'vue'

import { shapeOptionById } from '@/data/shapes'
import { woodTextureById } from '@/data/textures'
import type { TerraceConfig } from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  areaSquareMeters: number
  isSaved: boolean
  expanded: boolean
}>()

const emit = defineEmits<{
  'select-section': []
}>()

const currentShapeOption = computed(
  () => shapeOptionById[props.config.shape],
)

const areaLabel = computed(() =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(props.areaSquareMeters),
)

const selectedTexture = computed(
  () => woodTextureById[props.config.texture],
)

const boardLayoutLabel = computed(() =>
  props.config.boardDirection === 'custom'
    ? `${props.config.decking.angle}° custom`
    : `${props.config.boardDirection} (${props.config.decking.angle}°)`,
)

const estimatedLinearMeters = computed(
  () =>
    (props.areaSquareMeters * 1.1) /
    (props.config.decking.boardWidth / 100),
)

const estimatedThreeMeterBoards = computed(() =>
  Math.ceil(estimatedLinearMeters.value / 3),
)
</script>

<template>
  <section>
    <button
      type="button"
      class="flex w-full items-center gap-3 px-4 py-4 text-left outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
      :aria-expanded="expanded"
      @click="emit('select-section')"
    >
      <span
        class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold"
        :class="
          expanded
            ? 'bg-[#648349] text-white'
            : 'bg-stone-100 text-stone-500'
        "
      >
        3
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-bold text-stone-900">
          Plan summary
        </span>
        <span class="mt-0.5 block text-[0.6875rem] text-stone-400">
          {{ areaLabel }} m² total surface
        </span>
      </span>
      <span
        class="text-lg text-stone-400 transition"
        :class="expanded ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        ⌄
      </span>
    </button>

    <div
      v-show="expanded"
      class="border-t border-stone-100 bg-[#fcfcfa] px-4 py-4"
    >
      <div class="overflow-hidden rounded-lg border border-stone-200 bg-white">
        <dl class="divide-y divide-stone-100 text-xs">
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Shape</dt>
            <dd class="font-bold text-stone-900">
              {{ currentShapeOption.label }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Surface</dt>
            <dd class="font-bold tabular-nums text-stone-900">
              {{ areaLabel }} m²
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Special elements</dt>
            <dd class="font-bold tabular-nums text-stone-900">
              {{ config.specialElements.length }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Finish</dt>
            <dd class="font-bold text-stone-900">
              {{ selectedTexture.label }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Direction</dt>
            <dd class="font-bold text-stone-900">
              {{ boardLayoutLabel }}
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Board width / gap</dt>
            <dd class="font-bold tabular-nums text-stone-900">
              {{ config.decking.boardWidth }} / {{ config.decking.boardGap }} cm
            </dd>
          </div>
          <div class="flex items-center justify-between gap-4 px-3 py-2.5">
            <dt class="text-stone-400">Estimated 3 m boards</dt>
            <dd class="font-bold tabular-nums text-stone-900">
              ≈ {{ estimatedThreeMeterBoards }}
            </dd>
          </div>
        </dl>
      </div>

      <p class="mt-3 text-[0.625rem] leading-4 text-stone-500">
        {{
          isSaved
            ? 'The configuration is stored automatically in this browser.'
            : 'Local storage is unavailable. Keep this page open to retain the current plan.'
        }}
      </p>
    </div>
  </section>
</template>
