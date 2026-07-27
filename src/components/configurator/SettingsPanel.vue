<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'

import DimensionField from './DimensionField.vue'

import {
  resolveFieldLimit,
  shapeOptionById,
  shapeOptions,
} from '@/data/shapes'
import { DECKING_LIMITS } from '@/data/decking'
import { woodTextureById, woodTextures } from '@/data/textures'
import {
  FREE_FORM_MAX_EDGE,
  FREE_FORM_MIN_EDGE,
} from '@/geometry/freeForm'
import type {
  BoardDirection,
  TerraceConfig,
  TerraceDimensions,
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
}>()

const emit = defineEmits<{
  'select-shape': [shape: TerraceShape]
  'update-dimension': [payload: { key: string; value: number }]
  'update-free-form-edge': [payload: { edgeId: string; value: number }]
  'set-texture': [texture: WoodTextureId]
  'set-direction': [direction: BoardDirection]
  'set-board-angle': [angle: number]
  'set-board-width': [width: number]
  'set-board-gap': [gap: number]
  'set-board-offset': [offset: number]
  'set-start-edge': [edgeId: string]
  'update:active-section': [section: ConfiguratorSection]
  'activate-dimension': [key: string | null]
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
    value:
      field.getValue?.(dimensionRecord.value) ??
      dimensionRecord.value[field.key] ??
      0,
    min: resolveFieldLimit(field.min, dimensionRecord.value),
    max: resolveFieldLimit(field.max, dimensionRecord.value),
    edgeLabel: field.edgeLabel ?? '',
  })),
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

const shapeIconClass: Record<TerraceShape, string> = {
  rectangle: 'shape-icon--rectangle',
  'l-shape': 'shape-icon--l',
  't-shape': 'shape-icon--t',
  'u-shape': 'shape-icon--u',
  'o-shape': 'shape-icon--o',
  'free-form': 'shape-icon--free',
  circle: 'shape-icon--circle',
}

const selectSection = (section: ConfiguratorSection): void => {
  emit('update:active-section', section)
}

const updateDimension = (key: string, value: number): void => {
  if (Number.isFinite(value)) {
    emit('update-dimension', { key, value })
  }
}

const activateDimension = (key: string): void => {
  emit('activate-dimension', key)
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
      <section class="border-b border-stone-200">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-4 text-left outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
          :aria-expanded="activeSection === 'layout'"
          @click="selectSection('layout')"
        >
          <span
            class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold"
            :class="
              activeSection === 'layout'
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
            :class="activeSection === 'layout' ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        <div
          v-show="activeSection === 'layout'"
          class="border-t border-stone-100 bg-[#fcfcfa] px-4 py-4"
        >
          <div
            class="mb-4 grid grid-cols-2 rounded-lg border border-stone-200 bg-stone-100 p-1 text-xs font-semibold"
            role="tablist"
            aria-label="Plan element type"
          >
            <button
              type="button"
              class="rounded-md bg-white px-3 py-2 text-stone-900 shadow-sm"
              role="tab"
              aria-selected="true"
            >
              Terrace
            </button>
            <span
              class="cursor-not-allowed rounded-md px-3 py-2 text-center text-stone-400"
              role="tab"
              aria-selected="false"
              aria-disabled="true"
            >
              Special element
            </span>
          </div>

          <p class="mb-2.5 text-xs font-bold text-stone-800">
            Select a standard shape
          </p>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in shapeOptions"
              :key="option.id"
              type="button"
              class="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-[#e7eedf]"
              :class="
                config.shape === option.id
                  ? 'border-[#648349] bg-[#eff5e9] text-[#4d6739] shadow-[inset_0_0_0_1px_rgba(100,131,73,0.12)]'
                  : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800'
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
            @click="selectSection('decking')"
          >
            Continue to decking
          </button>
        </div>
      </section>

      <section class="border-b border-stone-200">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-4 text-left outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
          :aria-expanded="activeSection === 'decking'"
          @click="selectSection('decking')"
        >
          <span
            class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold"
            :class="
              activeSection === 'decking'
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
            :class="activeSection === 'decking' ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        <div
          v-show="activeSection === 'decking'"
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
            @click="selectSection('summary')"
          >
            Review plan
          </button>
        </div>
      </section>

      <section>
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-4 text-left outline-none hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349]"
          :aria-expanded="activeSection === 'summary'"
          @click="selectSection('summary')"
        >
          <span
            class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold"
            :class="
              activeSection === 'summary'
                ? 'bg-[#648349] text-white'
                : 'bg-stone-100 text-stone-500'
            "
          >
            3
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-stone-900">Plan summary</span>
            <span class="mt-0.5 block text-[0.6875rem] text-stone-400">
              {{ areaLabel }} m² total surface
            </span>
          </span>
          <span
            class="text-lg text-stone-400 transition"
            :class="activeSection === 'summary' ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            ⌄
          </span>
        </button>

        <div
          v-show="activeSection === 'summary'"
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
    </div>

    <footer class="border-t border-stone-200 bg-white p-3">
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

@media (max-width: 1023px) {
  .settings-panel {
    display: block;
  }

  .settings-panel__scroll {
    overflow: visible;
  }
}
</style>
