<script setup lang="ts">
// Live pagination demos for the Pagination docs page: real <GoopPagination>. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'edges' | 'plain' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
const variants = [{ preset: 'wild' }, { wobble: false, momentum: false }, { goo: false }] as const
</script>

<template>
  <GoopPagination v-if="set === 'basic'" v-slot="{ page }" :items-per-page="10" :total="100" :default-page="2" v-bind="pg.props">
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

  <GoopPagination v-else-if="set === 'edges'" v-slot="{ page }" :items-per-page="10" :total="50" :default-page="1">
    <GoopPaginationContent v-slot="{ items }">
      <GoopPaginationFirst />
      <GoopPaginationPrevious />
      <template v-for="(item, index) in items" :key="index">
        <GoopPaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
          {{ item.value }}
        </GoopPaginationItem>
      </template>
      <GoopPaginationNext />
      <GoopPaginationLast />
    </GoopPaginationContent>
  </GoopPagination>

  <div v-else class="grid gap-4">
    <GoopPagination v-for="(v, i) in variants" :key="i" v-slot="{ page }" :items-per-page="10" :total="50" :default-page="1" v-bind="v">
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
  </div>
</template>
