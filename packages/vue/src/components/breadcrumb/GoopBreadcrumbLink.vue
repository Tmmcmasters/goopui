<script setup lang="ts">
// GoopBreadcrumbLink: shadcn-vue's BreadcrumbLink (reka-ui Primitive, `as` default 'a',
// `asChild`, `class` merge). Under GoopBreadcrumbList's goo blob it gets a little padding for
// the blob, given back with equal negative margins (no layout shift).
import { cn } from 'cn'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopBreadcrumbBlob } from './context'
import { BREADCRUMB_LINK, goopBreadcrumbLink } from './styles'

const props = withDefaults(defineProps<PrimitiveProps & { class?: HTMLAttributes['class'] }>(), { as: 'a' })
const list = injectGoopBreadcrumbBlob()
const blob = computed(() => list?.value === true)
</script>

<template>
  <Primitive data-slot="breadcrumb-link" :as="as" :as-child="asChild" :class="cn(BREADCRUMB_LINK, blob && goopBreadcrumbLink, props.class)">
    <slot />
  </Primitive>
</template>
