<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'
import { ArchiveIcon, ChevronDownIcon, MinusIcon, PlusIcon } from '@lucide/vue'

/** GoopButtonGroup props from the panel, applied to every goop group on the page. */
const goo = ref(true)
const press = ref(true)
const tug = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({ goo: goo.value, press: press.value, tug: tug.value, speed: speed.value, preset: preset.value || undefined }))
const toggles = { goo, press, tug }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/button-group">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Button group props">
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
      </section>
    </template>

    <CompareRow label="outline" note="press a button: it squishes and tugs its neighbours">
      <template #shadcn>
        <ButtonGroup>
          <Button variant="outline">Archive</Button>
          <Button variant="outline">Report</Button>
          <Button variant="outline">Snooze</Button>
        </ButtonGroup>
      </template>
      <template #goop>
        <GoopButtonGroup data-shot="button-group" v-bind="engine">
          <GoopButton variant="outline">Archive</GoopButton>
          <GoopButton variant="outline">Report</GoopButton>
          <GoopButton variant="outline">Snooze</GoopButton>
        </GoopButtonGroup>
      </template>
    </CompareRow>

    <CompareRow label="vertical" note="orientation=vertical">
      <template #shadcn>
        <ButtonGroup orientation="vertical">
          <Button variant="outline" size="icon"><PlusIcon /></Button>
          <Button variant="outline" size="icon"><MinusIcon /></Button>
        </ButtonGroup>
      </template>
      <template #goop>
        <GoopButtonGroup orientation="vertical" data-shot="button-group-v" v-bind="engine">
          <GoopButton variant="outline" size="icon" aria-label="Increase"><PlusIcon /></GoopButton>
          <GoopButton variant="outline" size="icon" aria-label="Decrease"><MinusIcon /></GoopButton>
        </GoopButtonGroup>
      </template>
    </CompareRow>

    <CompareRow label="separator / text" note="secondary buttons with a separator; text addon">
      <template #shadcn>
        <ButtonGroup>
          <Button variant="secondary">Copy</Button>
          <ButtonGroupSeparator />
          <Button variant="secondary">Paste</Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText>https://</ButtonGroupText>
          <Button variant="outline">goop.dev</Button>
        </ButtonGroup>
      </template>
      <template #goop>
        <GoopButtonGroup v-bind="engine">
          <GoopButton variant="secondary">Copy</GoopButton>
          <GoopButtonGroupSeparator />
          <GoopButton variant="secondary">Paste</GoopButton>
        </GoopButtonGroup>
        <GoopButtonGroup v-bind="engine">
          <GoopButtonGroupText>https://</GoopButtonGroupText>
          <GoopButton variant="outline">goop.dev</GoopButton>
        </GoopButtonGroup>
      </template>
    </CompareRow>

    <CompareRow label="split" note="a primary action and its menu chevron">
      <template #shadcn>
        <ButtonGroup>
          <Button><ArchiveIcon /> Archive</Button>
          <ButtonGroupSeparator />
          <Button size="icon"><ChevronDownIcon /></Button>
        </ButtonGroup>
      </template>
      <template #goop>
        <GoopButtonGroup v-bind="engine">
          <GoopButton><ArchiveIcon /> Archive</GoopButton>
          <GoopButtonGroupSeparator />
          <GoopButton size="icon" aria-label="More"><ChevronDownIcon /></GoopButton>
        </GoopButtonGroup>
      </template>
    </CompareRow>
  </ComparePage>
</template>
