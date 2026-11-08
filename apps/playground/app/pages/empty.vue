<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'
import { FolderCodeIcon, InboxIcon } from '@lucide/vue'

/** GoopEmpty props from the panel, applied to every goop empty state on the page. */
const goo = ref(true)
const puddle = ref(true)
const breathe = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({ goo: goo.value, puddle: puddle.value, breathe: breathe.value, speed: speed.value, preset: preset.value || undefined }))
const toggles = { goo, puddle, breathe }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/empty">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Empty props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="4" step="0.05" class="w-28">
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

    <CompareRow label="icon" note="the icon tile sits in a goo puddle that breathes ~1px">
      <template #shadcn>
        <Empty class="border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><FolderCodeIcon /></EmptyMedia>
            <EmptyTitle>No Projects Yet</EmptyTitle>
            <EmptyDescription>You haven't created any projects yet. Get started by creating your first project.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div class="flex gap-2">
              <Button>Create Project</Button>
              <Button variant="outline">Import Project</Button>
            </div>
          </EmptyContent>
        </Empty>
      </template>
      <template #goop>
        <GoopEmpty class="border" data-shot="empty" v-bind="engine">
          <GoopEmptyHeader>
            <GoopEmptyMedia variant="icon"><FolderCodeIcon /></GoopEmptyMedia>
            <GoopEmptyTitle>No Projects Yet</GoopEmptyTitle>
            <GoopEmptyDescription>You haven't created any projects yet. Get started by creating your first project.</GoopEmptyDescription>
          </GoopEmptyHeader>
          <GoopEmptyContent>
            <div class="flex gap-2">
              <GoopButton>Create Project</GoopButton>
              <GoopButton variant="outline">Import Project</GoopButton>
            </div>
          </GoopEmptyContent>
        </GoopEmpty>
      </template>
    </CompareRow>

    <CompareRow label="default media" note="a bare icon in a puddle">
      <template #shadcn>
        <Empty>
          <EmptyHeader>
            <EmptyMedia><InboxIcon class="size-6" /></EmptyMedia>
            <EmptyTitle>Inbox zero</EmptyTitle>
            <EmptyDescription>Nothing to read.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </template>
      <template #goop>
        <GoopEmpty v-bind="engine">
          <GoopEmptyHeader>
            <GoopEmptyMedia data-shot="empty-default"><InboxIcon class="size-6" /></GoopEmptyMedia>
            <GoopEmptyTitle>Inbox zero</GoopEmptyTitle>
            <GoopEmptyDescription>Nothing to read.</GoopEmptyDescription>
          </GoopEmptyHeader>
        </GoopEmpty>
      </template>
    </CompareRow>
  </ComparePage>
</template>
