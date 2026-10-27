<script setup lang="ts">
import { SPINNER_VARIANTS, type GoopPreset, type GoopRendererName, type SpinnerVariant } from '@goopui/core'

/** Spinner props from the panel, applied to every GoopSpinner on the page. */
const variant = ref<SpinnerVariant>('orbit')
const blobs = ref(4)
const speed = ref(1)
const drips = ref(true)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  variant: variant.value,
  blobs: blobs.value,
  speed: speed.value,
  drips: drips.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const sizes = ['size-3', 'size-4', 'size-6', 'size-8', 'size-12']
const colors = ['text-primary', 'text-destructive', 'text-muted-foreground', 'text-sky-500', 'text-emerald-500']
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/spinner">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Spinner props">
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">variant</span>
          <select v-model="variant" :class="selectClass">
            <option v-for="v in SPINNER_VARIANTS" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">blobs: {{ blobs }}</span>
          <input v-model.number="blobs" type="range" min="3" max="6" step="1" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.25" max="3" step="0.05" class="w-28">
        </label>
        <label class="flex items-center gap-2 pb-1">
          <input v-model="drips" type="checkbox">
          <span class="text-xs text-muted-foreground">drips</span>
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
        <Spinner />
      </template>
      <template #goop>
        <GoopSpinner v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="variants" note="orbit, comet, ring, dots, pulse (size-12)">
      <template #shadcn>
        <Spinner v-for="v in SPINNER_VARIANTS" :key="v" class="size-12" />
      </template>
      <template #goop>
        <GoopSpinner v-for="v in SPINNER_VARIANTS" :key="v" class="size-12" v-bind="engine" :variant="v" :title="v" />
      </template>
    </CompareRow>

    <CompareRow label="sizes" note="size-3 to size-12">
      <template #shadcn>
        <Spinner v-for="s in sizes" :key="s" :class="s" />
      </template>
      <template #goop>
        <GoopSpinner v-for="s in sizes" :key="s" :class="s" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="in button">
      <template #shadcn>
        <Button disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
        <Button variant="secondary" disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
        <Button variant="outline" disabled>
          <Spinner data-icon="inline-start" /> Loading
        </Button>
      </template>
      <template #goop>
        <GoopButton disabled>
          <GoopSpinner data-icon="inline-start" v-bind="engine" /> Loading
        </GoopButton>
        <GoopButton variant="secondary" disabled>
          <GoopSpinner data-icon="inline-start" v-bind="engine" /> Loading
        </GoopButton>
        <GoopButton variant="outline" disabled>
          <GoopSpinner data-icon="inline-start" v-bind="engine" /> Loading
        </GoopButton>
      </template>
    </CompareRow>

    <CompareRow label="colors" note="currentColor, like the icon">
      <template #shadcn>
        <Spinner v-for="c in colors" :key="c" :class="['size-6', c]" />
      </template>
      <template #goop>
        <GoopSpinner v-for="c in colors" :key="c" :class="['size-6', c]" v-bind="engine" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
