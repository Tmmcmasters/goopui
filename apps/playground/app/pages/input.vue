<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const email = ref('')
const goopEmail = ref('')
const bio = ref('')
const goopBio = ref('')
const bad = ref('not-an-email')
const goopBad = ref('not-an-email')
const badInvalid = computed(() => !/^\S+@\S+\.\S+$/.test(bad.value))
const goopBadInvalid = computed(() => !/^\S+@\S+\.\S+$/.test(goopBad.value))

/** Props from the panel, applied to every GoopInput / GoopTextarea on the page. */
const speed = ref(1)
/** Effect toggles (core INPUT_EFFECTS). `drips` is off by default. */
const fx = reactive({ flow: true, close: true, ripple: true, wobble: true, drain: true, drip: true, drips: false })
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
  <ComparePage path="/input">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Input props">
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

    <CompareRow label="default" note="click anywhere on the border, or Tab in from the left">
      <template #shadcn>
        <Input v-model="email" type="email" placeholder="Email" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopInput v-model="goopEmail" type="email" placeholder="Email" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="with button" note="flex row: the goo wrapper takes the input's place">
      <template #shadcn>
        <div class="flex w-full max-w-sm items-center gap-2">
          <Input type="text" placeholder="Search" />
          <Button>Go</Button>
        </div>
      </template>
      <template #goop>
        <div class="flex w-full max-w-sm items-center gap-2">
          <GoopInput type="text" placeholder="Search" v-bind="engine" />
          <GoopButton>Go</GoopButton>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <Input disabled placeholder="Disabled" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopInput disabled placeholder="Disabled" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="invalid" note="aria-invalid: destructive ring with a drip; type a valid email to clear it">
      <template #shadcn>
        <Input v-model="bad" type="email" :aria-invalid="badInvalid" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopInput v-model="goopBad" type="email" :aria-invalid="goopBadInvalid" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="password">
      <template #shadcn>
        <Input type="password" placeholder="Password" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopInput type="password" placeholder="Password" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="textarea" note="grows with its content; ripples run along the edge nearest the caret line">
      <template #shadcn>
        <Textarea v-model="bio" placeholder="Type your message here." class="max-w-sm" />
      </template>
      <template #goop>
        <GoopTextarea v-model="goopBio" placeholder="Type your message here." class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="textarea invalid">
      <template #shadcn>
        <Textarea aria-invalid="true" placeholder="Required" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopTextarea aria-invalid="true" placeholder="Required" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="textarea disabled">
      <template #shadcn>
        <Textarea disabled placeholder="Disabled" class="max-w-sm" />
      </template>
      <template #goop>
        <GoopTextarea disabled placeholder="Disabled" class="max-w-sm" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopInput :goo="false" placeholder="Plain shadcn Input" class="max-w-sm" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
