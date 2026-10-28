<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

type State = boolean | 'indeterminate'

const terms = ref(false)
const goopTerms = ref(false)
const mixed = ref<State>('indeterminate')
const goopMixed = ref<State>('indeterminate')

/** Checkbox props from the panel, applied to every GoopCheckbox on the page. */
const speed = ref(1)
/** Effect toggles (core CHECKBOX_EFFECTS). */
const fx = reactive({ fill: true, splat: true, droplets: true })
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  speed: speed.value,
  ...fx,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const cycle = (v: State): State => (v === 'indeterminate' ? true : v ? false : 'indeterminate')

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/checkbox">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Checkbox props">
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
          <Checkbox v-model="terms" /> Accept terms and conditions
        </label>
      </template>
      <template #goop>
        <label class="flex items-center gap-2 text-sm">
          <GoopCheckbox v-model="goopTerms" v-bind="engine" /> Accept terms and conditions
        </label>
      </template>
    </CompareRow>

    <CompareRow label="checked">
      <template #shadcn>
        <Checkbox :default-value="true" />
      </template>
      <template #goop>
        <GoopCheckbox :default-value="true" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="indeterminate" note="the button cycles indeterminate, checked, unchecked">
      <template #shadcn>
        <Checkbox v-model="mixed" />
        <button type="button" class="rounded-md border px-2 py-1 text-xs" @click="mixed = cycle(mixed)">
          {{ mixed }}
        </button>
      </template>
      <template #goop>
        <GoopCheckbox v-model="goopMixed" v-bind="engine" />
        <button type="button" class="rounded-md border px-2 py-1 text-xs" @click="goopMixed = cycle(goopMixed)">
          {{ goopMixed }}
        </button>
      </template>
    </CompareRow>

    <CompareRow label="list">
      <template #shadcn>
        <div class="grid gap-2">
          <label v-for="n in 4" :key="n" class="flex items-center gap-2 text-sm">
            <Checkbox :default-value="n === 2" /> Option {{ n }}
          </label>
        </div>
      </template>
      <template #goop>
        <div class="grid gap-2">
          <label v-for="n in 4" :key="n" class="flex items-center gap-2 text-sm">
            <GoopCheckbox :default-value="n === 2" v-bind="engine" /> Option {{ n }}
          </label>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="large" note="goo only: a bigger box so the splat reads">
      <template #goop>
        <GoopCheckbox class="size-8 rounded-md" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <Checkbox disabled />
        <Checkbox disabled :default-value="true" />
      </template>
      <template #goop>
        <GoopCheckbox disabled v-bind="engine" />
        <GoopCheckbox disabled :default-value="true" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopCheckbox :goo="false" />
        <GoopCheckbox :goo="false" :default-value="true" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
