<script setup lang="ts">
// Live spinner demos for the Spinner docs page. `set` picks the group; keep each set in
// sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'playground' | 'default' | 'variants' | 'sizes' | 'button' | 'options' }>(), { set: 'default' })
const variants = ['orbit', 'comet', 'ring', 'dots', 'pulse'] as const

// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react spinners (react-demos/batch1.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="spinner" :set="set" :pg="{ main: pg.props }" />
  <GoopSpinner v-else-if="set === 'playground'" class="size-12" v-bind="pg.props" />
  <template v-else-if="set === 'default'">
    <GoopSpinner class="size-10" />
  </template>
  <template v-else-if="set === 'variants'">
    <figure v-for="v in variants" :key="v" class="m-0 flex flex-col items-center gap-2">
      <GoopSpinner class="size-12" :variant="v" />
      <figcaption class="font-mono text-xs text-muted-foreground">{{ v }}</figcaption>
    </figure>
  </template>
  <template v-else-if="set === 'sizes'">
    <GoopSpinner class="size-4" />
    <GoopSpinner class="size-6" />
    <GoopSpinner class="size-8" />
    <GoopSpinner class="size-12" />
    <GoopSpinner class="size-6 text-primary" />
    <GoopSpinner class="size-6 text-destructive" />
  </template>
  <template v-else-if="set === 'button'">
    <GoopButton disabled>
      <GoopSpinner data-icon="inline-start" />
      Saving
    </GoopButton>
    <GoopButton variant="outline" disabled>
      <GoopSpinner data-icon="inline-start" variant="comet" />
      Loading
    </GoopButton>
  </template>
  <template v-else-if="set === 'options'">
    <GoopSpinner class="size-12" :blobs="6" />
    <GoopSpinner class="size-12" :speed="2" />
    <GoopSpinner class="size-12" drips />
    <GoopSpinner class="size-12" preset="wild" />
    <GoopSpinner class="size-12" :interactive="false" />
  </template>
</template>
