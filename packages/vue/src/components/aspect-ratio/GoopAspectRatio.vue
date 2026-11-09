<script setup lang="ts">
// GoopAspectRatio: shadcn-vue's AspectRatio (reka AspectRatio, `ratio`, slot props), a plain
// port with no goo: it only sizes a box, so goo there would be noise. Put goo components
// inside it instead.
import type { AspectRatioProps } from 'reka-ui'
import { AspectRatio } from 'reka-ui'

const props = defineProps<AspectRatioProps>()
</script>

<template>
  <AspectRatio v-slot="slotProps" data-slot="aspect-ratio" v-bind="props">
    <slot v-bind="slotProps" />
  </AspectRatio>
</template>
