<script setup lang="ts">
// Live alert dialog demos for the AlertDialog docs page: real <GoopAlertDialog>s. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'louder' }>(), { set: 'basic' })
</script>

<template>
  <GoopAlertDialog v-if="set === 'basic'">
    <GoopAlertDialogTrigger as-child>
      <GoopButton variant="outline">Delete account</GoopButton>
    </GoopAlertDialogTrigger>
    <GoopAlertDialogContent>
      <GoopAlertDialogHeader>
        <GoopAlertDialogTitle>Are you absolutely sure?</GoopAlertDialogTitle>
        <GoopAlertDialogDescription>
          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
        </GoopAlertDialogDescription>
      </GoopAlertDialogHeader>
      <GoopAlertDialogFooter>
        <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
        <GoopAlertDialogAction>Continue</GoopAlertDialogAction>
      </GoopAlertDialogFooter>
    </GoopAlertDialogContent>
  </GoopAlertDialog>

  <template v-else>
    <GoopAlertDialog>
      <GoopAlertDialogTrigger as-child>
        <GoopButton variant="secondary">Default (light)</GoopButton>
      </GoopAlertDialogTrigger>
      <GoopAlertDialogContent>
        <GoopAlertDialogHeader>
          <GoopAlertDialogTitle>Discard draft?</GoopAlertDialogTitle>
          <GoopAlertDialogDescription>A light slosh and a few small drops.</GoopAlertDialogDescription>
        </GoopAlertDialogHeader>
        <GoopAlertDialogFooter>
          <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
          <GoopAlertDialogAction>Discard</GoopAlertDialogAction>
        </GoopAlertDialogFooter>
      </GoopAlertDialogContent>
    </GoopAlertDialog>
    <GoopAlertDialog>
      <GoopAlertDialogTrigger as-child>
        <GoopButton variant="secondary">Full splash + overlay</GoopButton>
      </GoopAlertDialogTrigger>
      <GoopAlertDialogContent :open-slosh="1" :close-slosh="1" :open-drip-amount="1" :open-drip-size="1" :open-drip-fling="1" overlay>
        <GoopAlertDialogHeader>
          <GoopAlertDialogTitle>Discard draft?</GoopAlertDialogTitle>
          <GoopAlertDialogDescription>The dialog's full slosh and splash, over a goo overlay.</GoopAlertDialogDescription>
        </GoopAlertDialogHeader>
        <GoopAlertDialogFooter>
          <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
          <GoopAlertDialogAction>Discard</GoopAlertDialogAction>
        </GoopAlertDialogFooter>
      </GoopAlertDialogContent>
    </GoopAlertDialog>
  </template>
</template>
