<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const qty = ref(3)
const goopQty = ref(3)
const price = ref(24.5)
const goopPrice = ref(24.5)

const speed = ref(1)
/** Effect toggles (core NUMBER_FIELD_EFFECTS). `drips` is off by default. */
const fx = reactive({ flow: true, close: true, ripple: true, wobble: true, drain: true, drip: true, drips: false, squish: true, nudge: true })
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
  <ComparePage path="/number-field">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="NumberField props">
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

    <CompareRow label="default" note="press +/- (hold to repeat), or focus and use the arrow keys">
      <template #shadcn>
        <NumberField v-model="qty" :min="0" :max="20" class="max-w-40">
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput aria-label="Quantity" />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </template>
      <template #goop>
        <GoopNumberField v-model="goopQty" :min="0" :max="20" class="max-w-40" v-bind="engine" data-test="nf">
          <GoopNumberFieldContent>
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Quantity" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      </template>
    </CompareRow>

    <CompareRow label="currency" note="formatOptions pass through to reka">
      <template #shadcn>
        <NumberField v-model="price" :step="0.5" :format-options="{ style: 'currency', currency: 'USD' }" class="max-w-48">
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput aria-label="Price" />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </template>
      <template #goop>
        <GoopNumberField v-model="goopPrice" :step="0.5" :format-options="{ style: 'currency', currency: 'USD' }" class="max-w-48" v-bind="engine">
          <GoopNumberFieldContent>
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Price" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      </template>
    </CompareRow>

    <CompareRow label="invalid" note="aria-invalid on the input: destructive ring with a drip">
      <template #shadcn>
        <NumberField :default-value="0" class="max-w-40">
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput aria-label="Seats" aria-invalid="true" />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </template>
      <template #goop>
        <GoopNumberField :default-value="0" class="max-w-40" v-bind="engine">
          <GoopNumberFieldContent>
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Seats" aria-invalid="true" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <NumberField :default-value="4" disabled class="max-w-40">
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput aria-label="Disabled" />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </template>
      <template #goop>
        <GoopNumberField :default-value="4" disabled class="max-w-40" v-bind="engine">
          <GoopNumberFieldContent>
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Disabled" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopNumberField :default-value="2" :goo="false" class="max-w-40">
          <GoopNumberFieldContent>
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Plain" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      </template>
    </CompareRow>
  </ComparePage>
</template>
