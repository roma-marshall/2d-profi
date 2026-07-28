<script setup lang="ts">
defineProps<{
  notification: {
    type: 'success' | 'error'
    message: string
  } | null
}>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-200"
    enter-from-class="-translate-y-2 opacity-0"
    leave-active-class="transition duration-150"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      v-if="notification"
      class="fixed top-3 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-bold shadow-lg"
      :class="
        notification.type === 'success'
          ? 'border-[#d8e4cd] bg-[#f2f7ed] text-[#4f6d39]'
          : 'border-rose-200 bg-rose-50 text-rose-700'
      "
      :role="notification.type === 'error' ? 'alert' : 'status'"
    >
      <span v-if="notification.type === 'success'" aria-hidden="true">
        ✓
      </span>
      <svg
        v-else
        class="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 8H12.01M12 11V16" />
        <circle cx="12" cy="12" r="9" />
      </svg>
      {{ notification.message }}
    </div>
  </Transition>
</template>
