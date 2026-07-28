<script setup lang="ts">
defineProps<{
  isClosed: boolean
  vertexCount: number
  maxVertices: number
}>()

const emit = defineEmits<{
  close: []
  clear: []
}>()
</script>

<template>
  <div
    data-free-form-control
    class="absolute top-14 right-3 z-20 rounded-lg border border-stone-200 bg-white/95 shadow-md backdrop-blur"
    :class="isClosed ? 'p-2' : 'w-56 p-3'"
  >
    <template v-if="isClosed">
      <div class="flex items-center gap-2">
        <p class="text-[0.625rem] font-bold text-stone-500">
          {{ vertexCount }} points · Drag to edit
        </p>
        <button
          type="button"
          class="free-form-action shrink-0"
          @click="emit('clear')"
        >
          Clear
        </button>
      </div>
    </template>
    <template v-else>
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[0.625rem] font-extrabold tracking-[0.1em] text-[#648349] uppercase">
            Free-form outline
          </p>
          <p class="mt-1 text-[0.6875rem] leading-4 text-stone-500">
            Click the grid to add points. Click A to close.
          </p>
        </div>
        <span class="shrink-0 text-[0.625rem] font-bold text-stone-400">
          {{ vertexCount }}/{{ maxVertices }}
        </span>
      </div>
      <div class="mt-2.5 flex gap-2">
        <button
          type="button"
          class="free-form-action free-form-action--primary"
          :disabled="vertexCount < 3"
          @click="emit('close')"
        >
          Close outline
        </button>
        <button
          v-if="vertexCount > 0"
          type="button"
          class="free-form-action"
          @click="emit('clear')"
        >
          Clear
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.free-form-action {
  flex: 1;
  border: 1px solid #d6d3d1;
  border-radius: 0.4rem;
  padding: 0.45rem 0.55rem;
  color: #57534e;
  font-size: 0.625rem;
  font-weight: 750;
  line-height: 1;
  outline: none;
}

.free-form-action:hover:not(:disabled) {
  background: #f5f5f4;
}

.free-form-action:focus-visible {
  box-shadow: 0 0 0 2px #dce8d1;
}

.free-form-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.free-form-action--primary {
  border-color: #648349;
  background: #648349;
  color: #fff;
}

.free-form-action--primary:hover:not(:disabled) {
  background: #56743e;
}
</style>
