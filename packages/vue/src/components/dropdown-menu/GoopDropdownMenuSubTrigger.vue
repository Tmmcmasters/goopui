<script setup lang="ts">
// GoopDropdownMenuSubTrigger: shadcn-vue's DropdownMenuSubTrigger (`inset`, `class`). Its
// submenu's goo emerges from this row; the highlight blob stays on it while the submenu is open.
import { cn } from 'cn'
import type { DropdownMenuSubTriggerProps } from 'reka-ui'
import { DropdownMenuSubTrigger, useForwardProps } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, useTemplateRef, type HTMLAttributes } from 'vue'
import { injectGoopMenuContent, injectGoopMenuSub } from './context'

const props = defineProps<DropdownMenuSubTriggerProps & { class?: HTMLAttributes['class']; inset?: boolean }>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
const menu = injectGoopMenuContent()
const sub = injectGoopMenuSub()

const classes = computed(() =>
  cn(
    menu?.blob.value ? '' : 'focus:bg-accent data-[state=open]:bg-accent',
    'focus:text-accent-foreground data-[state=open]:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-inset:pl-7 [&_svg:not([class*=size-])]:size-4 flex cursor-default items-center outline-hidden select-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    props.class,
  ),
)

const row = useTemplateRef<{ $el: unknown }>('row')
onMounted(() => {
  const el = row.value?.$el
  if (sub && el instanceof HTMLElement) sub.trigger.value = el
})
onBeforeUnmount(() => {
  if (sub) sub.trigger.value = null
})
</script>

<template>
  <DropdownMenuSubTrigger
    ref="row"
    data-slot="dropdown-menu-sub-trigger"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="classes"
  >
    <slot />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="cn-rtl-flip ml-auto"
    ><path d="m9 18 6-6-6-6" /></svg>
  </DropdownMenuSubTrigger>
</template>
