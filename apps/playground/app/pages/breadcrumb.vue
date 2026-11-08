<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

/** GoopBreadcrumb props from the panel, applied to every goop breadcrumb on the page. */
const goo = ref(true)
const highlight = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const followPointer = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  wobble: wobble.value,
  momentum: momentum.value,
  followPointer: followPointer.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, highlight, wobble, momentum, followPointer }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/breadcrumb">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Breadcrumb props">
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

    <CompareRow label="default" note="hover along the links: one blob flows between them">
      <template #shadcn>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </template>
      <template #goop>
        <GoopBreadcrumb data-shot="breadcrumb" v-bind="engine">
          <GoopBreadcrumbList>
            <GoopBreadcrumbItem><GoopBreadcrumbLink href="#">Home</GoopBreadcrumbLink></GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem><GoopBreadcrumbEllipsis /></GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem><GoopBreadcrumbLink href="#">Components</GoopBreadcrumbLink></GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem><GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage></GoopBreadcrumbItem>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      </template>
    </CompareRow>

    <CompareRow label="long trail" note="wraps on narrow screens; Tab through the links">
      <template #shadcn>
        <Breadcrumb>
          <BreadcrumbList>
            <template v-for="(l, i) in ['Home', 'Docs', 'Components', 'Navigation', 'Breadcrumb']" :key="l">
              <BreadcrumbSeparator v-if="i" />
              <BreadcrumbItem><BreadcrumbLink href="#">{{ l }}</BreadcrumbLink></BreadcrumbItem>
            </template>
          </BreadcrumbList>
        </Breadcrumb>
      </template>
      <template #goop>
        <GoopBreadcrumb v-bind="engine">
          <GoopBreadcrumbList>
            <template v-for="(l, i) in ['Home', 'Docs', 'Components', 'Navigation', 'Breadcrumb']" :key="l">
              <GoopBreadcrumbSeparator v-if="i" />
              <GoopBreadcrumbItem><GoopBreadcrumbLink href="#">{{ l }}</GoopBreadcrumbLink></GoopBreadcrumbItem>
            </template>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      </template>
    </CompareRow>

    <CompareRow label="custom separator" note="slash separators">
      <template #shadcn>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </template>
      <template #goop>
        <GoopBreadcrumb v-bind="engine">
          <GoopBreadcrumbList>
            <GoopBreadcrumbItem><GoopBreadcrumbLink href="#">Home</GoopBreadcrumbLink></GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
            <GoopBreadcrumbItem><GoopBreadcrumbLink href="#">Components</GoopBreadcrumbLink></GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
            <GoopBreadcrumbItem><GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage></GoopBreadcrumbItem>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      </template>
    </CompareRow>
  </ComparePage>
</template>
