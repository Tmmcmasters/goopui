<script setup lang="ts">
// GoopTableEmpty: shadcn-vue's TableEmpty (a full-width row with a centred message). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import GoopTableCell from './GoopTableCell.vue'
import GoopTableRow from './GoopTableRow.vue'
import { TABLE_EMPTY_CELL } from './styles'

const props = withDefaults(defineProps<{ class?: HTMLAttributes['class']; colspan?: number }>(), { colspan: 1 })
</script>

<template>
  <GoopTableRow>
    <GoopTableCell :class="cn(TABLE_EMPTY_CELL, props.class)" :colspan="props.colspan">
      <div class="flex items-center justify-center py-10">
        <slot />
      </div>
    </GoopTableCell>
  </GoopTableRow>
</template>
