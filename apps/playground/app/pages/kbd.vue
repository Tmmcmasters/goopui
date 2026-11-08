<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

/** GoopKbd props from the panel, applied to every goop kbd on the page. */
const goo = ref(true)
const press = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({ goo: goo.value, press: press.value, speed: speed.value, preset: preset.value || undefined }))
const toggles = { goo, press }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/kbd">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Kbd props">
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
      </section>
    </template>

    <CompareRow label="combo" note="press ⌘ / Ctrl + K, or click a key">
      <template #shadcn>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </template>
      <template #goop>
        <GoopKbdGroup data-shot="kbd">
          <GoopKbd :keys="['Meta']" v-bind="engine">⌘</GoopKbd>
          <GoopKbd :keys="['Meta', 'K']" v-bind="engine">K</GoopKbd>
        </GoopKbdGroup>
        <GoopKbdGroup>
          <GoopKbd :keys="['Control']" v-bind="engine">Ctrl</GoopKbd>
          <GoopKbd :keys="['Control', 'K']" v-bind="engine">K</GoopKbd>
        </GoopKbdGroup>
      </template>
    </CompareRow>

    <CompareRow label="modifiers" note="press each key">
      <template #shadcn>
        <KbdGroup>
          <Kbd>⇧</Kbd><Kbd>⌥</Kbd><Kbd>⌃</Kbd><Kbd>Esc</Kbd><Kbd>Enter</Kbd>
        </KbdGroup>
      </template>
      <template #goop>
        <GoopKbdGroup>
          <GoopKbd :keys="['Shift']" v-bind="engine">⇧</GoopKbd>
          <GoopKbd :keys="['Alt']" v-bind="engine">⌥</GoopKbd>
          <GoopKbd :keys="['Control']" v-bind="engine">⌃</GoopKbd>
          <GoopKbd :keys="['Escape']" v-bind="engine">Esc</GoopKbd>
          <GoopKbd :keys="['Enter']" v-bind="engine">Enter</GoopKbd>
        </GoopKbdGroup>
      </template>
    </CompareRow>

    <CompareRow label="in text" note="click-only (no keys)">
      <template #shadcn>
        <p class="text-sm text-muted-foreground">
          Use <KbdGroup><Kbd>Ctrl + B</Kbd><Kbd>Ctrl + K</Kbd></KbdGroup> to open the command palette
        </p>
      </template>
      <template #goop>
        <p class="text-sm text-muted-foreground">
          Use <GoopKbdGroup><GoopKbd v-bind="engine">Ctrl + B</GoopKbd><GoopKbd v-bind="engine">Ctrl + K</GoopKbd></GoopKbdGroup> to open the command palette
        </p>
      </template>
    </CompareRow>
  </ComparePage>
</template>
