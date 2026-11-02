<script setup lang="ts">
// A props table from a component's docs entry: its `tables[part]` rows, plus any Customize
// control not listed there. In markdown: ::component-props{name="drawer" part="root"}
import { componentDoc } from '~/component-docs/registry'
import { tableRows } from '~/component-docs/runtime'

const props = defineProps<{ name: string; part?: string }>()
const doc = componentDoc(props.name)
const table = computed(() => (doc ? tableRows(doc, props.part) : null))
</script>

<template>
  <DocsPropsTable v-if="table" :rows="table.rows" :caption="table.caption" />
</template>
