<script setup lang="ts">
// Live popover demos for the Popover docs page: real <GoopPopover>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'sides' | 'surface' | 'burst' }>(), { set: 'basic' })
const sides = ['top', 'right', 'bottom', 'left'] as const
const surfaces = [
  { label: 'trigger (default)', value: 'trigger' },
  { label: 'popover', value: 'popover' },
  { label: 'a CSS color', value: 'oklch(0.62 0.19 150)' },
] as const
</script>

<template>
  <GoopPopover v-if="set === 'basic'">
    <GoopPopoverTrigger as-child>
      <GoopButton variant="outline">Open popover</GoopButton>
    </GoopPopoverTrigger>
    <GoopPopoverContent>
      <GoopPopoverHeader>
        <GoopPopoverTitle>Dimensions</GoopPopoverTitle>
        <GoopPopoverDescription>Set the dimensions for the layer.</GoopPopoverDescription>
      </GoopPopoverHeader>
    </GoopPopoverContent>
  </GoopPopover>

  <template v-else-if="set === 'sides'">
    <GoopPopover v-for="side in sides" :key="side">
      <GoopPopoverTrigger as-child>
        <GoopButton variant="outline" size="sm">{{ side }}</GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent :side="side" class="w-56">
        <GoopPopoverHeader>
          <GoopPopoverTitle>Side: {{ side }}</GoopPopoverTitle>
          <GoopPopoverDescription>The bridge follows this edge.</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
  </template>

  <template v-else-if="set === 'surface'">
    <GoopPopover v-for="s in surfaces" :key="s.value">
      <GoopPopoverTrigger as-child>
        <GoopButton :variant="s.value === 'popover' ? 'outline' : 'default'">{{ s.label }}</GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent :surface="s.value" class="w-56">
        <GoopPopoverHeader>
          <GoopPopoverTitle>surface</GoopPopoverTitle>
          <GoopPopoverDescription>{{ s.value }}</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
  </template>

  <template v-else>
    <GoopPopover>
      <GoopPopoverTrigger as-child>
        <GoopButton variant="secondary">Default burst</GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent class="w-56">
        <GoopPopoverHeader>
          <GoopPopoverTitle>Default</GoopPopoverTitle>
          <GoopPopoverDescription>Drops fling off the far edge.</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
    <GoopPopover>
      <GoopPopoverTrigger as-child>
        <GoopButton variant="secondary">Big and far</GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent class="w-56" :open-drip-amount="2" :open-drip-size="1.6" :open-drip-fling="2" :open-drip-variety="1">
        <GoopPopoverHeader>
          <GoopPopoverTitle>Big and far</GoopPopoverTitle>
          <GoopPopoverDescription>More, larger drops, flung further.</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
    <GoopPopover>
      <GoopPopoverTrigger as-child>
        <GoopButton variant="secondary">No burst</GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent class="w-56" :open-drips="false">
        <GoopPopoverHeader>
          <GoopPopoverTitle>No burst</GoopPopoverTitle>
          <GoopPopoverDescription>Slosh only, nothing flies off.</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
  </template>
</template>
