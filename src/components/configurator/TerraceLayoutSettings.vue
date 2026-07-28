<script setup lang="ts">
import { computed } from 'vue'

import DimensionField from './DimensionField.vue'

import {
  resolveFieldLimit,
  shapeOptionById,
  shapeOptions,
} from '@/data/shapes'
import {
  FREE_FORM_MAX_EDGE,
  FREE_FORM_MIN_EDGE,
} from '@/geometry/freeForm'
import type {
  TerraceConfig,
  TerraceDimensions,
  TerraceShape,
} from '@/types/terrace'

const props = defineProps<{
  config: TerraceConfig
  activeDimensionKey: string | null
  edgeOptions: readonly { id: string; label: string; length: number }[]
}>()

const emit = defineEmits<{
  'select-shape': [shape: TerraceShape]
  'update-dimension': [payload: { key: string; value: number }]
  'update-free-form-edge': [payload: { edgeId: string; value: number }]
  'activate-dimension': [key: string | null]
  continue: []
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
    value:
      field.getValue?.(dimensionRecord.value) ??
      dimensionRecord.value[field.key] ??
      0,
    min: resolveFieldLimit(field.min, dimensionRecord.value),
    max: resolveFieldLimit(field.max, dimensionRecord.value),
    edgeLabel: field.edgeLabel ?? '',
  })),
)

const shapeIconClass: Record<TerraceShape, string> = {
  rectangle: 'shape-icon--rectangle',
  'l-shape': 'shape-icon--l',
  't-shape': 'shape-icon--t',
  'u-shape': 'shape-icon--u',
  'o-shape': 'shape-icon--o',
  'free-form': 'shape-icon--free',
  circle: 'shape-icon--circle',
}

const updateDimension = (key: string, value: number): void => {
  if (Number.isFinite(value)) {
    emit('update-dimension', { key, value })
  }
}

const activateDimension = (key: string): void => {
  emit('activate-dimension', key)
}
</script>

<template>
  <p class="mb-2.5 text-xs font-bold text-stone-800">
    Select a standard shape
  </p>

  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="option in shapeOptions"
      :key="option.id"
      type="button"
      class="group flex items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
      :class="[
        config.shape === option.id
          ? 'border-[#648349] bg-[#eff5e9] text-[#4d6739] shadow-[inset_0_0_0_1px_rgba(100,131,73,0.12)]'
          : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800',
        option.id === 'free-form'
          ? 'col-span-3 min-h-14 flex-row'
          : 'min-h-20 flex-col',
      ]"
      :aria-pressed="config.shape === option.id"
      :aria-label="`Select ${option.label} terrace`"
      @click="emit('select-shape', option.id)"
    >
      <span
        class="shape-icon"
        :class="shapeIconClass[option.id]"
        aria-hidden="true"
      />
      <span class="text-[0.625rem] font-bold leading-tight">
        {{ option.shortLabel }}
      </span>
    </button>
  </div>

  <p class="mt-3 text-[0.6875rem] leading-4 text-stone-400">
    {{ currentShapeOption.description }}
  </p>

  <div class="my-4 h-px bg-stone-200" aria-hidden="true" />

  <div class="mb-3 flex items-center justify-between gap-3">
    <p class="text-xs font-bold text-stone-800">
      Edge dimensions
    </p>
    <span class="text-[0.625rem] font-semibold text-stone-400">
      centimetres
    </span>
  </div>

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
    <template v-if="config.shape === 'free-form'">
      <DimensionField
        v-for="edge in edgeOptions"
        :id="`terrace-free-form-edge:${edge.id}`"
        :key="`free-form-${edge.id}`"
        :label="`Edge ${edge.id[0]}–${edge.id[1]}`"
        :edge-label="`${edge.id[0]}–${edge.id[1]}`"
        hint="Moves the end vertex along the current edge angle."
        :model-value="edge.length"
        :min="FREE_FORM_MIN_EDGE"
        :max="FREE_FORM_MAX_EDGE"
        :step="1"
        :active="activeDimensionKey === `edge:${edge.id}`"
        @focus="activateDimension(`edge:${edge.id}`)"
        @blur="emit('activate-dimension', null)"
        @update:model-value="
          emit('update-free-form-edge', {
            edgeId: edge.id,
            value: $event,
          })
        "
      />
      <p
        v-if="edgeOptions.length === 0"
        class="rounded-lg border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs leading-5 text-stone-500"
      >
        Add at least three points and close the outline to edit its
        edge lengths.
      </p>
    </template>
    <template v-else>
      <DimensionField
        v-for="field in resolvedFields"
        :id="`terrace-${config.shape}-${field.key}`"
        :key="`${config.shape}-${field.key}`"
        :label="field.label"
        :edge-label="field.edgeLabel"
        :hint="field.hint"
        :model-value="field.value"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        :active="activeDimensionKey === field.key"
        @focus="activateDimension(field.key)"
        @blur="emit('activate-dimension', null)"
        @update:model-value="updateDimension(field.key, $event)"
      />
    </template>
  </div>

  <button
    type="button"
    class="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#648349] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#56743e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce8d1]"
    @click="emit('continue')"
  >
    Continue to decking
  </button>
</template>

<style scoped>
.shape-icon {
  display: block;
  width: 2rem;
  height: 1.5rem;
  color: currentColor;
  background: currentColor;
  opacity: 0.84;
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

.shape-icon--u {
  clip-path: polygon(
    0 0,
    30% 0,
    30% 68%,
    70% 68%,
    70% 0,
    100% 0,
    100% 100%,
    0 100%
  );
}

.shape-icon--o {
  border: 0.32rem solid currentColor;
  background: transparent;
}

.shape-icon--free {
  clip-path: polygon(
    5% 10%,
    92% 0,
    76% 42%,
    98% 86%,
    48% 100%,
    0 72%,
    22% 38%
  );
}

.shape-icon--circle {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 9999px;
}
</style>
