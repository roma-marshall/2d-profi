<script setup lang="ts">
import { ref } from 'vue'

type ConfiguratorSection = 'layout' | 'decking' | 'summary'

defineProps<{
  activeSection: ConfiguratorSection
}>()

const emit = defineEmits<{
  'update:active-section': [section: ConfiguratorSection]
  'load-config': [file: File]
  'save-config': []
}>()

const configFileInput = ref<HTMLInputElement | null>(null)

const workflowSteps = [
  {
    id: 'layout',
    number: 1,
    label: 'Floor plan',
    description: 'Shape & dimensions',
  },
  {
    id: 'decking',
    number: 2,
    label: 'Decking',
    description: 'Finish & direction',
  },
  {
    id: 'summary',
    number: 3,
    label: 'Summary',
    description: 'Review your plan',
  },
] as const satisfies readonly {
  id: ConfiguratorSection
  number: number
  label: string
  description: string
}[]

const triggerConfigImport = (): void => {
  configFileInput.value?.click()
}

const handleConfigImport = (event: Event): void => {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const file = input.files?.[0]
  input.value = ''
  if (file !== undefined) {
    emit('load-config', file)
  }
}
</script>

<template>
  <header class="border-b border-stone-200 bg-white">
    <div class="flex h-14 items-center justify-between gap-4 px-4 lg:px-5">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="grid size-9 shrink-0 place-items-center rounded-lg bg-[#648349] text-xs font-black tracking-tight text-white"
          aria-hidden="true"
        >
          2D
        </span>
        <div class="min-w-0">
          <h1 class="truncate text-sm font-extrabold tracking-[-0.02em] text-stone-900 sm:text-base">
            2D Profi
          </h1>
          <p class="hidden text-[0.625rem] font-medium text-stone-400 sm:block">
            Local terrace planning workspace
          </p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <input
          ref="configFileInput"
          type="file"
          accept="application/json,.json"
          class="sr-only"
          tabindex="-1"
          @change="handleConfigImport"
        />
        <button
          type="button"
          class="header-action"
          aria-label="Load terrace plan"
          @click="triggerConfigImport"
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
            <path
              transform="rotate(270 12 12)"
              d="M16.9995 15.9995L20.9995 11.9995M20.9995 11.9995L16.9995 7.99951M20.9995 11.9995H8.99951M12.9995 20.9995H6.20029C5.08019 20.9995 4.52014 20.9995 4.09231 20.7815C3.71599 20.5898 3.41003 20.2838 3.21828 19.9075C3.00029 19.4797 3.00029 18.9196 3.00029 17.7995V6.19951C3.00029 5.07941 3.00029 4.51935 3.21828 4.09153C3.41003 3.71521 3.71599 3.40925 4.09231 3.2175C4.52014 2.99951 5.08019 2.99951 6.20029 2.99951L12.9995 2.99951"
            />
          </svg>
          <span class="hidden lg:inline">Load</span>
        </button>
        <button
          type="button"
          class="header-action"
          aria-label="Save terrace plan as JSON"
          @click="emit('save-config')"
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
            <path
              transform="rotate(90 12 12)"
              d="M11.0005 15.9995L15.0005 11.9995M15.0005 11.9995L11.0005 7.99951M15.0005 11.9995H3.00049M11.0005 2.99951H17.7997C18.9198 2.99951 19.4799 2.99951 19.9077 3.2175C20.284 3.40925 20.59 3.71521 20.7817 4.09153C20.9997 4.51935 20.9997 5.07941 20.9997 6.19951V17.7995C20.9997 18.9196 20.9997 19.4797 20.7817 19.9075C20.59 20.2838 20.284 20.5898 19.9077 20.7815C19.4799 20.9995 18.9198 20.9995 17.7997 20.9995H11.0005"
            />
          </svg>
          <span class="hidden lg:inline">Save</span>
        </button>
      </div>
    </div>

    <nav
      class="workflow-nav flex min-h-12 overflow-x-auto border-t border-stone-100 bg-[#fafaf8] px-2 lg:px-5"
      aria-label="Configurator steps"
    >
      <button
        v-for="(step, index) in workflowSteps"
        :key="step.id"
        type="button"
        class="group relative flex min-w-max flex-1 items-center gap-2.5 px-3 py-2 text-left outline-none transition hover:bg-white focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#648349] sm:px-5"
        :class="
          activeSection === step.id
            ? 'bg-white text-stone-900'
            : 'text-stone-400'
        "
        :aria-current="activeSection === step.id ? 'step' : undefined"
        @click="emit('update:active-section', step.id)"
      >
        <span
          class="grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-black"
          :class="
            activeSection === step.id
              ? 'bg-[#648349] text-white'
              : 'border border-stone-300 bg-white text-stone-500'
          "
        >
          {{ step.number }}
        </span>
        <span>
          <span class="block text-[0.6875rem] font-bold sm:text-xs">
            {{ step.label }}
          </span>
          <span class="hidden text-[0.5625rem] font-medium text-stone-400 md:block">
            {{ step.description }}
          </span>
        </span>
        <span
          v-if="index < workflowSteps.length - 1"
          class="ml-auto hidden text-stone-300 sm:block"
          aria-hidden="true"
        >
          ›
        </span>
        <span
          v-if="activeSection === step.id"
          class="absolute inset-x-3 bottom-0 h-0.5 bg-[#648349]"
          aria-hidden="true"
        />
      </button>
    </nav>
  </header>
</template>

<style scoped>
.header-action {
  display: inline-flex;
  height: 2.25rem;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #e7e5e4;
  border-radius: 0.5rem;
  background: #fff;
  padding-inline: 0.65rem;
  color: #57534e;
  font-size: 0.75rem;
  font-weight: 700;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.header-action:hover {
  border-color: #d6d3d1;
  background: #fafaf9;
  color: #1c1917;
}

.header-action:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 4px #e7eedf;
}
</style>
