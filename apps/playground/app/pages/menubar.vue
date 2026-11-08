<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

/** GoopMenubar props (the trigger highlight; menus inherit goo / wobble / momentum / speed /
 *  preset) and GoopMenubarContent props from the panel, applied to the goop menubar. */
const goo = ref(true)
const highlight = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const itemHighlight = ref(true)
const pop = ref(true)
const followPointer = ref(true)
const submenus = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const bar = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  wobble: wobble.value,
  momentum: momentum.value,
  speed: speed.value,
  preset: preset.value || undefined,
}))
const content = computed(() => ({
  highlight: itemHighlight.value,
  pop: pop.value,
  followPointer: followPointer.value,
  submenus: submenus.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
}))
const barToggles = { goo, highlight, wobble, momentum }
const menuToggles = { itemHighlight, pop, followPointer, submenus, fade, openSlosh, openDrips, closeSlosh }
// Phone: the half-width compare columns are narrower than four triggers, so the bar wraps.
const fit = 'h-auto flex-wrap sm:h-8 sm:flex-nowrap'
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/menubar">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Menubar props">
        <span class="w-full text-xs font-medium">GoopMenubar</span>
        <label v-for="(r, name) in barToggles" :key="name" class="flex items-center gap-2 pb-1">
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
        <span class="w-full text-xs font-medium">GoopMenubarContent</span>
        <label v-for="(r, name) in menuToggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name === 'itemHighlight' ? 'highlight' : name }}</span>
        </label>
      </section>
    </template>

    <CompareRow label="default" note="hover or arrow across the triggers; open a menu and slide along the bar">
      <template #shadcn>
        <GoopMenubar :goo="false" :class="fit">
          <MenubarMenus :content="{ goo: false }" />
        </GoopMenubar>
      </template>
      <template #goop>
        <GoopMenubar v-bind="bar" :class="fit" data-mb="goop">
          <MenubarMenus :content="content" />
        </GoopMenubar>
      </template>
    </CompareRow>
  </ComparePage>
</template>
