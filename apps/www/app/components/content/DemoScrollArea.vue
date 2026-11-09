<script setup lang="ts">
// Live scroll-area demos for the Scroll Area docs page: real <GoopScrollArea>. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'horizontal' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/layout.tsx).
const { isReact } = useFramework()

const tags = Array.from({ length: 50 }, (_, i) => `v1.2.0-beta.${50 - i}`)
const works = ['Ornella Binni', 'Tom Byrom', 'Vladimir Malyavko', 'Annie Spratt', 'Pawel Czerwinski']
</script>

<template>
  <ReactIsland v-if="isReact" demo="scroll-area" :set="set" :pg="{ main: pg.props }" />
  <GoopScrollArea v-else-if="set === 'basic'" class="scroll-demo h-72 w-48 rounded-md border" v-bind="pg.props">
    <div class="p-4">
      <h4 class="mb-4 text-sm leading-none font-medium">Tags</h4>
      <template v-for="tag in tags" :key="tag">
        <div class="text-sm">{{ tag }}</div>
        <GoopSeparator class="my-2" />
      </template>
    </div>
  </GoopScrollArea>
  <GoopScrollArea v-else class="scroll-demo w-full max-w-96 rounded-md border whitespace-nowrap">
    <div class="flex w-max gap-4 p-4">
      <figure v-for="artist in works" :key="artist" class="shrink-0">
        <div class="ratio-art h-36 w-28 rounded-md" />
        <figcaption class="pt-2 text-xs text-muted-foreground">
          Photo by <span class="font-semibold text-foreground">{{ artist }}</span>
        </figcaption>
      </figure>
    </div>
    <GoopScrollBar orientation="horizontal" />
  </GoopScrollArea>
</template>

<style>
/* The docs prose spaces paragraphs and headings. The demo is app UI: undo that. */
.prose .scroll-demo h4,
.prose .scroll-demo figure {
  margin: 0;
}
/* The drawn "photos" (as DemoAspectRatio.vue's), shared with the React island. */
.scroll-demo .ratio-art {
  background:
    radial-gradient(120% 70% at 30% 105%, color-mix(in oklch, var(--foreground) 16%, transparent) 0 55%, transparent 56%),
    linear-gradient(160deg, var(--muted), color-mix(in oklch, var(--muted) 60%, var(--background)));
  box-shadow: inset 0 0 0 1px var(--border);
}
</style>
