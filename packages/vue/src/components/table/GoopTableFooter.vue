<script setup lang="ts">
// GoopTableFooter: shadcn-vue's TableFooter (a <tfoot>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_FOOTER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <tfoot data-slot="table-footer" :class="cn(TABLE_FOOTER, props.class)">
    <slot />
  </tfoot>
</template>
