<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const on = ref(true)
const off = ref(false)
const goopOn = ref(true)
const goopOff = ref(false)

/** Switch props from the panel, applied to every GoopSwitch on the page. */
const speed = ref(1)
/** Effect toggles (core SWITCH_EFFECTS). */
const fx = reactive({ stretch: true, bridge: true, squish: true, fill: true, splat: true, droplets: true })
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  speed: speed.value,
  ...fx,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/switch">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Switch props">
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label v-for="(_, name) in fx" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="fx[name]" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
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
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">renderer</span>
          <select v-model="renderer" :class="selectClass">
            <option value="">auto (svg)</option>
            <option value="svg">svg</option>
            <option value="canvas">canvas</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="default">
      <template #shadcn>
        <label class="flex items-center gap-2 text-sm">
          <Switch v-model="off" /> Airplane mode
        </label>
      </template>
      <template #goop>
        <label class="flex items-center gap-2 text-sm">
          <GoopSwitch v-model="goopOff" v-bind="engine" /> Airplane mode
        </label>
      </template>
    </CompareRow>

    <CompareRow label="checked">
      <template #shadcn>
        <label class="flex items-center gap-2 text-sm">
          <Switch v-model="on" /> Notifications
        </label>
      </template>
      <template #goop>
        <label class="flex items-center gap-2 text-sm">
          <GoopSwitch v-model="goopOn" v-bind="engine" /> Notifications
        </label>
      </template>
    </CompareRow>

    <CompareRow label="sm">
      <template #shadcn>
        <Switch size="sm" />
        <Switch size="sm" :default-value="true" />
      </template>
      <template #goop>
        <GoopSwitch size="sm" v-bind="engine" />
        <GoopSwitch size="sm" :default-value="true" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="wide" note="goo only: a longer track so the bridge shows">
      <template #goop>
        <GoopSwitch class="data-[size=default]:h-6 data-[size=default]:w-14" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <Switch disabled />
        <Switch disabled :default-value="true" />
      </template>
      <template #goop>
        <GoopSwitch disabled v-bind="engine" />
        <GoopSwitch disabled :default-value="true" v-bind="engine" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
