<script setup lang="ts">
import { computed } from 'vue'

import DimensionField from './DimensionField.vue'

import {
  resolveFieldLimit,
  shapeOptionById,
  shapeOptions,
} from '@/data/shapes'
import { woodTextures } from '@/data/textures'
import type {
  BoardDirection,
  TerraceConfig,
  TerraceDimensions,
  TerraceShape,
  WoodTextureId,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  areaSquareMeters: number
  isSaved: boolean
}>()

const emit = defineEmits<{
  'select-shape': [shape: TerraceShape]
  'update-dimension': [payload: { key: string; value: number }]
  'set-texture': [texture: WoodTextureId]
  'set-direction': [direction: BoardDirection]
  reset: []
}>()

const currentShapeOption = computed(
  () => shapeOptionById[props.config.shape],
)

const dimensionRecord = computed(
  () =>
    props.config.dimensions as TerraceDimensions as unknown as Record<
      string,
      number
    >,
)

const resolvedFields = computed(() =>
  currentShapeOption.value.fields.map((field) => ({
    ...field,
    value: dimensionRecord.value[field.key] ?? 0,
    min: resolveFieldLimit(field.min, dimensionRecord.value),
    max: resolveFieldLimit(field.max, dimensionRecord.value),
  })),
)

const areaLabel = computed(() =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(props.areaSquareMeters),
)

const boardDirections = [
  {
    id: 'horizontal',
    label: 'Horizontal',
    description: 'Boards run left to right.',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    description: 'Boards run top to bottom.',
  },
] as const satisfies readonly {
  id: BoardDirection
  label: string
  description: string
}[]

const shapeIconClass: Record<TerraceShape, string> = {
  rectangle: 'shape-icon--rectangle',
  'l-shape': 'shape-icon--l',
  't-shape': 'shape-icon--t',
  circle: 'shape-icon--circle',
}

const updateDimension = (key: string, value: number): void => {
  if (Number.isFinite(value)) {
    emit('update-dimension', { key, value })
  }
}
</script>

<template>
  <aside
    class="w-full rounded-[1.75rem] border border-white/80 bg-[#fbfaf7] shadow-[0_24px_70px_-32px_rgba(50,43,32,0.35)] lg:h-full lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
    aria-label="Terrace settings"
  >
    <div
      class="sticky top-0 z-10 flex items-start justify-between gap-5 rounded-t-[1.75rem] border-b border-stone-200/70 bg-[#fbfaf7]/95 px-5 py-5 backdrop-blur-md sm:px-6"
    >
      <div>
        <p
          class="mb-1 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-amber-700"
        >
          Configuration
        </p>
        <h2
          class="text-xl font-semibold tracking-[-0.035em] text-stone-900"
        >
          Make it yours
        </h2>
      </div>

      <div
        class="mt-1 inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[0.6875rem] font-semibold"
        :class="
          isSaved
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-stone-200 bg-white text-stone-500'
        "
        aria-live="polite"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isSaved ? 'bg-emerald-500' : 'bg-stone-300'"
          aria-hidden="true"
        />
        {{ isSaved ? 'Saved locally' : 'Not saved' }}
      </div>
    </div>

    <div class="space-y-7 px-5 py-6 sm:px-6">
      <fieldset>
        <legend
          class="mb-3 flex w-full items-center gap-3 text-sm font-semibold tracking-[-0.015em] text-stone-900"
        >
          <span
            class="grid size-6 place-items-center rounded-full bg-stone-900 text-[0.625rem] font-bold text-white"
            aria-hidden="true"
          >
            1
          </span>
          Terrace shape
        </legend>

        <div class="grid grid-cols-2 gap-2.5">
          <button
            v-for="option in shapeOptions"
            :key="option.id"
            type="button"
            class="group flex min-h-24 flex-col items-start justify-between rounded-2xl border p-3 text-left outline-none transition duration-200 focus-visible:ring-4 focus-visible:ring-amber-100"
            :class="
              config.shape === option.id
                ? 'border-amber-700 bg-amber-50/80 text-amber-900 shadow-[inset_0_0_0_1px_rgba(180,83,9,0.12)]'
                : 'border-stone-200 bg-white text-stone-500 hover:-translate-y-0.5 hover:border-stone-300 hover:text-stone-800 hover:shadow-sm'
            "
            :aria-pressed="config.shape === option.id"
            :aria-label="`Select ${option.label} terrace`"
            @click="emit('select-shape', option.id)"
          >
            <span
              class="shape-icon"
              :class="shapeIconClass[option.id]"
              aria-hidden="true"
            />
            <span
              class="mt-3 text-[0.8125rem] font-semibold tracking-[-0.01em]"
            >
              {{ option.shortLabel }}
            </span>
          </button>
        </div>

        <p class="mt-2.5 text-xs leading-5 text-stone-400">
          {{ currentShapeOption.description }}
        </p>
      </fieldset>

      <div class="h-px bg-stone-200/80" aria-hidden="true" />

      <fieldset>
        <legend
          class="mb-4 flex w-full items-center gap-3 text-sm font-semibold tracking-[-0.015em] text-stone-900"
        >
          <span
            class="grid size-6 place-items-center rounded-full bg-stone-900 text-[0.625rem] font-bold text-white"
            aria-hidden="true"
          >
            2
          </span>
          Dimensions
        </legend>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <DimensionField
            v-for="field in resolvedFields"
            :id="`terrace-${config.shape}-${field.key}`"
            :key="`${config.shape}-${field.key}`"
            :label="field.label"
            :hint="field.hint"
            :model-value="field.value"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @update:model-value="updateDimension(field.key, $event)"
          />
        </div>
      </fieldset>

      <div class="h-px bg-stone-200/80" aria-hidden="true" />

      <fieldset>
        <legend
          class="mb-4 flex w-full items-center gap-3 text-sm font-semibold tracking-[-0.015em] text-stone-900"
        >
          <span
            class="grid size-6 place-items-center rounded-full bg-stone-900 text-[0.625rem] font-bold text-white"
            aria-hidden="true"
          >
            3
          </span>
          Wood finish
        </legend>

        <div class="space-y-2.5">
          <button
            v-for="texture in woodTextures"
            :key="texture.id"
            type="button"
            class="group flex w-full items-center gap-3 rounded-2xl border p-2.5 pr-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-amber-100"
            :class="
              config.texture === texture.id
                ? 'border-amber-700 bg-amber-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            "
            :aria-pressed="config.texture === texture.id"
            @click="emit('set-texture', texture.id)"
          >
            <span
              class="relative size-12 shrink-0 overflow-hidden rounded-xl border border-black/10 shadow-inner"
              :style="{ background: texture.swatch }"
              aria-hidden="true"
            >
              <span
                class="absolute inset-x-0 top-1/2 h-px bg-white/30"
              />
              <span
                class="absolute inset-y-0 left-1/3 w-px bg-black/10"
              />
            </span>

            <span class="min-w-0 flex-1">
              <span
                class="block text-[0.8125rem] font-semibold tracking-[-0.01em] text-stone-900"
              >
                {{ texture.label }}
              </span>
              <span
                class="mt-0.5 block truncate text-[0.6875rem] text-stone-400"
              >
                {{ texture.description }}
              </span>
            </span>

            <span
              class="grid size-5 shrink-0 place-items-center rounded-full border transition"
              :class="
                config.texture === texture.id
                  ? 'border-amber-700 bg-amber-700'
                  : 'border-stone-300 bg-white'
              "
              aria-hidden="true"
            >
              <span
                v-if="config.texture === texture.id"
                class="text-[0.7rem] leading-none font-bold text-white"
              >
                ✓
              </span>
            </span>
          </button>
        </div>
      </fieldset>

      <div class="h-px bg-stone-200/80" aria-hidden="true" />

      <fieldset>
        <legend
          class="mb-4 flex w-full items-center gap-3 text-sm font-semibold tracking-[-0.015em] text-stone-900"
        >
          <span
            class="grid size-6 place-items-center rounded-full bg-stone-900 text-[0.625rem] font-bold text-white"
            aria-hidden="true"
          >
            4
          </span>
          Board direction
        </legend>

        <div class="grid grid-cols-2 gap-2.5">
          <button
            v-for="direction in boardDirections"
            :key="direction.id"
            type="button"
            class="rounded-2xl border p-3 text-left outline-none transition focus-visible:ring-4 focus-visible:ring-amber-100"
            :class="
              config.boardDirection === direction.id
                ? 'border-amber-700 bg-amber-50/70'
                : 'border-stone-200 bg-white hover:border-stone-300'
            "
            :aria-pressed="config.boardDirection === direction.id"
            @click="emit('set-direction', direction.id)"
          >
            <span
              class="board-preview block h-11 w-full rounded-lg border border-stone-900/10 shadow-inner"
              :class="`board-preview--${direction.id}`"
              aria-hidden="true"
            />
            <span
              class="mt-2.5 block text-[0.8125rem] font-semibold text-stone-900"
            >
              {{ direction.label }}
            </span>
            <span
              class="mt-0.5 block text-[0.6875rem] leading-4 text-stone-400"
            >
              {{ direction.description }}
            </span>
          </button>
        </div>
      </fieldset>

      <section
        class="rounded-2xl bg-stone-900 p-4 text-white shadow-[0_18px_38px_-24px_rgba(28,25,23,0.9)]"
        aria-labelledby="configuration-summary-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p
              id="configuration-summary-title"
              class="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-stone-400"
            >
              Current terrace
            </p>
            <p class="mt-1 text-sm font-semibold">
              {{ currentShapeOption.label }}
            </p>
          </div>
          <div class="text-right" aria-live="polite">
            <p class="text-2xl font-semibold tracking-[-0.04em] tabular-nums">
              {{ areaLabel }}
            </p>
            <p class="text-[0.6875rem] font-medium text-stone-400">
              square metres
            </p>
          </div>
        </div>

        <div class="my-4 h-px bg-white/10" aria-hidden="true" />

        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-stone-200 outline-none transition hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-4 focus-visible:ring-white/15"
          @click="emit('reset')"
        >
          <span class="text-base leading-none" aria-hidden="true">↺</span>
          Reset configuration
        </button>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.shape-icon {
  display: block;
  width: 2.25rem;
  height: 1.75rem;
  color: inherit;
  background: currentColor;
  opacity: 0.82;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

button:hover .shape-icon {
  opacity: 1;
  transform: scale(1.04);
}

.shape-icon--rectangle {
  clip-path: polygon(0 7%, 100% 7%, 100% 93%, 0 93%);
}

.shape-icon--l {
  clip-path: polygon(0 0, 100% 0, 100% 44%, 48% 44%, 48% 100%, 0 100%);
}

.shape-icon--t {
  clip-path: polygon(
    0 0,
    100% 0,
    100% 38%,
    66% 38%,
    66% 100%,
    34% 100%,
    34% 38%,
    0 38%
  );
}

.shape-icon--circle {
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 9999px;
}

.board-preview {
  background-color: #c98a51;
}

.board-preview--horizontal {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 9px,
    rgb(98 56 26 / 42%) 9px,
    rgb(98 56 26 / 42%) 10px
  );
}

.board-preview--vertical {
  background-image: repeating-linear-gradient(
    to right,
    transparent 0,
    transparent 11px,
    rgb(98 56 26 / 42%) 11px,
    rgb(98 56 26 / 42%) 12px
  );
}
</style>
