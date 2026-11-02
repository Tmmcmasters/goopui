<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

/** GoopContextMenuContent props from the panel, applied to the goop context menu. */
const goo = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const highlight = ref(true)
const pop = ref(true)
const followPointer = ref(true)
const submenus = ref(true)
const bloomFrom = ref<'pointer' | 'center'>('pointer')
const bloomStart = ref<'single' | 'merge'>('single')
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  wobble: wobble.value,
  momentum: momentum.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
  highlight: highlight.value,
  pop: pop.value,
  followPointer: followPointer.value,
  submenus: submenus.value,
  bloomFrom: bloomFrom.value,
  bloomStart: bloomStart.value,
  speed: speed.value,
  preset: preset.value || undefined,
}))
const toggles = { goo, wobble, momentum, fade, openSlosh, openDrips, closeSlosh, highlight, pop, followPointer, submenus }
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
const bookmarks = ref(true)
const urls = ref(false)
const person = ref('pedro')
const goopBookmarks = ref(true)
const goopUrls = ref(false)
const goopPerson = ref('pedro')
const area = 'flex h-40 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground select-none'
</script>

<template>
  <ComparePage path="/context-menu">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Context menu props">
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
            <option value="pointer">pointer (default)</option>
            <option value="center">center</option>
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
      </section>
    </template>

    <CompareRow label="default" note="right-click (or long-press): blooms from the pointer">
      <template #shadcn>
        <GoopContextMenu>
          <GoopContextMenuTrigger :class="area">
            Right-click here
          </GoopContextMenuTrigger>
          <GoopContextMenuContent :goo="false" class="w-52">
            <ContextMenuItems v-model:bookmarks="bookmarks" v-model:urls="urls" v-model:person="person" />
          </GoopContextMenuContent>
        </GoopContextMenu>
      </template>
      <template #goop>
        <GoopContextMenu>
          <GoopContextMenuTrigger :class="area" data-cm="goop">
            Right-click here
          </GoopContextMenuTrigger>
          <GoopContextMenuContent class="w-52" v-bind="engine">
            <ContextMenuItems v-model:bookmarks="goopBookmarks" v-model:urls="goopUrls" v-model:person="goopPerson" />
          </GoopContextMenuContent>
        </GoopContextMenu>
      </template>
    </CompareRow>
  </ComparePage>
</template>
