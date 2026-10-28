<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const triggers = ['default', 'secondary', 'outline', 'ghost'] as const
const sides = ['top', 'right', 'bottom', 'left'] as const

/** GoopTooltipContent props from the panel, applied to every goop tooltip on the page. */
const goo = ref(true)
const bridge = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(false)
const closeSlosh = ref(true)
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
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, bridge, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/tooltip">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Tooltip props">
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

    <TooltipProvider>
      <GoopTooltipProvider>
        <CompareRow v-for="variant in triggers" :key="variant" :label="variant">
          <template #shadcn>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button :variant="variant">
                  Hover
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Add to library
              </TooltipContent>
            </Tooltip>
          </template>
          <template #goop>
            <GoopTooltip>
              <GoopTooltipTrigger as-child>
                <GoopButton :variant="variant">
                  Hover
                </GoopButton>
              </GoopTooltipTrigger>
              <GoopTooltipContent v-bind="engine">
                Add to library
              </GoopTooltipContent>
            </GoopTooltip>
          </template>
        </CompareRow>

        <CompareRow label="sides" note="the bridge follows the side, and collision flips">
          <template #shadcn>
            <div class="flex flex-wrap gap-2">
              <Tooltip v-for="side in sides" :key="side">
                <TooltipTrigger as-child>
                  <Button variant="outline" size="sm">
                    {{ side }}
                  </Button>
                </TooltipTrigger>
                <TooltipContent :side="side">
                  On the {{ side }}
                </TooltipContent>
              </Tooltip>
            </div>
          </template>
          <template #goop>
            <div class="flex flex-wrap gap-2">
              <GoopTooltip v-for="side in sides" :key="side">
                <GoopTooltipTrigger as-child>
                  <GoopButton variant="outline" size="sm">
                    {{ side }}
                  </GoopButton>
                </GoopTooltipTrigger>
                <GoopTooltipContent :side="side" v-bind="engine">
                  On the {{ side }}
                </GoopTooltipContent>
              </GoopTooltip>
            </div>
          </template>
        </CompareRow>
      </GoopTooltipProvider>
    </TooltipProvider>
  </ComparePage>
</template>
