<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const single = ref([50])
const goopSingle = ref([50])
const range = ref([25, 75])
const goopRange = ref([25, 75])
const vertical = ref([40])
const goopVertical = ref([40])

/** Slider props from the panel, applied to every GoopSlider on the page. */
const speed = ref(1)
/** Effect toggles (core SLIDER_EFFECTS). */
const fx = reactive({ jelly: true, slosh: true, stretch: true, splat: true })
const goo = ref(true)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  speed: speed.value,
  ...fx,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/slider">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Slider props">
        <label class="flex items-center gap-2 pb-1">
          <input v-model="goo" type="checkbox">
          <span class="text-xs text-muted-foreground">goo</span>
        </label>
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

    <CompareRow label="default" note="drag fast, then stop; click the track to jump">
      <template #shadcn>
        <div class="grid w-full gap-2">
          <Slider v-model="single" :max="100" :step="1" />
          <span class="font-mono text-xs text-muted-foreground">{{ single[0] }}</span>
        </div>
      </template>
      <template #goop>
        <div class="grid w-full gap-2">
          <GoopSlider v-model="goopSingle" :max="100" :step="1" v-bind="engine" />
          <span class="font-mono text-xs text-muted-foreground">{{ goopSingle[0] }}</span>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="range" note="two thumbs, liquid between them">
      <template #shadcn>
        <div class="grid w-full gap-2">
          <Slider v-model="range" :max="100" :step="1" />
          <span class="font-mono text-xs text-muted-foreground">{{ range.join(' – ') }}</span>
        </div>
      </template>
      <template #goop>
        <div class="grid w-full gap-2">
          <GoopSlider v-model="goopRange" :max="100" :step="1" v-bind="engine" />
          <span class="font-mono text-xs text-muted-foreground">{{ goopRange.join(' – ') }}</span>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="steps" note="step 10: every move is a small jump">
      <template #shadcn>
        <Slider :default-value="[30]" :max="100" :step="10" />
      </template>
      <template #goop>
        <GoopSlider :default-value="[30]" :max="100" :step="10" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="vertical">
      <template #shadcn>
        <div class="h-40">
          <Slider v-model="vertical" orientation="vertical" :max="100" :step="1" />
        </div>
      </template>
      <template #goop>
        <div class="h-40">
          <GoopSlider v-model="goopVertical" orientation="vertical" :max="100" :step="1" v-bind="engine" />
        </div>
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <Slider :default-value="[40]" disabled />
      </template>
      <template #goop>
        <GoopSlider :default-value="[40]" disabled v-bind="engine" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
