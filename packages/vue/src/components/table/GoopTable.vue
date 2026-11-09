<script setup lang="ts">
// GoopTable: shadcn-vue's Table (a scrolling `table-container` <div> around the <table>, `class`
// merge on the table) whose body rows' hover background is ONE goo blob (core
// `attachTableHighlight`, the menu highlight engine with a calm feel and a pointer swell). It
// glides from row to row as the pointer moves down the table and fades out when it leaves;
// with `selected` it rests on the selected row. The blob is aria-hidden, in a clipping stage
// behind the rows (never changes the container's scroll size); while it is attached the rows
// drop their flat hover fill (goop.css). Touch never lights a row. Reduced motion: the blob
// snaps. Browser-only: SSR renders shadcn markup.
import { attachTableHighlight, type TableHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toTableOptions, type GoopTableProps } from '../../goop-props'
import { TABLE, TABLE_CONTAINER } from './styles'

const props = withDefaults(defineProps<GoopTableProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  highlight: undefined,
  wobble: undefined,
  momentum: undefined,
  followPointer: undefined,
  selected: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})

const config = useGoopConfig()
const options = computed(() => toTableOptions(props, config))
const blob = computed(() => options.value !== null)

const el = useTemplateRef<HTMLElement>('el')
const handle = shallowRef<TableHighlightHandle | null>(null)
let mounted = false
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
const sync = (): void => {
  const opts = options.value
  if (!mounted || !el.value || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachTableHighlight(el.value, opts)
}
onMounted(() => {
  mounted = true
  sync()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(options, sync, { flush: 'post' })

defineExpose({
  /** The live row highlight handle (null before mount / when the blob is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <div ref="el" data-slot="table-container" :data-goop-table="blob ? '' : undefined" :class="TABLE_CONTAINER">
    <table data-slot="table" :class="cn(TABLE, props.class)">
      <slot />
    </table>
  </div>
</template>
