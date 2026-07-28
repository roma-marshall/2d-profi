<script setup lang="ts">
import type { Point, WoodTexture } from '@/types/terrace'

defineProps<{
  patternId: string
  origin: Point
  width: number
  height: number
  patternTransform: string
  boardWidth: number
  texture: WoodTexture
  grainPath: string
  secondaryGrainPath: string
}>()
</script>

<template>
  <pattern
    :id="patternId"
    patternUnits="userSpaceOnUse"
    :x="origin.x"
    :y="origin.y"
    :width="width"
    :height="height"
    :patternTransform="patternTransform"
  >
    <rect
      x="0"
      y="0"
      :width="width"
      :height="height"
      :fill="texture.grainColor"
      opacity="0.7"
    />
    <rect
      x="0"
      y="0"
      :width="width"
      :height="boardWidth"
      :fill="texture.baseColor"
    />
    <rect
      x="0"
      y="0"
      :width="width"
      :height="boardWidth * 0.47"
      :fill="texture.secondaryColor"
      opacity="0.22"
    />
    <path
      :d="grainPath"
      fill="none"
      :stroke="texture.grainColor"
      stroke-linecap="round"
      stroke-opacity="0.27"
      stroke-width="0.9"
      vector-effect="non-scaling-stroke"
    />
    <path
      :d="secondaryGrainPath"
      fill="none"
      :stroke="texture.secondaryColor"
      stroke-linecap="round"
      stroke-opacity="0.4"
      stroke-width="0.8"
      vector-effect="non-scaling-stroke"
    />
  </pattern>
</template>
