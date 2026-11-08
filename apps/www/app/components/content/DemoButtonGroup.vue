<script setup lang="ts">
// Live button group demos for the Button Group docs page: real <GoopButtonGroup>. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'vertical' | 'separator' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
</script>

<template>
  <GoopButtonGroup v-if="set === 'basic'" v-bind="pg.props">
    <GoopButton variant="outline">Archive</GoopButton>
    <GoopButton variant="outline">Report</GoopButton>
    <GoopButton variant="outline">Snooze</GoopButton>
  </GoopButtonGroup>

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
