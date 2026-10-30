<script setup lang="ts">
import type { GoopPreset, GoopRendererName, SelectBloomFrom } from '@goopui/core'

const fruits = ['Apple', 'Banana', 'Blueberry', 'Grapes', 'Pineapple'] as const
const zones = {
  'North America': ['Eastern (EST)', 'Central (CST)', 'Mountain (MST)', 'Pacific (PST)', 'Alaska (AKST)', 'Hawaii (HST)'],
  'Europe & Africa': ['Greenwich (GMT)', 'Central European (CET)', 'Eastern European (EET)', 'Western European Summer (WEST)', 'Central Africa (CAT)', 'East Africa (EAT)'],
  Asia: ['Moscow (MSK)', 'India (IST)', 'China (CST)', 'Japan (JST)', 'Korea (KST)', 'Indonesia Central (WITA)'],
  'Australia & Pacific': ['Australian Western (AWST)', 'Australian Central (ACST)', 'Australian Eastern (AEST)', 'New Zealand (NZST)', 'Fiji (FJT)'],
  'South America': ['Argentina (ART)', 'Bolivia (BOT)', 'Brasilia (BRT)', 'Chile (CLT)'],
} as const
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const fruit = ref('banana')
const goopFruit = ref('banana')
const fruitPopper = ref('banana')
const goopFruitPopper = ref('banana')
const zone = ref(slug('Japan (JST)'))
const goopZone = ref(slug('Japan (JST)'))
const zonePopper = ref<string>()
const goopZonePopper = ref<string>()

/** GoopSelectContent props from the panel, applied to every goop select on the page. */
const goo = ref(true)
const flow = ref(true)
const flowStyle = ref<'bloom' | 'neck'>('bloom')
const bloomStart = ref<'single' | 'merge'>('single')
/** Where the bloom starts: auto = the selected item when item-aligned, the center for popper. */
const bloomFrom = ref<SelectBloomFrom>('auto')
const highlight = ref(true)
const pop = ref(true)
/** The highlight's swell follows the pointer along the item (false: centred). */
const followPointer = ref(true)
const plop = ref(true)
const bridge = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
/** Panel color: shadcn's popover tokens (default), the trigger's, or a fixed CSS color. */
const surface = ref('popover')
const surfaces = [
  ['popover', 'popover tokens (default)'],
  ['trigger', 'trigger'],
  ['oklch(0.62 0.19 150)', 'green'],
  ['oklch(0.55 0.22 290)', 'purple'],
] as const
const engine = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  pop: pop.value,
  followPointer: followPointer.value,
  plop: plop.value,
  flow: flow.value,
  flowStyle: flowStyle.value,
  bloomStart: bloomStart.value,
  bloomFrom: bloomFrom.value,
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
  surface: surface.value,
}))
const toggles = { goo, flow, highlight, pop, followPointer, plop, bridge, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/select">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Select props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomFrom</span>
          <select v-model="bloomFrom" :class="selectClass" :disabled="!flow || flowStyle !== 'bloom'">
            <option value="auto">auto (default)</option>
            <option value="selected">selected</option>
            <option value="center">center</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">flowStyle</span>
          <select v-model="flowStyle" :class="selectClass" :disabled="!flow">
            <option value="bloom">bloom (default)</option>
            <option value="neck">neck</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomStart</span>
          <select v-model="bloomStart" :class="selectClass" :disabled="!flow || flowStyle !== 'bloom'">
            <option value="single">single (default)</option>
            <option value="merge">merge</option>
          </select>
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
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">surface</span>
          <select v-model="surface" :class="selectClass">
            <option v-for="[value, label] in surfaces" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="item-aligned" note="shadcn's default: the list lies over the trigger and blooms out of the selected item">
      <template #shadcn>
        <Select v-model="fruit">
          <SelectTrigger class="w-44">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem v-for="f in fruits" :key="f" :value="slug(f)">
                {{ f }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </template>
      <template #goop>
        <GoopSelect v-model="goopFruit">
          <GoopSelectTrigger class="w-44">
            <GoopSelectValue placeholder="Select a fruit" />
          </GoopSelectTrigger>
          <GoopSelectContent v-bind="engine">
            <GoopSelectGroup>
              <GoopSelectLabel>Fruits</GoopSelectLabel>
              <GoopSelectItem v-for="f in fruits" :key="f" :value="slug(f)">
                {{ f }}
              </GoopSelectItem>
            </GoopSelectGroup>
          </GoopSelectContent>
        </GoopSelect>
      </template>
    </CompareRow>

    <CompareRow label="popper" note="position=&quot;popper&quot;: below the trigger, blooms from its own center">
      <template #shadcn>
        <Select v-model="fruitPopper">
          <SelectTrigger class="w-44">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem v-for="f in fruits" :key="f" :value="slug(f)">
                {{ f }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </template>
      <template #goop>
        <GoopSelect v-model="goopFruitPopper">
          <GoopSelectTrigger class="w-44">
            <GoopSelectValue placeholder="Select a fruit" />
          </GoopSelectTrigger>
          <GoopSelectContent position="popper" v-bind="engine">
            <GoopSelectGroup>
              <GoopSelectLabel>Fruits</GoopSelectLabel>
              <GoopSelectItem v-for="f in fruits" :key="f" :value="slug(f)">
                {{ f }}
              </GoopSelectItem>
            </GoopSelectGroup>
          </GoopSelectContent>
        </GoopSelect>
      </template>
    </CompareRow>

    <CompareRow label="long list" note="item-aligned, scrolls (hover the arrows); the blob stays inside the list">
      <template #shadcn>
        <Select v-model="zone">
          <SelectTrigger class="w-64">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            <template v-for="(list, region, i) in zones" :key="region">
              <SelectSeparator v-if="i > 0" />
              <SelectGroup>
                <SelectLabel>{{ region }}</SelectLabel>
                <SelectItem v-for="z in list" :key="z" :value="slug(z)">
                  {{ z }}
                </SelectItem>
              </SelectGroup>
            </template>
          </SelectContent>
        </Select>
      </template>
      <template #goop>
        <GoopSelect v-model="goopZone">
          <GoopSelectTrigger class="w-64">
            <GoopSelectValue placeholder="Select a timezone" />
          </GoopSelectTrigger>
          <GoopSelectContent v-bind="engine">
            <template v-for="(list, region, i) in zones" :key="region">
              <GoopSelectSeparator v-if="i > 0" />
              <GoopSelectGroup>
                <GoopSelectLabel>{{ region }}</GoopSelectLabel>
                <GoopSelectItem v-for="z in list" :key="z" :value="slug(z)">
                  {{ z }}
                </GoopSelectItem>
              </GoopSelectGroup>
            </template>
          </GoopSelectContent>
        </GoopSelect>
      </template>
    </CompareRow>

    <CompareRow label="long list, popper" note="max height from the space below the trigger, scrolls">
      <template #shadcn>
        <Select v-model="zonePopper">
          <SelectTrigger class="w-64">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent position="popper" class="max-h-72">
            <template v-for="(list, region, i) in zones" :key="region">
              <SelectSeparator v-if="i > 0" />
              <SelectGroup>
                <SelectLabel>{{ region }}</SelectLabel>
                <SelectItem v-for="z in list" :key="z" :value="slug(z)">
                  {{ z }}
                </SelectItem>
              </SelectGroup>
            </template>
          </SelectContent>
        </Select>
      </template>
      <template #goop>
        <GoopSelect v-model="goopZonePopper">
          <GoopSelectTrigger class="w-64">
            <GoopSelectValue placeholder="Select a timezone" />
          </GoopSelectTrigger>
          <GoopSelectContent position="popper" class="max-h-72" v-bind="engine">
            <template v-for="(list, region, i) in zones" :key="region">
              <GoopSelectSeparator v-if="i > 0" />
              <GoopSelectGroup>
                <GoopSelectLabel>{{ region }}</GoopSelectLabel>
                <GoopSelectItem v-for="z in list" :key="z" :value="slug(z)">
                  {{ z }}
                </GoopSelectItem>
              </GoopSelectGroup>
            </template>
          </GoopSelectContent>
        </GoopSelect>
      </template>
    </CompareRow>
  </ComparePage>
</template>
