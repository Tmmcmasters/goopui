<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

/** GoopPagination props from the panel, applied to every goop pagination on the page. */
const goo = ref(true)
const indicator = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const press = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  indicator: indicator.value,
  wobble: wobble.value,
  momentum: momentum.value,
  press: press.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, indicator, wobble, momentum, press }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/pagination">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Pagination props">
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

    <CompareRow label="default" note="click a page, Previous / Next, or jump to 10">
      <template #shadcn>
        <Pagination v-slot="{ page }" :items-per-page="10" :total="100" :default-page="2">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
          </PaginationContent>
        </Pagination>
      </template>
      <template #goop>
        <GoopPagination v-slot="{ page }" :items-per-page="10" :total="100" :default-page="2" v-bind="engine">
          <GoopPaginationContent v-slot="{ items }">
            <GoopPaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <GoopPaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </GoopPaginationItem>
              <GoopPaginationEllipsis v-else :index="index" />
            </template>
            <GoopPaginationNext />
          </GoopPaginationContent>
        </GoopPagination>
      </template>
    </CompareRow>

    <CompareRow label="first / last" note="show-edges; First / Last jump across the list">
      <template #shadcn>
        <Pagination v-slot="{ page }" :items-per-page="10" :total="100" :default-page="1" show-edges>
          <PaginationContent v-slot="{ items }">
            <PaginationFirst />
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="index" />
            </template>
            <PaginationNext />
            <PaginationLast />
          </PaginationContent>
        </Pagination>
      </template>
      <template #goop>
        <GoopPagination v-slot="{ page }" :items-per-page="10" :total="100" :default-page="1" show-edges v-bind="engine">
          <GoopPaginationContent v-slot="{ items }">
            <GoopPaginationFirst />
            <GoopPaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <GoopPaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </GoopPaginationItem>
              <GoopPaginationEllipsis v-else :index="index" />
            </template>
            <GoopPaginationNext />
            <GoopPaginationLast />
          </GoopPaginationContent>
        </GoopPagination>
      </template>
    </CompareRow>

    <CompareRow label="few pages" note="five pages, no ellipsis: long jumps">
      <template #shadcn>
        <Pagination v-slot="{ page }" :items-per-page="10" :total="50" :default-page="1">
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <PaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </PaginationItem>
            </template>
            <PaginationNext />
          </PaginationContent>
        </Pagination>
      </template>
      <template #goop>
        <GoopPagination v-slot="{ page }" :items-per-page="10" :total="50" :default-page="1" v-bind="engine">
          <GoopPaginationContent v-slot="{ items }">
            <GoopPaginationPrevious />
            <template v-for="(item, index) in items" :key="index">
              <GoopPaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
                {{ item.value }}
              </GoopPaginationItem>
            </template>
            <GoopPaginationNext />
          </GoopPaginationContent>
        </GoopPagination>
      </template>
    </CompareRow>
  </ComparePage>
</template>
