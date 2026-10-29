<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const sides = ['top', 'right', 'bottom', 'left'] as const

/** GoopSheetContent props from the panel, applied to every goop sheet on the page. */
const goo = ref(true)
const lobes = ref(true)
const slosh = ref(true)
const drips = ref(true)
const suck = ref(true)
const fade = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  lobes: lobes.value,
  slosh: slosh.value,
  drips: drips.value,
  suck: suck.value,
  fade: fade.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, lobes, slosh, drips, suck, fade }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/sheet">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Sheet props">
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
            <option value="">auto (canvas)</option>
            <option value="canvas">canvas</option>
            <option value="svg">svg</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow v-for="side in sides" :key="side" :label="side" :note="side === 'top' ? 'drips hang off the front' : side === 'bottom' ? 'drops flung up at the stop' : undefined">
      <template #shadcn>
        <Sheet>
          <SheetTrigger as-child>
            <Button variant="outline">
              Open {{ side }}
            </Button>
          </SheetTrigger>
          <SheetContent :side="side">
            <SheetHeader>
              <SheetTitle>Edit profile</SheetTitle>
              <SheetDescription>Make changes to your profile here. Click save when you're done.</SheetDescription>
            </SheetHeader>
            <div class="grid gap-3 px-4">
              <label class="grid gap-1.5 text-sm">
                Name
                <input class="h-9 rounded-md border bg-transparent px-3" value="Pedro Duarte">
              </label>
            </div>
            <SheetFooter>
              <SheetClose as-child>
                <Button>Save changes</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </template>
      <template #goop>
        <GoopSheet>
          <GoopSheetTrigger as-child>
            <GoopButton variant="outline">
              Open {{ side }}
            </GoopButton>
          </GoopSheetTrigger>
          <GoopSheetContent :side="side" v-bind="engine">
            <GoopSheetHeader>
              <GoopSheetTitle>Edit profile</GoopSheetTitle>
              <GoopSheetDescription>Make changes to your profile here. Click save when you're done.</GoopSheetDescription>
            </GoopSheetHeader>
            <div class="grid gap-3 px-4">
              <label class="grid gap-1.5 text-sm">
                Name
                <input class="h-9 rounded-md border bg-transparent px-3" value="Pedro Duarte">
              </label>
            </div>
            <GoopSheetFooter>
              <GoopSheetClose as-child>
                <GoopButton>Save changes</GoopButton>
              </GoopSheetClose>
            </GoopSheetFooter>
          </GoopSheetContent>
        </GoopSheet>
      </template>
    </CompareRow>
  </ComparePage>
</template>
