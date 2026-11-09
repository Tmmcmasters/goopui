<script setup lang="ts">
// Live button group demos for the Button Group docs page: real <GoopButtonGroup>. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'variants' | 'vertical' | 'separator' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/batch-simple.tsx).
const { isReact } = useFramework()
const VARIANTS = ['default', 'outline', 'secondary', 'ghost'] as const
</script>

<template>
  <ReactIsland v-if="isReact" demo="button-group" :set="set" :pg="{ main: pg.props }" />
  <GoopButtonGroup v-else-if="set === 'basic'" v-bind="pg.props">
    <GoopButton variant="outline">Archive</GoopButton>
    <GoopButton variant="outline">Report</GoopButton>
    <GoopButton variant="outline">Snooze</GoopButton>
  </GoopButtonGroup>

  <div v-else-if="set === 'variants'" class="flex flex-col items-center gap-4">
    <GoopButtonGroup v-for="variant in VARIANTS" :key="variant" :aria-label="`${variant} group`">
      <GoopButton :variant="variant">Bold</GoopButton>
      <GoopButton :variant="variant">Italic</GoopButton>
      <GoopButton :variant="variant">Underline</GoopButton>
    </GoopButtonGroup>
    <GoopButtonGroup aria-label="Zoom">
      <GoopButton variant="outline" size="icon" aria-label="Zoom out"><SiteIcon name="minus" /></GoopButton>
      <GoopButton variant="outline" size="icon" aria-label="Zoom in"><SiteIcon name="plus" /></GoopButton>
    </GoopButtonGroup>
  </div>

  <GoopButtonGroup v-else-if="set === 'vertical'" orientation="vertical">
    <GoopButton variant="outline" size="icon" aria-label="Increase"><SiteIcon name="plus" /></GoopButton>
    <GoopButton variant="outline" size="icon" aria-label="Decrease"><SiteIcon name="minus" /></GoopButton>
  </GoopButtonGroup>

  <div v-else class="flex flex-wrap items-center justify-center gap-4">
    <GoopButtonGroup>
      <GoopButton variant="secondary">Copy</GoopButton>
      <GoopButtonGroupSeparator />
      <GoopButton variant="secondary">Paste</GoopButton>
    </GoopButtonGroup>
    <GoopButtonGroup>
      <GoopButtonGroupText>https://</GoopButtonGroupText>
      <GoopButton variant="outline">goop.dev</GoopButton>
    </GoopButtonGroup>
  </div>
</template>
