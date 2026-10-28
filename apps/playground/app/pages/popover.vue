<script setup lang="ts">
import { EMERGE_DRIP_KNOBS, type EmergeDripOptions, type GoopPreset, type GoopRendererName } from '@goopui/core'

const triggers = ['default', 'secondary', 'outline', 'ghost'] as const
const sides = ['top', 'right', 'bottom', 'left'] as const
const aligns = ['start', 'center', 'end'] as const

/** GoopPopoverContent props from the panel, applied to every goop popover on the page. */
const goo = ref(true)
const bridge = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
/** openDrips strength (0..2) while the toggle is on, and the burst knobs. */
const dripStrength = ref(1)
const dripKnobs = reactive(
  Object.fromEntries(Object.entries(EMERGE_DRIP_KNOBS).map(([k, m]) => [k, m.default])) as Required<EmergeDripOptions>,
)
const knobList = Object.entries(EMERGE_DRIP_KNOBS) as [keyof EmergeDripOptions, (typeof EMERGE_DRIP_KNOBS)[keyof EmergeDripOptions]][]
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  bridge: bridge.value,
  wobble: wobble.value,
  momentum: momentum.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value ? dripStrength.value : false,
  ...dripKnobs,
  closeSlosh: closeSlosh.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, bridge, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/popover">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Popover props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">drip strength: {{ dripStrength.toFixed(2) }}</span>
          <input v-model.number="dripStrength" type="range" min="0" max="2" step="0.05" class="w-28" :disabled="!openDrips">
        </label>
        <label v-for="[key, m] in knobList" :key="key" class="grid gap-1" :title="m.description">
          <span class="text-xs text-muted-foreground">{{ key }}: {{ dripKnobs[key].toFixed(2) }}</span>
          <input v-model.number="dripKnobs[key]" type="range" :min="m.min" :max="m.max" :step="m.step" class="w-28" :disabled="!openDrips">
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

    <CompareRow v-for="variant in triggers" :key="variant" :label="variant">
      <template #shadcn>
        <Popover>
          <PopoverTrigger as-child>
            <Button :variant="variant">
              Open popover
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Dimensions</PopoverTitle>
              <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </template>
      <template #goop>
        <GoopPopover>
          <GoopPopoverTrigger as-child>
            <GoopButton :variant="variant">
              Open popover
            </GoopButton>
          </GoopPopoverTrigger>
          <GoopPopoverContent v-bind="engine">
            <GoopPopoverHeader>
              <GoopPopoverTitle>Dimensions</GoopPopoverTitle>
              <GoopPopoverDescription>Set the dimensions for the layer.</GoopPopoverDescription>
            </GoopPopoverHeader>
          </GoopPopoverContent>
        </GoopPopover>
      </template>
    </CompareRow>

    <CompareRow label="sides">
      <template #shadcn>
        <Popover v-for="side in sides" :key="side">
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm">
              {{ side }}
            </Button>
          </PopoverTrigger>
          <PopoverContent :side="side" class="w-56">
            <PopoverHeader>
              <PopoverTitle>Side: {{ side }}</PopoverTitle>
              <PopoverDescription>The goo bridge should follow this edge.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </template>
      <template #goop>
        <GoopPopover v-for="side in sides" :key="side">
          <GoopPopoverTrigger as-child>
            <GoopButton variant="outline" size="sm">
              {{ side }}
            </GoopButton>
          </GoopPopoverTrigger>
          <GoopPopoverContent :side="side" class="w-56" v-bind="engine">
            <GoopPopoverHeader>
              <GoopPopoverTitle>Side: {{ side }}</GoopPopoverTitle>
              <GoopPopoverDescription>The goo bridge follows this edge.</GoopPopoverDescription>
            </GoopPopoverHeader>
          </GoopPopoverContent>
        </GoopPopover>
      </template>
    </CompareRow>

    <CompareRow label="align" note="bridge stays in line with the trigger">
      <template #shadcn>
        <Popover v-for="align in aligns" :key="align">
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm">
              {{ align }}
            </Button>
          </PopoverTrigger>
          <PopoverContent :align="align">
            <PopoverHeader>
              <PopoverTitle>Align: {{ align }}</PopoverTitle>
              <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </template>
      <template #goop>
        <GoopPopover v-for="align in aligns" :key="align">
          <GoopPopoverTrigger as-child>
            <GoopButton variant="outline" size="sm">
              {{ align }}
            </GoopButton>
          </GoopPopoverTrigger>
          <GoopPopoverContent :align="align" v-bind="engine">
            <GoopPopoverHeader>
              <GoopPopoverTitle>Align: {{ align }}</GoopPopoverTitle>
              <GoopPopoverDescription>Set the dimensions for the layer.</GoopPopoverDescription>
            </GoopPopoverHeader>
          </GoopPopoverContent>
        </GoopPopover>
      </template>
    </CompareRow>
  </ComparePage>
</template>
