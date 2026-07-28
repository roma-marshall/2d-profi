<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import DeckingSettingsSection from './DeckingSettingsSection.vue'
import LayoutSettingsSection from './LayoutSettingsSection.vue'
import PlanSummarySettingsSection from './PlanSummarySettingsSection.vue'
import type {
  BoardDirection,
  GeometryBounds,
  SpecialElementPatch,
  SpecialElementType,
  TerraceConfig,
  TerraceShape,
  WoodTextureId,
} from '@/types/terrace'

type ConfiguratorSection = 'layout' | 'decking' | 'summary'

const props = defineProps<{
  config: TerraceConfig
  areaSquareMeters: number
  isSaved: boolean
  activeSection: ConfiguratorSection
  activeDimensionKey: string | null
  edgeOptions: readonly { id: string; label: string; length: number }[]
  planBounds: GeometryBounds
  activeSpecialElementId: string | null
}>()

const emit = defineEmits<{
  'select-shape': [shape: TerraceShape]
  'update-dimension': [payload: { key: string; value: number }]
  'update-free-form-edge': [payload: { edgeId: string; value: number }]
  'add-special-element': [type: SpecialElementType]
  'select-special-element': [id: string | null]
  'update-special-element': [
    payload: { id: string; patch: SpecialElementPatch },
  ]
  'remove-special-element': [id: string]
  'set-texture': [texture: WoodTextureId]
  'set-direction': [direction: BoardDirection]
  'set-board-angle': [angle: number]
  'set-board-width': [width: number]
  'set-board-gap': [gap: number]
  'set-board-offset': [offset: number]
  'set-start-edge': [edgeId: string]
  'update:active-section': [section: ConfiguratorSection]
  'activate-dimension': [key: string | null]
  'open-summary': []
  reset: []
}>()

type PlanElementMode = 'terrace' | 'special-elements'

const planElementMode = ref<PlanElementMode>('terrace')

const selectSection = (section: ConfiguratorSection): void => {
  emit('update:active-section', section)
}

const selectPlanElementMode = (mode: PlanElementMode): void => {
  planElementMode.value = mode
  emit('activate-dimension', null)
  if (mode === 'terrace') {
    emit('select-special-element', null)
  }
}

watch(
  () => props.activeDimensionKey,
  async (key) => {
    if (key === null) {
      return
    }

    await nextTick()
    const input = document.getElementById(
      `terrace-${props.config.shape}-${key}`,
    )

    if (input instanceof HTMLInputElement && document.activeElement !== input) {
      input.focus({ preventScroll: true })
      input.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  },
)

watch(
  () => props.activeSpecialElementId,
  (id) => {
    if (id !== null) {
      planElementMode.value = 'special-elements'
    }
  },
)
</script>

<template>
  <aside
    class="settings-panel w-full overflow-hidden border border-stone-200 bg-white shadow-[0_16px_45px_rgba(29,35,26,0.08)] lg:h-full"
    aria-label="Terrace settings"
  >
    <header
      class="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 py-3.5"
    >
      <div>
        <p class="text-[0.625rem] font-bold tracking-[0.15em] text-[#648349] uppercase">
          Configuration
        </p>
        <h2 class="mt-0.5 text-base font-bold tracking-[-0.02em] text-stone-900">
          Terrace settings
        </h2>
      </div>

      <div
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.625rem] font-semibold"
        :class="
          isSaved
            ? 'border-[#d8e4cd] bg-[#f2f7ed] text-[#587441]'
            : 'border-stone-200 bg-stone-50 text-stone-500'
        "
        aria-live="polite"
      >
        <span
          class="size-1.5 rounded-full"
          :class="isSaved ? 'bg-[#648349]' : 'bg-stone-300'"
          aria-hidden="true"
        />
        {{ isSaved ? 'Saved locally' : 'Not saved' }}
      </div>
    </header>

    <div class="settings-panel__scroll">
      <LayoutSettingsSection
        :config="config"
        :expanded="activeSection === 'layout'"
        :plan-element-mode="planElementMode"
        :active-dimension-key="activeDimensionKey"
        :edge-options="edgeOptions"
        :plan-bounds="planBounds"
        :active-special-element-id="activeSpecialElementId"
        @select-section="selectSection('layout')"
        @select-plan-element-mode="selectPlanElementMode"
        @select-shape="emit('select-shape', $event)"
        @update-dimension="emit('update-dimension', $event)"
        @update-free-form-edge="emit('update-free-form-edge', $event)"
        @add-special-element="emit('add-special-element', $event)"
        @select-special-element="emit('select-special-element', $event)"
        @update-special-element="emit('update-special-element', $event)"
        @remove-special-element="emit('remove-special-element', $event)"
        @activate-dimension="emit('activate-dimension', $event)"
        @continue="selectSection('decking')"
      />

      <DeckingSettingsSection
        :config="config"
        :expanded="activeSection === 'decking'"
        :edge-options="edgeOptions"
        @select-section="selectSection('decking')"
        @set-texture="emit('set-texture', $event)"
        @set-direction="emit('set-direction', $event)"
        @set-board-angle="emit('set-board-angle', $event)"
        @set-board-width="emit('set-board-width', $event)"
        @set-board-gap="emit('set-board-gap', $event)"
        @set-board-offset="emit('set-board-offset', $event)"
        @set-start-edge="emit('set-start-edge', $event)"
        @continue="selectSection('summary')"
      />

      <PlanSummarySettingsSection
        :config="config"
        :area-square-meters="areaSquareMeters"
        :is-saved="isSaved"
        :expanded="activeSection === 'summary'"
        @select-section="selectSection('summary')"
      />
    </div>

    <footer class="space-y-2 border-t border-stone-200 bg-white p-3">
      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#648349] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#56743e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dce8d1]"
        aria-label="Open plan review and export options"
        @click="emit('open-summary')"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M8 10H21M3 14H21M8 18H21M3 6H21" />
        </svg>
        Review &amp; export
      </button>
      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-100"
        @click="emit('reset')"
      >
        <span class="text-base leading-none" aria-hidden="true">↺</span>
        Reset configuration
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
}

.settings-panel__scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: #c9c9c1 transparent;
  scrollbar-width: thin;
}

@media (max-width: 1023px) {
  .settings-panel {
    display: block;
  }

  .settings-panel__scroll {
    overflow: visible;
  }
}
</style>
