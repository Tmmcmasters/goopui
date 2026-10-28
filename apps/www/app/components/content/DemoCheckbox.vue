<script setup lang="ts">
// Live checkbox demos for the Checkbox docs page. `set` picks the group.
import type { CheckboxState } from '@goopui/core'
withDefaults(defineProps<{ set?: 'default' | 'indeterminate' | 'features' | 'states' }>(), { set: 'default' })
const terms = ref<CheckboxState>(false)
const marketing = ref<CheckboxState>(true)
const all = ref<CheckboxState>('indeterminate')
</script>

<template>
  <template v-if="set === 'default'">
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox v-model="terms" /> Accept terms and conditions</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox v-model="marketing" /> Send me product news</label>
  </template>
  <template v-else-if="set === 'indeterminate'">
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox v-model="all" /> Select all ({{ String(all) }})</label>
  </template>
  <template v-else-if="set === 'features'">
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox :splat="false" /> No splat</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox :droplets="false" /> No droplets</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox preset="wild" /> Wild</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox :speed="0.5" /> Half speed</label>
  </template>
  <template v-else-if="set === 'states'">
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox disabled /> Disabled</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox disabled default-value /> Disabled, checked</label>
    <label class="flex items-center gap-2 text-sm"><GoopCheckbox :goo="false" /> Plain shadcn (goo off)</label>
  </template>
</template>
