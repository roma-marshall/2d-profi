<script setup lang="ts">
import SpecialElementsSettings from './SpecialElementsSettings.vue'
import TerraceLayoutSettings from './TerraceLayoutSettings.vue'

import type {
  GeometryBounds,
  SpecialElementPatch,
  SpecialElementType,
  TerraceConfig,
  TerraceShape,
} from '@/types/terrace'

type PlanElementMode = 'terrace' | 'special-elements'

const props = defineProps<{
  config: TerraceConfig
  expanded: boolean
  planElementMode: PlanElementMode
  activeDimensionKey: string | null
  edgeOptions: readonly { id: string; label: string; length: number }[]
  planBounds: GeometryBounds
  activeSpecialElementId: string | null
}>()

const emit = defineEmits<{
  'select-section': []
  'select-plan-element-mode': [mode: PlanElementMode]
  'select-shape': [shape: TerraceShape]
  'update-dimension': [payload: { key: string; value: number }]
  'update-free-form-edge': [payload: { edgeId: string; value: number }]
  'add-special-element': [type: SpecialElementType]
  'select-special-element': [id: string | null]
  'update-special-element': [
    payload: { id: string; patch: SpecialElementPatch },
  ]
  'remove-special-element': [id: string]
  'activate-dimension': [key: string | null]
  continue: []
}>()
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
        1
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-bold text-stone-900">
          Floor plan
        </span>
        <span class="mt-0.5 block truncate text-[0.6875rem] text-stone-400">
          Shape and edge dimensions
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
      <div
        class="mb-4 grid grid-cols-2 rounded-lg border border-stone-200 bg-stone-100 p-1 text-xs font-semibold"
        role="tablist"
        aria-label="Plan element type"
      >
        <button
          type="button"
          class="rounded-md px-3 py-2 transition"
          :class="
            planElementMode === 'terrace'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-400 hover:text-stone-700'
          "
          role="tab"
          :aria-selected="planElementMode === 'terrace'"
          @click="emit('select-plan-element-mode', 'terrace')"
        >
          Terrace
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 transition"
          :class="
            planElementMode === 'special-elements'
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-400 hover:text-stone-700'
          "
          role="tab"
          :aria-selected="planElementMode === 'special-elements'"
          @click="emit('select-plan-element-mode', 'special-elements')"
        >
          Special element
        </button>
      </div>

      <TerraceLayoutSettings
        v-if="planElementMode === 'terrace'"
        :config="config"
        :active-dimension-key="activeDimensionKey"
        :edge-options="edgeOptions"
        @select-shape="emit('select-shape', $event)"
        @update-dimension="emit('update-dimension', $event)"
        @update-free-form-edge="emit('update-free-form-edge', $event)"
        @activate-dimension="emit('activate-dimension', $event)"
        @continue="emit('continue')"
      />

      <SpecialElementsSettings
        v-else
        :config="config"
        :plan-bounds="planBounds"
        :active-special-element-id="activeSpecialElementId"
        @add-special-element="emit('add-special-element', $event)"
        @select-special-element="emit('select-special-element', $event)"
        @update-special-element="emit('update-special-element', $event)"
        @remove-special-element="emit('remove-special-element', $event)"
      />
    </div>
  </section>
</template>
