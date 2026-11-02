<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, BoldIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from '@lucide/vue'

const bold = ref(false)
const goopBold = ref(false)
const italic = ref(true)
const goopItalic = ref(true)
const align = ref('left')
const goopAlign = ref('left')
const marks = ref<string[]>(['bold'])
const goopMarks = ref<string[]>(['bold', 'italic'])
const gapMarks = ref<string[]>(['bold'])
const days = ref<string[]>(['mon', 'tue'])

const formats = [
  { value: 'bold', icon: BoldIcon, label: 'Toggle bold' },
  { value: 'italic', icon: ItalicIcon, label: 'Toggle italic' },
  { value: 'underline', icon: UnderlineIcon, label: 'Toggle underline' },
  { value: 'strike', icon: StrikethroughIcon, label: 'Toggle strikethrough' },
]
const aligns = [
  { value: 'left', icon: AlignLeftIcon, label: 'Align left' },
  { value: 'center', icon: AlignCenterIcon, label: 'Align center' },
  { value: 'right', icon: AlignRightIcon, label: 'Align right' },
]
const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri']

/** Toggle props from the panel, applied to every Goop toggle on the page. */
const speed = ref(1)
/** Effect toggles (core TOGGLE_GROUP_EFFECTS; a single toggle ignores flow / merge). */
const fx = reactive({ flood: true, wobble: true, droplets: true, flow: true, merge: true })
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
/** shadcn fills pressed toggles with --accent (very pale); `primary` shows the goo clearly. */
const tint = ref<'accent' | 'primary'>('primary')
const engine = computed(() => ({
  speed: speed.value,
  ...fx,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggleEngine = computed(() => {
  const { flow: _f, merge: _m, ...rest } = engine.value
  return rest
})
/** Goo color (on the host) and the pressed label color (on each toggle / item). */
const tintRoot = computed(() => (tint.value === 'primary' ? '[--goop-toggle-fill:var(--primary)]' : ''))
const tintItem = computed(() => (tint.value === 'primary' ? 'data-[state=on]:text-primary-foreground' : ''))
/** The same tint for the shadcn originals (a real background). */
const tintShadcn = computed(() => (tint.value === 'primary' ? 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground' : ''))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/toggle">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Toggle props">
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
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">fill color</span>
          <select v-model="tint" :class="selectClass">
            <option value="primary">primary (demo)</option>
            <option value="accent">accent (shadcn default)</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="toggle" note="press anywhere on it: the goo floods out of that point">
      <template #shadcn>
        <div class="flex gap-2">
          <Toggle v-model="bold" aria-label="Toggle bold" :class="tintShadcn">
            <BoldIcon />
          </Toggle>
          <Toggle v-model="italic" variant="outline" :class="tintShadcn">
            <ItalicIcon /> Italic
          </Toggle>
        </div>
      </template>
      <template #goop>
        <div class="flex gap-2">
          <GoopToggle v-model="goopBold" aria-label="Toggle bold" :class="[tintRoot, tintItem]" v-bind="toggleEngine">
            <BoldIcon />
          </GoopToggle>
          <GoopToggle v-model="goopItalic" variant="outline" :class="[tintRoot, tintItem]" v-bind="toggleEngine">
            <ItalicIcon /> Italic
          </GoopToggle>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="sizes" note="sm, default, lg (outline)">
      <template #goop>
        <div class="flex items-center gap-2">
          <GoopToggle v-for="s in (['sm', 'default', 'lg'] as const)" :key="s" :size="s" variant="outline" default-value :class="[tintRoot, tintItem]" v-bind="toggleEngine">
            <UnderlineIcon /> {{ s }}
          </GoopToggle>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="group: single" note="the goo flows from the old item to the new one (arrow keys too)">
      <template #shadcn>
        <ToggleGroup v-model="align" type="single" variant="outline">
          <ToggleGroupItem v-for="a in aligns" :key="a.value" :value="a.value" :aria-label="a.label" :class="tintShadcn">
            <component :is="a.icon" />
          </ToggleGroupItem>
        </ToggleGroup>
      </template>
      <template #goop>
        <GoopToggleGroup v-model="goopAlign" type="single" variant="outline" :class="tintRoot" v-bind="engine">
          <GoopToggleGroupItem v-for="a in aligns" :key="a.value" :value="a.value" :aria-label="a.label" :class="tintItem">
            <component :is="a.icon" />
          </GoopToggleGroupItem>
        </GoopToggleGroup>
      </template>
    </CompareRow>

    <CompareRow label="group: multiple" note="neighbouring pressed items merge; un-press one in the middle to tear them">
      <template #shadcn>
        <ToggleGroup v-model="marks" type="multiple">
          <ToggleGroupItem v-for="f in formats" :key="f.value" :value="f.value" :aria-label="f.label" :class="tintShadcn">
            <component :is="f.icon" />
          </ToggleGroupItem>
        </ToggleGroup>
      </template>
      <template #goop>
        <GoopToggleGroup v-model="goopMarks" type="multiple" :class="tintRoot" v-bind="engine">
          <GoopToggleGroupItem v-for="f in formats" :key="f.value" :value="f.value" :aria-label="f.label" :class="tintItem">
            <component :is="f.icon" />
          </GoopToggleGroupItem>
        </GoopToggleGroup>
      </template>
    </CompareRow>

    <CompareRow label="spacing 2" note="goo only: with a gap, merged neighbours bridge across it">
      <template #goop>
        <GoopToggleGroup v-model="gapMarks" type="multiple" variant="outline" :spacing="2" :class="tintRoot" v-bind="engine">
          <GoopToggleGroupItem v-for="f in formats" :key="f.value" :value="f.value" :aria-label="f.label" :class="tintItem">
            <component :is="f.icon" />
          </GoopToggleGroupItem>
        </GoopToggleGroup>
      </template>
    </CompareRow>

    <CompareRow label="text, lg" note="goo only: wider items, longer flows">
      <template #goop>
        <GoopToggleGroup v-model="days" type="multiple" size="lg" :class="tintRoot" v-bind="engine">
          <GoopToggleGroupItem v-for="d in weekdays" :key="d" :value="d" class="capitalize" :class="tintItem">
            {{ d }}
          </GoopToggleGroupItem>
        </GoopToggleGroup>
      </template>
    </CompareRow>

    <CompareRow label="vertical" note="goo only: single select, orientation vertical">
      <template #goop>
        <GoopToggleGroup default-value="center" type="single" orientation="vertical" variant="outline" :spacing="1" class="flex-col" :class="tintRoot" v-bind="engine">
          <GoopToggleGroupItem v-for="a in aligns" :key="a.value" :value="a.value" :aria-label="a.label" :class="tintItem">
            <component :is="a.icon" />
          </GoopToggleGroupItem>
        </GoopToggleGroup>
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <div class="flex gap-4">
          <GoopToggle :goo="false" default-value aria-label="Toggle bold">
            <BoldIcon />
          </GoopToggle>
          <GoopToggleGroup type="single" default-value="a" :goo="false">
            <GoopToggleGroupItem value="a">A</GoopToggleGroupItem>
            <GoopToggleGroupItem value="b">B</GoopToggleGroupItem>
          </GoopToggleGroup>
        </div>
      </template>
    </CompareRow>
  </ComparePage>
</template>
