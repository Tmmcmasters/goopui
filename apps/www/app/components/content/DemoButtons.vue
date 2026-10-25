<script setup lang="ts">
// Live button demos for the Button docs page. `set` picks which group to show.
withDefaults(defineProps<{ set?: 'variants' | 'sizes' | 'resting' | 'disabled' }>(), { set: 'variants' })
</script>

<template>
  <template v-if="set === 'variants'">
    <GoopButtonDemo>Default</GoopButtonDemo>
    <GoopButtonDemo variant="destructive">Destructive</GoopButtonDemo>
    <GoopButtonDemo variant="secondary">Secondary</GoopButtonDemo>
  </template>
  <template v-else-if="set === 'sizes'">
    <GoopButtonDemo size="sm">Small</GoopButtonDemo>
    <GoopButtonDemo>Default</GoopButtonDemo>
    <GoopButtonDemo size="lg">Large</GoopButtonDemo>
    <GoopButtonDemo shape="pill">Pill</GoopButtonDemo>
  </template>
  <template v-else-if="set === 'resting'">
    <GoopButtonDemo :options="{ restingDrips: 1 }">One drip</GoopButtonDemo>
    <GoopButtonDemo variant="destructive" :options="{ restingDrips: 2 }">Two drips</GoopButtonDemo>
    <GoopButtonDemo shape="pill" :options="{ restingDrips: 3, dripLength: 20 }">Three, longer</GoopButtonDemo>
  </template>
  <template v-else>
    <GoopButtonDemo disabled>Disabled</GoopButtonDemo>
    <GoopButtonDemo :options="{ drips: false }">No drips, squish only</GoopButtonDemo>
  </template>
</template>
