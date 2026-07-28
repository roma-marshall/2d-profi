<script setup lang="ts">
defineProps<{
  areaSquareMeters: number
  footprint: string
  textureLabel: string
  boardLayoutLabel: string
}>()
</script>

<template>
  <dl
    class="grid grid-cols-2 border-t border-stone-200 bg-white sm:grid-cols-4"
  >
    <div class="border-l border-stone-200 px-3.5 py-3">
      <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
        Surface
      </dt>
      <dd class="mt-0.5 text-xs font-extrabold tabular-nums text-stone-900">
        {{ areaSquareMeters.toFixed(2) }} m²
      </dd>
    </div>
    <div class="border-t border-stone-200 px-3.5 py-3 sm:border-t-0 sm:border-l">
      <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
        Footprint
      </dt>
      <dd class="mt-0.5 text-xs font-extrabold tabular-nums text-stone-900">
        {{ footprint }}
      </dd>
    </div>
    <div class="border-t border-l border-stone-200 px-3.5 py-3 sm:border-t-0">
      <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
        Finish
      </dt>
      <dd class="mt-0.5 truncate text-xs font-extrabold text-stone-900">
        {{ textureLabel }}
      </dd>
    </div>
    <div class="px-3.5 py-3">
      <dt class="text-[0.5625rem] font-bold tracking-[0.12em] text-stone-400 uppercase">
        Boards
      </dt>
      <dd class="mt-0.5 text-xs font-extrabold capitalize text-stone-900">
        {{ boardLayoutLabel }}
      </dd>
    </div>
  </dl>
</template>
