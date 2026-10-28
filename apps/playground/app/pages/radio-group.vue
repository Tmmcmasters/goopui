<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const density = ['default', 'comfortable', 'compact'] as const
const sizes = ['s', 'm', 'l', 'xl'] as const
const plan = ref('comfortable')
const goopPlan = ref('comfortable')
const size = ref('m')
const goopSize = ref('m')

/** Radio group props from the panel, applied to every GoopRadioGroup on the page. */
const speed = ref(1)
/** Effect toggles (core RADIO_EFFECTS). */
const fx = reactive({ bridge: true, splat: true, droplets: true })
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
  <ComparePage path="/radio-group">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Radio group props">
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

    <CompareRow label="vertical" note="click, or focus and use the arrow keys">
      <template #shadcn>
        <RadioGroup v-model="plan">
          <div v-for="o in density" :key="o" class="flex items-center gap-3">
            <RadioGroupItem :id="`s-${o}`" :value="o" />
            <label :for="`s-${o}`" class="text-sm capitalize">{{ o }}</label>
          </div>
        </RadioGroup>
      </template>
      <template #goop>
        <GoopRadioGroup v-model="goopPlan" v-bind="engine">
          <div v-for="o in density" :key="o" class="flex items-center gap-3">
            <GoopRadioGroupItem :id="`g-${o}`" :value="o" />
            <label :for="`g-${o}`" class="text-sm capitalize">{{ o }}</label>
          </div>
        </GoopRadioGroup>
      </template>
    </CompareRow>

    <CompareRow label="horizontal">
      <template #shadcn>
        <RadioGroup v-model="size" orientation="horizontal" class="flex gap-6">
          <div v-for="o in sizes" :key="o" class="flex items-center gap-2">
            <RadioGroupItem :id="`sh-${o}`" :value="o" />
            <label :for="`sh-${o}`" class="text-sm uppercase">{{ o }}</label>
          </div>
        </RadioGroup>
      </template>
      <template #goop>
        <GoopRadioGroup v-model="goopSize" orientation="horizontal" class="flex gap-6" v-bind="engine">
          <div v-for="o in sizes" :key="o" class="flex items-center gap-2">
            <GoopRadioGroupItem :id="`gh-${o}`" :value="o" />
            <label :for="`gh-${o}`" class="text-sm uppercase">{{ o }}</label>
          </div>
        </GoopRadioGroup>
      </template>
    </CompareRow>

    <CompareRow label="uncontrolled">
      <template #shadcn>
        <RadioGroup default-value="one">
          <RadioGroupItem value="one" />
          <RadioGroupItem value="two" />
          <RadioGroupItem value="three" disabled />
        </RadioGroup>
      </template>
      <template #goop>
        <GoopRadioGroup default-value="one" v-bind="engine">
          <GoopRadioGroupItem value="one" />
          <GoopRadioGroupItem value="two" />
          <GoopRadioGroupItem value="three" disabled />
        </GoopRadioGroup>
      </template>
    </CompareRow>

    <CompareRow label="large" note="goo only: bigger items, wider gaps so the bridge shows">
      <template #goop>
        <GoopRadioGroup default-value="a" orientation="horizontal" class="flex gap-10" v-bind="engine">
          <GoopRadioGroupItem v-for="o in ['a', 'b', 'c']" :key="o" :value="o" class="size-7" />
        </GoopRadioGroup>
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopRadioGroup default-value="a" :goo="false">
          <GoopRadioGroupItem value="a" />
          <GoopRadioGroupItem value="b" />
        </GoopRadioGroup>
      </template>
    </CompareRow>
  </ComparePage>
</template>
