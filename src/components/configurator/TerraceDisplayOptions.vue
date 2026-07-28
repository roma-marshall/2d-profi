<script setup lang="ts">
defineProps<{
  showDecking: boolean
  showDimensions: boolean
  showGrid: boolean
}>()

const emit = defineEmits<{
  'toggle-decking': []
  'toggle-dimensions': []
  'toggle-grid': []
}>()
</script>

<template>
  <div
    class="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-1 overflow-x-auto rounded-lg border border-stone-200 bg-white/95 p-1 shadow-md backdrop-blur"
    aria-label="Plan display options"
  >
    <button
      type="button"
      class="display-toggle"
      :class="{ 'display-toggle--active': showDecking }"
      :aria-pressed="showDecking"
      @click="emit('toggle-decking')"
    >
      Decking
    </button>
    <button
      type="button"
      class="display-toggle"
      :class="{ 'display-toggle--active': showDimensions }"
      :aria-pressed="showDimensions"
      @click="emit('toggle-dimensions')"
    >
      Dimensions
    </button>
    <button
      type="button"
      class="display-toggle"
      :class="{ 'display-toggle--active': showGrid }"
      :aria-pressed="showGrid"
      @click="emit('toggle-grid')"
    >
      Grid
    </button>
  </div>
</template>

<style scoped>
.display-toggle {
  flex: none;
  border-radius: 0.35rem;
  padding: 0.45rem 0.7rem;
  color: #787870;
  font-size: 0.625rem;
  font-weight: 750;
  line-height: 1;
  outline: none;
}

.display-toggle:hover {
  background: #f5f5f2;
  color: #34342f;
}

.display-toggle:focus-visible {
  box-shadow: 0 0 0 2px #648349;
}

.display-toggle--active {
  background: #eaf1e4;
  color: #52723b;
}
</style>
