<script setup lang="ts">
// Live alert demos for the Alert docs page: real <GoopAlert>. `set` picks the group. Keep each
// set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'destructive' | 'plain' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
const replay = ref(0)
</script>

<template>
  <GoopAlert v-if="set === 'basic'" class="max-w-md border-border" v-bind="pg.props">
    <SiteIcon :name="pg.props.variant === 'destructive' ? 'circleAlert' : 'circleCheck'" />
    <GoopAlertTitle>Success! Your changes have been saved</GoopAlertTitle>
    <GoopAlertDescription>This is an alert with icon, title and description.</GoopAlertDescription>
  </GoopAlert>

  <div v-else-if="set === 'destructive'" class="alert-demo w-full max-w-md">
    <GoopAlert variant="destructive" class="border-border">
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
    <GoopAlert :key="`w${replay}`" class="border-border" preset="wild">
      <SiteIcon name="info" />
      <GoopAlertTitle>preset="wild"</GoopAlertTitle>
    </GoopAlert>
    <GoopAlert :key="`b${replay}`" class="border-border" :bloom="false">
      <SiteIcon name="info" />
      <GoopAlertTitle>:bloom="false" (the icon still wobbles)</GoopAlertTitle>
    </GoopAlert>
    <GoopAlert :key="`g${replay}`" class="border-border" :goo="false">
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
