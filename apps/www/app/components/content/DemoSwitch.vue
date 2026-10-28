<script setup lang="ts">
// Live switch demos for the Switch docs page. `set` picks the group.
withDefaults(defineProps<{ set?: 'default' | 'sizes' | 'features' | 'states' }>(), { set: 'default' })
const airplane = ref(true)
const wifi = ref(false)
</script>

<template>
  <template v-if="set === 'default'">
    <label class="flex items-center gap-2 text-sm"><GoopSwitch v-model="airplane" /> Airplane mode</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch v-model="wifi" /> Wi-Fi</label>
  </template>
  <template v-else-if="set === 'sizes'">
    <label class="flex items-center gap-2 text-sm"><GoopSwitch size="sm" default-value /> Small</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch default-value /> Default</label>
  </template>
  <template v-else-if="set === 'features'">
    <label class="flex items-center gap-2 text-sm"><GoopSwitch default-value :splat="false" :droplets="false" /> No splat, no droplets</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch :fill="false" default-value /> No fill</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch preset="wild" /> Wild</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch preset="subtle" /> Subtle</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch :speed="0.5" /> Half speed</label>
  </template>
  <template v-else-if="set === 'states'">
    <label class="flex items-center gap-2 text-sm"><GoopSwitch disabled /> Disabled</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch disabled default-value /> Disabled, on</label>
    <label class="flex items-center gap-2 text-sm"><GoopSwitch :goo="false" /> Plain shadcn (goo off)</label>
  </template>
</template>
