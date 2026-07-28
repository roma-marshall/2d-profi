<script setup lang="ts">
import { computed } from 'vue'

import DimensionField from './DimensionField.vue'

import { DECKING_LIMITS } from '@/data/decking'
import { woodTextureById, woodTextures } from '@/data/textures'
import type {
  BoardDirection,
  TerraceConfig,
  WoodTextureId,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  expanded: boolean
  edgeOptions: readonly { id: string; label: string; length: number }[]
}>()

const emit = defineEmits<{
  'select-section': []
  'set-texture': [texture: WoodTextureId]
  'set-direction': [direction: BoardDirection]
  'set-board-angle': [angle: number]
  'set-board-width': [width: number]
  'set-board-gap': [gap: number]
  'set-board-offset': [offset: number]
  'set-start-edge': [edgeId: string]
  continue: []
}>()

const selectedTexture = computed(
  () => woodTextureById[props.config.texture],
)

const boardLayoutLabel = computed(() =>
  props.config.boardDirection === 'custom'
    ? `${props.config.decking.angle}° custom`
    : `${props.config.boardDirection} (${props.config.decking.angle}°)`,
)

const boardDirections = [
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Left to right',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    description: 'Top to bottom',
  },
] as const satisfies readonly {
  id: BoardDirection
  label: string
  description: string
}[]
</script>

<template>
  <section class="border-b border-stone-200">
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
        2
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-bold text-stone-900">Decking</span>
        <span class="mt-0.5 block truncate text-[0.6875rem] text-stone-400">
          {{ selectedTexture.label }} · {{ boardLayoutLabel }}
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
      <p class="mb-2.5 text-xs font-bold text-stone-800">
        Wood finish
      </p>

      <div class="space-y-2">
        <button
          v-for="texture in woodTextures"
          :key="texture.id"
          type="button"
          class="group flex w-full items-center gap-3 rounded-lg border p-2 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
          :class="
            config.texture === texture.id
              ? 'border-[#648349] bg-[#eff5e9]'
              : 'border-stone-200 bg-white hover:border-stone-300'
          "
          :aria-pressed="config.texture === texture.id"
          @click="emit('set-texture', texture.id)"
        >
          <span
            class="texture-swatch size-11 shrink-0 rounded-md border border-black/10 shadow-inner"
            :style="{ background: texture.swatch }"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-bold text-stone-900">
              {{ texture.label }}
            </span>
            <span class="mt-0.5 block truncate text-[0.625rem] text-stone-400">
              {{ texture.description }}
            </span>
          </span>
          <span
            class="grid size-5 shrink-0 place-items-center rounded-full border"
            :class="
              config.texture === texture.id
                ? 'border-[#648349] bg-[#648349] text-white'
                : 'border-stone-300 bg-white text-transparent'
            "
            aria-hidden="true"
          >
            ✓
          </span>
        </button>
      </div>

      <div class="my-4 h-px bg-stone-200" aria-hidden="true" />

      <p class="mb-2.5 text-xs font-bold text-stone-800">
        Board direction
      </p>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="direction in boardDirections"
          :key="direction.id"
          type="button"
          class="rounded-lg border p-2.5 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
          :class="
            config.boardDirection === direction.id
              ? 'border-[#648349] bg-[#eff5e9]'
              : 'border-stone-200 bg-white hover:border-stone-300'
          "
          :aria-pressed="config.boardDirection === direction.id"
          @click="emit('set-direction', direction.id)"
        >
          <span
            class="board-preview block h-10 w-full rounded-md border border-stone-900/10 shadow-inner"
            :class="`board-preview--${direction.id}`"
            aria-hidden="true"
          />
          <span class="mt-2 block text-[0.6875rem] font-bold text-stone-900">
            {{ direction.label }}
          </span>
          <span class="block text-[0.625rem] text-stone-400">
            {{ direction.description }}
          </span>
        </button>
      </div>

      <div class="my-4 h-px bg-stone-200" aria-hidden="true" />

      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-xs font-bold text-stone-800">
          Detailed layout
        </p>
        <span
          v-if="config.boardDirection === 'custom'"
          class="rounded-full bg-[#eaf1e4] px-2 py-1 text-[0.5625rem] font-bold text-[#52723b]"
        >
          Custom angle
        </span>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <DimensionField
          id="decking-angle"
          label="Board angle"
          hint="Clockwise rotation from the horizontal axis."
          unit="°"
          :model-value="config.decking.angle"
          :min="DECKING_LIMITS.angle.min"
          :max="DECKING_LIMITS.angle.max"
          :step="1"
          @update:model-value="emit('set-board-angle', $event)"
        />
        <DimensionField
          id="decking-board-width"
          label="Board width"
          hint="Visible face width of one deck board."
          :model-value="config.decking.boardWidth"
          :min="DECKING_LIMITS.boardWidth.min"
          :max="DECKING_LIMITS.boardWidth.max"
          :step="0.1"
          @update:model-value="emit('set-board-width', $event)"
        />
        <DimensionField
          id="decking-board-gap"
          label="Joint gap"
          hint="Spacing between adjacent boards."
          :model-value="config.decking.boardGap"
          :min="DECKING_LIMITS.boardGap.min"
          :max="DECKING_LIMITS.boardGap.max"
          :step="0.1"
          @update:model-value="emit('set-board-gap', $event)"
        />
        <DimensionField
          id="decking-board-offset"
          label="First board offset"
          hint="Shift the board pattern from the selected edge."
          :model-value="config.decking.offset"
          :min="DECKING_LIMITS.offset.min"
          :max="DECKING_LIMITS.offset.max"
          :step="1"
          @update:model-value="emit('set-board-offset', $event)"
        />
      </div>

      <label
        for="decking-start-edge"
        class="mt-4 block text-[0.8125rem] font-semibold text-stone-800"
      >
        Starting edge
      </label>
      <select
        id="decking-start-edge"
        :value="config.decking.startEdgeId"
        class="mt-2 h-11 w-full rounded-lg border border-stone-200 bg-white px-3.5 text-sm font-semibold text-stone-900 outline-none transition hover:border-stone-300 focus:border-[#648349] focus:ring-4 focus:ring-[#e7eedf]"
        @change="
          emit(
            'set-start-edge',
            ($event.currentTarget as HTMLSelectElement).value,
          )
        "
      >
        <option
          v-for="edge in edgeOptions"
          :key="edge.id"
          :value="edge.id"
        >
          {{ edge.label }}
        </option>
      </select>
      <p class="mt-1.5 text-xs leading-5 text-stone-600">
        The board pattern starts relative to this boundary.
      </p>

      <button
        type="button"
        class="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#648349] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#56743e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce8d1]"
        @click="emit('continue')"
      >
        Review plan
      </button>
    </div>
  </section>
</template>

<style scoped>
.texture-swatch {
  background-size: 100% 100%;
}

.board-preview {
  background-color: #c98a51;
}

.board-preview--horizontal {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 8px,
    rgb(98 56 26 / 42%) 8px,
    rgb(98 56 26 / 42%) 9px
  );
}

.board-preview--vertical {
  background-image: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent 10px,
    rgb(98 56 26 / 42%) 10px,
    rgb(98 56 26 / 42%) 11px
  );
}
</style>
