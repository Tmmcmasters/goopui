<script setup lang="ts">
// GoopPagination: shadcn-vue's Pagination (reka-ui PaginationRoot, same props / emits / slot,
// `class` merge, `asChild`). Engine props set here (goo, indicator, wobble, momentum, press,
// speed, preset, renderer) are inherited by every part; a part's own prop wins there.
// `:goo="false"` renders plain shadcn Pagination parts.
import type { PaginationRootEmits, PaginationRootProps } from 'reka-ui'
import { PaginationRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { PAGINATION_PROP_KEYS, resolvePaginationProps, type GoopPaginationProps, type GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { provideGoopPagination } from './context'

const props = withDefaults(
  defineProps<PaginationRootProps & GoopPaginationProps & GoopSoundProps & { class?: HTMLAttributes['class'] }>(),
  {
    sound: undefined,
    goo: undefined,
    indicator: undefined,
    wobble: undefined,
    momentum: undefined,
    press: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
    disabled: undefined,
    showEdges: undefined,
    asChild: undefined,
  },
)
const emits = defineEmits<PaginationRootEmits>()

const OWN = new Set<string>([...PAGINATION_PROP_KEYS, 'sound', 'class'])
const delegated = computed(
  () => Object.fromEntries(Object.entries(props).filter(([k, v]) => !OWN.has(k) && v !== undefined)) as unknown as PaginationRootProps,
)
const forwarded = useForwardPropsEmits(delegated, emits)
useGoopSound(() => props.sound)
provideGoopPagination(computed(() => resolvePaginationProps(props)))
</script>

<template>
  <PaginationRoot
    v-slot="slotProps"
    data-slot="pagination"
    v-bind="forwarded"
    :class="cn('mx-auto flex w-full justify-center', props.class)"
  >
    <slot v-bind="slotProps" />
  </PaginationRoot>
</template>
