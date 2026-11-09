<script setup lang="ts">
// Live alert demos for the Alert docs page: real <GoopAlert>. `set` picks the group. Keep each
// set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'destructive' | 'plain' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
const replay = ref(0)
// On /react/docs: the same sets, as real @goopui/react components (react-demos/batch-simple.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="alert" :set="set" :pg="{ main: pg.props }" />
  <GoopAlert v-else-if="set === 'basic'" class="max-w-md" v-bind="pg.props">
    <SiteIcon :name="pg.props.variant === 'destructive' ? 'circleAlert' : 'circleCheck'" />
    <GoopAlertTitle>Success! Your changes have been saved</GoopAlertTitle>
    <GoopAlertDescription>This is an alert with icon, title and description.</GoopAlertDescription>
  </GoopAlert>

  <div v-else-if="set === 'destructive'" class="alert-demo w-full max-w-md">
    <GoopAlert variant="destructive">
      <SiteIcon name="circleAlert" />
      <GoopAlertTitle>Unable to process your payment.</GoopAlertTitle>
      <GoopAlertDescription>
        <p>Please verify your billing information and try again.</p>
      </GoopAlertDescription>
    </GoopAlert>
  </div>

  <div v-else class="grid w-full max-w-md gap-3">
    <div class="flex justify-end">
      <GoopButton size="xs" variant="outline" @click="replay++">
        Play again
      </GoopButton>
    </div>
    <GoopAlert :key="`w${replay}`" preset="wild">
      <SiteIcon name="info" />
      <GoopAlertTitle>preset="wild"</GoopAlertTitle>
    </GoopAlert>
    <GoopAlert :key="`b${replay}`" :bloom="false">
      <SiteIcon name="info" />
      <GoopAlertTitle>:bloom="false" (the icon still wobbles)</GoopAlertTitle>
    </GoopAlert>
    <GoopAlert :key="`g${replay}`" :goo="false">
      <SiteIcon name="info" />
      <GoopAlertTitle>:goo="false" (plain shadcn)</GoopAlertTitle>
    </GoopAlert>
  </div>
</template>

<style>
/* The docs prose styles paragraphs. The demo is app UI: undo that. */
.prose .alert-demo p {
  margin: 0;
  color: inherit;
}
</style>
