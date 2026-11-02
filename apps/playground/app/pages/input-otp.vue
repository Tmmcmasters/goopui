<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const code = ref<string[]>([])
const goopCode = ref<string[]>([])

const speed = ref(1)
/** Effect toggles (core OTP_EFFECTS). */
const fx = reactive({ flood: true, flow: true, wobble: true, pulse: true })
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
  <ComparePage path="/input-otp">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="InputOTP props">
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

    <CompareRow label="6 digits" note="type a code: the goo flows to the next cell; Backspace sends it back">
      <template #shadcn>
        <PinInput v-model="code" placeholder="">
          <PinInputGroup>
            <PinInputSlot v-for="i in 3" :key="i" :index="i - 1" />
          </PinInputGroup>
          <PinInputSeparator />
          <PinInputGroup>
            <PinInputSlot v-for="i in 3" :key="i" :index="i + 2" />
          </PinInputGroup>
        </PinInput>
      </template>
      <template #goop>
        <GoopInputOTP v-model="goopCode" v-bind="engine" data-test="otp">
          <GoopInputOTPGroup>
            <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i - 1" />
          </GoopInputOTPGroup>
          <GoopInputOTPSeparator />
          <GoopInputOTPGroup>
            <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i + 2" />
          </GoopInputOTPGroup>
        </GoopInputOTP>
      </template>
    </CompareRow>

    <CompareRow label="4 digits, one group">
      <template #goop>
        <GoopInputOTP type="number" v-bind="engine">
          <GoopInputOTPGroup>
            <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
          </GoopInputOTPGroup>
        </GoopInputOTP>
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #goop>
        <GoopInputOTP disabled :default-value="['1', '2', '3']" v-bind="engine">
          <GoopInputOTPGroup>
            <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i - 1" />
          </GoopInputOTPGroup>
        </GoopInputOTP>
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopInputOTP :goo="false">
          <GoopInputOTPGroup>
            <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
          </GoopInputOTPGroup>
        </GoopInputOTP>
      </template>
    </CompareRow>
  </ComparePage>
</template>
