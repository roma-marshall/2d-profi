<script setup lang="ts">
import { computed } from 'vue'

import DimensionField from './DimensionField.vue'

import {
  SPECIAL_ELEMENT_LIMITS,
  specialElementOptionById,
  specialElementOptions,
} from '@/data/specialElements'
import type {
  GeometryBounds,
  SpecialElementPatch,
  SpecialElementType,
  TerraceConfig,
} from '@/types/terrace'

interface SpecialElementField {
  key: string
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
}

const props = defineProps<{
  config: TerraceConfig
  planBounds: GeometryBounds
  activeSpecialElementId: string | null
}>()

const emit = defineEmits<{
  'add-special-element': [type: SpecialElementType]
  'select-special-element': [id: string | null]
  'update-special-element': [
    payload: { id: string; patch: SpecialElementPatch },
  ]
  'remove-special-element': [id: string]
}>()

const selectedSpecialElement = computed(
  () =>
    props.config.specialElements.find(
      (element) => element.id === props.activeSpecialElementId,
    ) ?? null,
)

const selectedSpecialOption = computed(() => {
  const element = selectedSpecialElement.value
  return element === null ? null : specialElementOptionById[element.type]
})

const selectedSpecialFields = computed<SpecialElementField[]>(() => {
  const element = selectedSpecialElement.value
  if (element === null) {
    return []
  }

  switch (element.type) {
    case 'house-wall':
      return [
        {
          key: 'length',
          label: 'Wall length',
          hint: 'Total visible wall length.',
          value: element.dimensions.length,
          ...SPECIAL_ELEMENT_LIMITS.length,
          step: 10,
        },
        {
          key: 'thickness',
          label: 'Wall thickness',
          hint: 'Visible thickness on the plan.',
          value: element.dimensions.thickness,
          ...SPECIAL_ELEMENT_LIMITS.thickness,
          step: 1,
        },
      ]
    case 'rect-cutout':
      return [
        {
          key: 'width',
          label: 'Cutout width',
          hint: 'Horizontal size before rotation.',
          value: element.dimensions.width,
          ...SPECIAL_ELEMENT_LIMITS.width,
          step: 10,
        },
        {
          key: 'depth',
          label: 'Cutout depth',
          hint: 'Vertical size before rotation.',
          value: element.dimensions.depth,
          ...SPECIAL_ELEMENT_LIMITS.depth,
          step: 10,
        },
      ]
    case 'circle-cutout':
      return [
        {
          key: 'diameter',
          label: 'Cutout diameter',
          hint: 'Full diameter of the circular opening.',
          value: element.dimensions.diameter,
          ...SPECIAL_ELEMENT_LIMITS.diameter,
          step: 10,
        },
      ]
    case 'stairs':
      return [
        {
          key: 'width',
          label: 'Stair width',
          hint: 'Overall stair width.',
          value: element.dimensions.width,
          ...SPECIAL_ELEMENT_LIMITS.width,
          step: 10,
        },
        {
          key: 'depth',
          label: 'Stair depth',
          hint: 'Overall stair projection.',
          value: element.dimensions.depth,
          ...SPECIAL_ELEMENT_LIMITS.depth,
          step: 10,
        },
        {
          key: 'steps',
          label: 'Step count',
          hint: 'Number of visible stair treads.',
          value: element.dimensions.steps,
          ...SPECIAL_ELEMENT_LIMITS.steps,
          step: 1,
          unit: 'steps',
        },
      ]
  }
})

const updateSelectedSpecialElement = (
  patch: SpecialElementPatch,
): void => {
  const element = selectedSpecialElement.value
  if (element !== null) {
    emit('update-special-element', { id: element.id, patch })
  }
}

const specialElementInstanceLabel = (id: string): string => {
  const element = props.config.specialElements.find(
    (candidate) => candidate.id === id,
  )
  if (element === undefined) {
    return 'Special element'
  }

  const instance = props.config.specialElements
    .filter((candidate) => candidate.type === element.type)
    .findIndex((candidate) => candidate.id === id)
  return `${specialElementOptionById[element.type].shortLabel} ${instance + 1}`
}
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div>
      <p class="text-xs font-bold text-stone-800">
        Add a special element
      </p>
      <p class="mt-1 text-[0.6875rem] leading-4 text-stone-400">
        Elements snap to the grid and must stay inside the terrace.
      </p>
    </div>
    <span class="text-[0.625rem] font-semibold text-stone-400">
      {{ config.specialElements.length }}/{{ SPECIAL_ELEMENT_LIMITS.count }}
    </span>
  </div>

  <div class="mt-3 grid grid-cols-2 gap-2">
    <button
      v-for="option in specialElementOptions"
      :key="option.id"
      type="button"
      class="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-3 text-center text-stone-500 outline-none transition hover:border-stone-300 hover:text-stone-800 focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
      :aria-label="`Add ${option.label}`"
      @click="emit('add-special-element', option.id)"
    >
      <span
        class="special-element-icon"
        :class="`special-element-icon--${option.id}`"
        aria-hidden="true"
      />
      <span class="text-[0.6875rem] font-bold leading-tight">
        {{ option.shortLabel }}
      </span>
      <span
        v-if="option.affectsArea"
        class="text-[0.5625rem] font-semibold text-[#648349]"
      >
        subtracts area
      </span>
    </button>
  </div>

  <template v-if="config.specialElements.length > 0">
    <div class="my-4 h-px bg-stone-200" aria-hidden="true" />

    <div class="mb-2 flex items-center justify-between gap-3">
      <p class="text-xs font-bold text-stone-800">
        Elements on plan
      </p>
      <span class="text-[0.625rem] text-stone-400">
        Select to edit
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="element in config.specialElements"
        :key="element.id"
        type="button"
        class="rounded-lg border px-3 py-2.5 text-left text-xs font-bold outline-none transition focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
        :class="
          activeSpecialElementId === element.id
            ? 'border-[#648349] bg-[#eff5e9] text-[#4d6739]'
            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
        "
        :aria-pressed="activeSpecialElementId === element.id"
        @click="emit('select-special-element', element.id)"
      >
        {{ specialElementInstanceLabel(element.id) }}
      </button>
    </div>
  </template>

  <template v-if="selectedSpecialElement && selectedSpecialOption">
    <div class="my-4 h-px bg-stone-200" aria-hidden="true" />

    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-bold text-stone-800">
          {{ selectedSpecialOption.label }}
        </p>
        <p class="mt-1 text-[0.6875rem] leading-4 text-stone-400">
          {{ selectedSpecialOption.description }}
        </p>
      </div>
      <span
        v-if="selectedSpecialOption.affectsArea"
        class="shrink-0 rounded-full bg-[#eaf1e4] px-2 py-1 text-[0.5625rem] font-bold text-[#52723b]"
      >
        Cutout
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      <DimensionField
        :id="`special-${selectedSpecialElement.id}-x`"
        label="Center X"
        hint="Horizontal center position on the plan."
        :model-value="selectedSpecialElement.position.x"
        :min="Math.floor(planBounds.x)"
        :max="Math.ceil(planBounds.x + planBounds.width)"
        :step="10"
        @update:model-value="
          updateSelectedSpecialElement({
            position: {
              x: $event,
              y: selectedSpecialElement.position.y,
            },
          })
        "
      />
      <DimensionField
        :id="`special-${selectedSpecialElement.id}-y`"
        label="Center Y"
        hint="Vertical center position on the plan."
        :model-value="selectedSpecialElement.position.y"
        :min="Math.floor(planBounds.y)"
        :max="Math.ceil(planBounds.y + planBounds.height)"
        :step="10"
        @update:model-value="
          updateSelectedSpecialElement({
            position: {
              x: selectedSpecialElement.position.x,
              y: $event,
            },
          })
        "
      />
      <DimensionField
        :id="`special-${selectedSpecialElement.id}-rotation`"
        label="Rotation"
        hint="Clockwise rotation around the element centre."
        unit="°"
        :model-value="selectedSpecialElement.rotation"
        :min="SPECIAL_ELEMENT_LIMITS.rotation.min"
        :max="SPECIAL_ELEMENT_LIMITS.rotation.max"
        :step="1"
        @update:model-value="
          updateSelectedSpecialElement({ rotation: $event })
        "
      />
      <DimensionField
        v-for="field in selectedSpecialFields"
        :id="`special-${selectedSpecialElement.id}-${field.key}`"
        :key="`${selectedSpecialElement.id}-${field.key}`"
        :label="field.label"
        :hint="field.hint"
        :unit="field.unit"
        :model-value="field.value"
        :min="field.min"
        :max="field.max"
        :step="field.step"
        @update:model-value="
          updateSelectedSpecialElement({
            dimensions: { [field.key]: $event },
          })
        "
      />
    </div>

    <button
      type="button"
      class="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
      @click="emit('remove-special-element', selectedSpecialElement.id)"
    >
      Remove element
    </button>
  </template>

  <p
    v-else-if="config.specialElements.length > 0"
    class="mt-4 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs leading-5 text-stone-500"
  >
    Select an element above or directly on the plan to edit it.
  </p>
</template>

<style scoped>
.special-element-icon {
  position: relative;
  display: block;
  width: 2.25rem;
  height: 1.65rem;
  color: currentColor;
}

.special-element-icon--house-wall {
  height: 0.65rem;
  border: 2px solid currentColor;
  background:
    linear-gradient(
      135deg,
      transparent 0 42%,
      currentColor 43% 52%,
      transparent 53% 100%
    );
}

.special-element-icon--rect-cutout {
  border: 2px dashed currentColor;
  background: rgb(100 131 73 / 8%);
}

.special-element-icon--circle-cutout {
  width: 1.65rem;
  border: 2px dashed currentColor;
  border-radius: 9999px;
  background: rgb(100 131 73 / 8%);
}

.special-element-icon--stairs {
  border: 2px solid currentColor;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 5px,
    currentColor 5px,
    currentColor 6px
  );
}
</style>
