<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

/** GoopHoverCardContent props from the panel, applied to every goop hover card on the page. */
const goo = ref(true)
const flow = ref(true)
const flowStyle = ref<'bloom' | 'neck'>('bloom')
const bloomStart = ref<'single' | 'merge'>('single')
const bloomFrom = ref<'trigger' | 'center'>('trigger')
const bridge = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const surface = ref('popover')
const sides = ['bottom', 'top', 'right', 'left'] as const
const engine = computed(() => ({
  goo: goo.value,
  flow: flow.value,
  flowStyle: flowStyle.value,
  bloomStart: bloomStart.value,
  bloomFrom: bloomFrom.value,
  bridge: bridge.value,
  wobble: wobble.value,
  momentum: momentum.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
  speed: speed.value,
  preset: preset.value || undefined,
  surface: surface.value,
}))
const toggles = { goo, flow, bridge, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/hover-card">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Hover card props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomFrom</span>
          <select v-model="bloomFrom" :class="selectClass">
            <option value="trigger">trigger (default)</option>
            <option value="center">center</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">flowStyle</span>
          <select v-model="flowStyle" :class="selectClass">
            <option value="bloom">bloom (default)</option>
            <option value="neck">neck</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomStart</span>
          <select v-model="bloomStart" :class="selectClass">
            <option value="single">single (default)</option>
            <option value="merge">merge</option>
          </select>
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
          <span class="text-xs text-muted-foreground">surface</span>
          <select v-model="surface" :class="selectClass">
            <option value="popover">popover (default)</option>
            <option value="trigger">trigger</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow v-for="side in sides" :key="side" :label="side" :note="side === 'bottom' ? 'blooms from the edge facing the link' : undefined">
      <template #shadcn>
        <GoopHoverCard :open-delay="200">
          <GoopHoverCardTrigger href="#" class="text-sm font-medium underline-offset-4 hover:underline">
            @nuxt
          </GoopHoverCardTrigger>
          <GoopHoverCardContent :goo="false" :side="side">
            <HoverCardBody />
          </GoopHoverCardContent>
        </GoopHoverCard>
      </template>
      <template #goop>
        <GoopHoverCard :open-delay="200">
          <GoopHoverCardTrigger href="#" class="text-sm font-medium underline-offset-4 hover:underline" :data-hc="side">
            @nuxt
          </GoopHoverCardTrigger>
          <GoopHoverCardContent :side="side" v-bind="engine">
            <HoverCardBody />
          </GoopHoverCardContent>
        </GoopHoverCard>
      </template>
    </CompareRow>
  </ComparePage>
</template>
