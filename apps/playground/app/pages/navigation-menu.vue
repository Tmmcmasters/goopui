<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

/** GoopNavigationMenu props from the panel, applied to every goop navigation menu on the page. */
const goo = ref(true)
const highlight = ref(true)
const contentHighlight = ref(true)
const bloom = ref(true)
const jelly = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  contentHighlight: contentHighlight.value,
  bloom: bloom.value,
  jelly: jelly.value,
  wobble: wobble.value,
  momentum: momentum.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, highlight, contentHighlight, bloom, jelly, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/navigation-menu">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Navigation menu props">
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

    <CompareRow label="default" note="hover across the triggers: one highlight, one panel that slides">
      <template #shadcn>
        <NavMenuDemo kind="shadcn" compact />
      </template>
      <template #goop>
        <NavMenuDemo kind="goop" compact :engine="engine" />
      </template>
    </CompareRow>

    <CompareRow label="no viewport" note=":viewport=&quot;false&quot;: each panel blooms from its own trigger">
      <template #shadcn>
        <NavMenuDemo kind="shadcn" compact :viewport="false" />
      </template>
      <template #goop>
        <NavMenuDemo kind="goop" compact :viewport="false" :engine="engine" />
      </template>
    </CompareRow>

    <CompareRow label="full bar" note="the goop bar alone (it is wide)">
      <template #goop>
        <NavMenuDemo kind="goop" :engine="engine" />
      </template>
    </CompareRow>
    <div class="h-96" />
  </ComparePage>
</template>
