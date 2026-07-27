<script setup lang="ts">
import { computed } from 'vue'

import SettingsPanel from '@/components/configurator/SettingsPanel.vue'
import TerracePreview from '@/components/configurator/TerracePreview.vue'
import { useTerraceConfig } from '@/composables/useTerraceConfig'
import { shapeOptionById } from '@/data/shapes'
import { woodTextureById } from '@/data/textures'
import { createTerraceGeometry } from '@/geometry/registry'
import type { TerraceDimensions } from '@/types/terrace'

const {
  config,
  areaSquareMeters,
  isSaved,
  selectShape,
  updateDimension,
  setTexture,
  setBoardDirection,
  resetConfig,
} = useTerraceConfig()

const shapeLabel = computed(() => shapeOptionById[config.value.shape].label)
const textureLabel = computed(
  () => woodTextureById[config.value.texture].label,
)
const geometry = computed(() =>
  createTerraceGeometry(
    config.value.shape,
    config.value.dimensions as TerraceDimensions,
  ),
)
const footprint = computed(
  () =>
    `${Math.round(geometry.value.bounds.width)} × ${Math.round(
      geometry.value.bounds.height,
    )} cm`,
)

const handleDimensionUpdate = ({
  key,
  value,
}: {
  key: string
  value: number
}): void => {
  updateDimension(key, value)
}
</script>

<template>
  <div class="app-shell min-h-dvh text-[#24241f]">
    <header
      class="border-b border-black/8 bg-[#f5f3ed]/90 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-[1560px] items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8"
      >
        <div class="min-w-0">
          <p
            class="mb-1 text-[10px] font-semibold tracking-[0.24em] text-[#587064] uppercase"
          >
            Plan · proportion · material
          </p>
          <h1
            class="truncate font-display text-[clamp(1.4rem,2.4vw,2rem)] leading-none tracking-[-0.025em]"
          >
            2D Terrace Configurator
          </h1>
        </div>

        <div
          class="hidden items-center gap-2 rounded-full border border-black/8 bg-white/55 px-3 py-2 text-xs font-medium text-black/55 sm:flex"
          aria-live="polite"
        >
          <span
            class="size-1.5 rounded-full"
            :class="isSaved ? 'bg-[#587064]' : 'bg-black/25'"
            aria-hidden="true"
          />
          {{ isSaved ? 'Stored on this device' : 'Local storage unavailable' }}
        </div>
      </div>
    </header>

    <main
      class="mx-auto grid max-w-[1560px] items-start gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8"
    >
      <section
        class="min-w-0 overflow-hidden rounded-[24px] border border-black/8 bg-[#e8e5dc] shadow-[0_24px_70px_rgba(52,48,39,0.08)] sm:rounded-[30px]"
        aria-labelledby="preview-heading"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-4 py-3.5 sm:px-6 sm:py-4"
        >
          <div class="flex items-center gap-3">
            <span
              class="grid size-8 place-items-center rounded-full border border-black/10 bg-[#f8f6f1] text-[10px] font-semibold tracking-wider text-black/45"
              aria-hidden="true"
            >
              01
            </span>
            <div>
              <p
                id="preview-heading"
                class="text-sm font-semibold tracking-[-0.01em]"
              >
                Plan preview
              </p>
              <p class="text-[11px] text-black/45">
                Live top view · dimensions in cm
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span
              class="rounded-full border border-black/8 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-black/60"
            >
              {{ shapeLabel }}
            </span>
            <span
              class="hidden rounded-full border border-black/8 bg-white/35 px-3 py-1.5 text-[11px] font-medium text-black/45 sm:inline"
            >
              Auto-fit
            </span>
          </div>
        </div>

        <TerracePreview :config="config" />

        <dl
          class="grid grid-cols-2 divide-x divide-black/8 border-t border-black/8 bg-[#f2f0e9]/75 sm:grid-cols-4"
        >
          <div class="px-4 py-3.5 sm:px-5">
            <dt class="text-[10px] font-semibold tracking-[0.16em] text-black/40 uppercase">
              Surface
            </dt>
            <dd class="mt-1 text-sm font-semibold tabular-nums">
              {{ areaSquareMeters.toFixed(2) }} m²
            </dd>
          </div>
          <div class="px-4 py-3.5 sm:px-5">
            <dt class="text-[10px] font-semibold tracking-[0.16em] text-black/40 uppercase">
              Footprint
            </dt>
            <dd class="mt-1 text-sm font-semibold tabular-nums">
              {{ footprint }}
            </dd>
          </div>
          <div class="border-t border-black/8 px-4 py-3.5 sm:border-t-0 sm:px-5">
            <dt class="text-[10px] font-semibold tracking-[0.16em] text-black/40 uppercase">
              Timber
            </dt>
            <dd class="mt-1 truncate text-sm font-semibold">
              {{ textureLabel }}
            </dd>
          </div>
          <div class="border-t border-black/8 px-4 py-3.5 sm:border-t-0 sm:px-5">
            <dt class="text-[10px] font-semibold tracking-[0.16em] text-black/40 uppercase">
              Boards
            </dt>
            <dd class="mt-1 text-sm font-semibold capitalize">
              {{ config.boardDirection }}
            </dd>
          </div>
        </dl>
      </section>

      <SettingsPanel
        :config="config"
        :area-square-meters="areaSquareMeters"
        :is-saved="isSaved"
        class="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto"
        @select-shape="selectShape"
        @update-dimension="handleDimensionUpdate"
        @set-texture="setTexture"
        @set-direction="setBoardDirection"
        @reset="resetConfig"
      />
    </main>

    <footer
      class="mx-auto flex max-w-[1560px] flex-col gap-1 px-5 pb-6 text-[11px] text-black/40 sm:flex-row sm:items-center sm:justify-between sm:px-8"
    >
      <p>Concept dimensions only. Confirm measurements before construction.</p>
      <p>Configuration saves automatically.</p>
    </footer>
  </div>
</template>
