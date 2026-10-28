<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'
import { toast } from 'vue-sonner'

// Two toasters side by side: shadcn's Sonner (bottom-left) and GoopToaster (bottom-right).
// vue-sonner routes each toast to one of them by `toasterId`.
const SHADCN = 'shadcn'
const GOOP = 'goop'

/** GoopToaster props from the panel. */
const goo = ref(true)
const dropIn = ref(true)
const merge = ref(true)
const drips = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  dropIn: dropIn.value,
  merge: merge.value,
  drips: drips.value,
  speed: speed.value,
  preset: preset.value || undefined,
}))
const toggles = { goo, dropIn, merge, drips }

/** Sonner props, applied to both toasters. */
const expand = ref(false)
const richColors = ref(false)
const closeButton = ref(false)
const y = ref<'top' | 'bottom'>('bottom')
const sonner = computed(() => ({ expand: expand.value, richColors: richColors.value, closeButton: closeButton.value }))
const sonnerToggles = { expand, richColors, closeButton }

const kinds = {
  default: (id: string) => toast('Event has been created', { toasterId: id, description: 'Sunday, December 03, 2023 at 9:00 AM' }),
  success: (id: string) => toast.success('Changes saved', { toasterId: id }),
  error: (id: string) => toast.error('Could not reach the server', { toasterId: id }),
  promise: (id: string) =>
    toast.promise(new Promise<{ name: string }>((resolve) => setTimeout(() => resolve({ name: 'goopUI' }), 1600)), {
      toasterId: id,
      loading: 'Loading...',
      success: (data: { name: string }) => `${data.name} has been added`,
      error: 'Error',
    }),
  action: (id: string) =>
    toast('Message archived', { toasterId: id, action: { label: 'Undo', onClick: () => toast('Restored', { toasterId: id }) } }),
} as const
const burst = (id: string) => {
  const all = Object.values(kinds)
  all.forEach((fire, i) => setTimeout(() => fire(id), i * 180))
}

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/toast">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Toaster props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
        <span class="h-7 w-px self-end bg-border" aria-hidden="true" />
        <label v-for="(r, name) in sonnerToggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">position</span>
          <select v-model="y" :class="selectClass">
            <option value="bottom">bottom</option>
            <option value="top">top</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow v-for="(fire, kind) in kinds" :key="kind" :label="kind">
      <template #shadcn>
        <Button variant="outline" @click="fire(SHADCN)">
          Show {{ kind }}
        </Button>
      </template>
      <template #goop>
        <GoopButton variant="outline" @click="fire(GOOP)">
          Show {{ kind }}
        </GoopButton>
      </template>
    </CompareRow>
    <CompareRow label="stack" note="All five in a row: hover the stack to expand it, swipe one away.">
      <template #shadcn>
        <Button @click="burst(SHADCN)">
          Show five
        </Button>
      </template>
      <template #goop>
        <GoopButton @click="burst(GOOP)">
          Show five
        </GoopButton>
      </template>
    </CompareRow>

    <Toaster :id="SHADCN" :position="`${y}-left`" v-bind="sonner" />
    <GoopToaster :id="GOOP" :position="`${y}-right`" v-bind="{ ...sonner, ...engine }" />
  </ComparePage>
</template>
