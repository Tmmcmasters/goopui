<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from '@lucide/vue'

/** GoopAlert props from the panel, applied to every goop alert on the page. */
const goo = ref(true)
const bloom = ref(true)
const wobble = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  bloom: bloom.value,
  wobble: wobble.value,
  speed: speed.value,
  preset: preset.value || undefined,
}))
const toggles = { goo, bloom, wobble }

/** Bumping it remounts the alerts, so their entrance plays again. */
const replay = ref(0)
const shown = ref(true)

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/alert">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Alert props">
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
        <button type="button" class="h-7 rounded-md border px-2 text-xs" data-replay @click="replay++">
          replay (remount)
        </button>
        <button type="button" class="h-7 rounded-md border px-2 text-xs" data-toggle-shown @click="shown = !shown">
          v-show {{ shown ? 'hide' : 'show' }}
        </button>
      </section>
    </template>

    <CompareRow label="default" note="blooms out of its top edge, settles; the icon wobbles once">
      <template #shadcn>
        <Alert class="max-w-md">
          <CheckCircle2Icon />
          <AlertTitle>Success! Your changes have been saved</AlertTitle>
          <AlertDescription>This is an alert with icon, title and description.</AlertDescription>
        </Alert>
      </template>
      <template #goop>
        <GoopAlert :key="replay" class="max-w-md" data-shot="alert" v-bind="engine">
          <CheckCircle2Icon />
          <GoopAlertTitle>Success! Your changes have been saved</GoopAlertTitle>
          <GoopAlertDescription>This is an alert with icon, title and description.</GoopAlertDescription>
        </GoopAlert>
      </template>
    </CompareRow>

    <CompareRow label="destructive" note="same entrance">
      <template #shadcn>
        <Alert variant="destructive" class="max-w-md">
          <AlertCircleIcon />
          <AlertTitle>Unable to process your payment.</AlertTitle>
          <AlertDescription>
            <p>Please verify your billing information and try again.</p>
          </AlertDescription>
        </Alert>
      </template>
      <template #goop>
        <GoopAlert :key="replay" variant="destructive" class="max-w-md" v-bind="engine">
          <AlertCircleIcon />
          <GoopAlertTitle>Unable to process your payment.</GoopAlertTitle>
          <GoopAlertDescription>
            <p>Please verify your billing information and try again.</p>
          </GoopAlertDescription>
        </GoopAlert>
      </template>
    </CompareRow>

    <CompareRow label="action / v-show" note="with AlertAction; toggle v-show to bloom again">
      <template #shadcn>
        <Alert v-show="shown" class="max-w-md">
          <InfoIcon />
          <AlertTitle>New version available</AlertTitle>
          <AlertDescription>Reload to get the latest goo.</AlertDescription>
          <AlertAction><button type="button" class="h-6 rounded-md border px-2 text-xs">Reload</button></AlertAction>
        </Alert>
      </template>
      <template #goop>
        <GoopAlert v-show="shown" :key="replay" class="max-w-md" v-bind="engine">
          <InfoIcon />
          <GoopAlertTitle>New version available</GoopAlertTitle>
          <GoopAlertDescription>Reload to get the latest goo.</GoopAlertDescription>
          <GoopAlertAction><GoopButton size="xs" variant="outline">Reload</GoopButton></GoopAlertAction>
        </GoopAlert>
      </template>
    </CompareRow>

    <CompareRow label="title only" note="no icon, no description">
      <template #shadcn>
        <Alert class="max-w-md">
          <AlertTitle>Heads up! A single line alert.</AlertTitle>
        </Alert>
      </template>
      <template #goop>
        <GoopAlert :key="replay" class="max-w-md" v-bind="engine">
          <GoopAlertTitle>Heads up! A single line alert.</GoopAlertTitle>
        </GoopAlert>
      </template>
    </CompareRow>
  </ComparePage>
</template>
