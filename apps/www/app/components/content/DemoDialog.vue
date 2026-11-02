<script setup lang="ts">
// Live dialog demos for the Dialog docs page: real <GoopDialog>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'overlay' | 'surface' | 'splash' }>(), { set: 'basic' })
const overlays = [
  { label: 'Goo overlay', drips: true },
  { label: 'Straight edge', drips: false },
] as const
const surfaces = [
  { label: 'popover (default)', value: 'popover', variant: 'outline' },
  { label: 'trigger', value: 'trigger', variant: 'default' },
  { label: 'a CSS color', value: 'oklch(0.62 0.19 150)', variant: 'secondary' },
] as const
</script>

<template>
  <GoopDialog v-if="set === 'basic'">
    <GoopDialogTrigger as-child>
      <GoopButton variant="outline">Edit profile</GoopButton>
    </GoopDialogTrigger>
    <GoopDialogContent class="sm:max-w-md">
      <GoopDialogHeader>
        <GoopDialogTitle>Edit profile</GoopDialogTitle>
        <GoopDialogDescription>Make changes to your profile here. Click save when you're done.</GoopDialogDescription>
      </GoopDialogHeader>
      <GoopDialogFooter>
        <GoopDialogClose as-child>
          <GoopButton variant="outline">Cancel</GoopButton>
        </GoopDialogClose>
        <GoopDialogClose as-child>
          <GoopButton>Save changes</GoopButton>
        </GoopDialogClose>
      </GoopDialogFooter>
    </GoopDialogContent>
  </GoopDialog>

  <template v-else-if="set === 'overlay'">
    <GoopDialog v-for="o in overlays" :key="o.label">
      <GoopDialogTrigger as-child>
        <GoopButton variant="outline">{{ o.label }}</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent overlay :overlay-drips="o.drips" class="sm:max-w-md">
        <GoopDialogHeader>
          <GoopDialogTitle>{{ o.label }}</GoopDialogTitle>
          <GoopDialogDescription>
            The backdrop pours down over the page{{ o.drips ? ' with a drippy edge' : '' }}, and drains off the bottom on close.
          </GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
  </template>

  <template v-else-if="set === 'surface'">
    <GoopDialog v-for="s in surfaces" :key="s.value">
      <GoopDialogTrigger as-child>
        <GoopButton :variant="s.variant">{{ s.label }}</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent :surface="s.value" class="sm:max-w-md">
        <GoopDialogHeader>
          <GoopDialogTitle>surface</GoopDialogTitle>
          <GoopDialogDescription>{{ s.value }}</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
  </template>

  <template v-else>
    <GoopDialog>
      <GoopDialogTrigger as-child>
        <GoopButton variant="secondary">Default splash</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent class="sm:max-w-md">
        <GoopDialogHeader>
          <GoopDialogTitle>Default</GoopDialogTitle>
          <GoopDialogDescription>Drops fling off every side.</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
    <GoopDialog>
      <GoopDialogTrigger as-child>
        <GoopButton variant="secondary">Merge start</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent bloom-start="merge" :open-drip-amount="2" :open-drip-size="1.4" class="sm:max-w-md">
        <GoopDialogHeader>
          <GoopDialogTitle>Merge, bigger splash</GoopDialogTitle>
          <GoopDialogDescription>A few drops fuse into the panel, then more, larger drops fly.</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
    <GoopDialog>
      <GoopDialogTrigger as-child>
        <GoopButton variant="secondary">No splash</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent :open-drips="false" class="sm:max-w-md">
        <GoopDialogHeader>
          <GoopDialogTitle>No splash</GoopDialogTitle>
          <GoopDialogDescription>Bloom and slosh only, nothing flies off.</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
  </template>
</template>
