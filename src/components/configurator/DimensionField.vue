<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    hint: string
    modelValue: number
    min: number
    max: number
    step?: number
  }>(),
  {
    step: 10,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const draftValue = ref(String(props.modelValue))
const isFocused = ref(false)
const hasInteracted = ref(false)

const parsedDraft = computed<number | null>(() => {
  if (draftValue.value.trim() === '') {
    return null
  }

  const parsed = Number(draftValue.value)
  return Number.isFinite(parsed) ? parsed : null
})

const isDraftInRange = computed(
  () =>
    parsedDraft.value !== null &&
    parsedDraft.value >= props.min &&
    parsedDraft.value <= props.max,
)

const showError = computed(
  () => hasInteracted.value && !isDraftInRange.value,
)

const hintId = computed(() => `${props.id}-hint`)
const errorId = computed(() => `${props.id}-error`)

watch(
  () => [props.modelValue, props.min, props.max] as const,
  ([value]) => {
    if (!isFocused.value || isDraftInRange.value) {
      draftValue.value = String(value)
    }
  },
)

const emitIfValid = (): void => {
  if (parsedDraft.value === null || !isDraftInRange.value) {
    return
  }

  emit('update:modelValue', parsedDraft.value)
}

const handleInput = (event: Event): void => {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) {
    return
  }

  hasInteracted.value = true
  draftValue.value = input.value
  emitIfValid()
}

const commitValue = (): void => {
  isFocused.value = false

  if (parsedDraft.value === null) {
    draftValue.value = String(props.modelValue)
    hasInteracted.value = false
    return
  }

  const clampedValue = Math.min(
    Math.max(parsedDraft.value, props.min),
    props.max,
  )

  draftValue.value = String(clampedValue)
  hasInteracted.value = false
  emit('update:modelValue', clampedValue)
}

const resetDraft = (event: KeyboardEvent): void => {
  draftValue.value = String(props.modelValue)
  hasInteracted.value = false

  const input = event.currentTarget
  if (input instanceof HTMLInputElement) {
    input.blur()
  }
}

const blurInput = (event: KeyboardEvent): void => {
  const input = event.currentTarget
  if (input instanceof HTMLInputElement) {
    input.blur()
  }
}
</script>

<template>
  <div class="group">
    <div class="mb-2 flex items-end justify-between gap-4">
      <label
        :for="id"
        class="text-[0.8125rem] font-semibold tracking-[-0.01em] text-stone-800"
      >
        {{ label }}
      </label>
      <span class="text-[0.6875rem] font-medium text-stone-400">
        {{ min }}–{{ max }} cm
      </span>
    </div>

    <div class="relative">
      <input
        :id="id"
        :value="draftValue"
        type="number"
        inputmode="decimal"
        :min="min"
        :max="max"
        :step="step"
        :aria-describedby="showError ? errorId : hintId"
        :aria-invalid="showError"
        class="h-12 w-full rounded-xl border bg-white px-4 pr-14 text-[0.9375rem] font-semibold tabular-nums text-stone-900 outline-none transition placeholder:text-stone-300 focus:ring-4"
        :class="
          showError
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
            : 'border-stone-200 hover:border-stone-300 focus:border-amber-600 focus:ring-amber-100'
        "
        @focus="isFocused = true"
        @input="handleInput"
        @blur="commitValue"
        @keydown.enter.prevent="blurInput"
        @keydown.esc.prevent="resetDraft"
      />
      <span
        class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold uppercase tracking-[0.08em] text-stone-400"
        aria-hidden="true"
      >
        cm
      </span>
    </div>

    <p
      v-if="showError"
      :id="errorId"
      class="mt-1.5 text-xs leading-5 text-rose-600"
      role="alert"
    >
      Enter a value between {{ min }} and {{ max }} cm.
    </p>
    <p
      v-else
      :id="hintId"
      class="mt-1.5 text-xs leading-5 text-stone-400"
    >
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>
input[type='number'] {
  appearance: textfield;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}
</style>
