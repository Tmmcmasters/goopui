<script setup lang="ts">
// Live select demos for the Select docs page: real <GoopSelect>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'position' | 'surface' }>(), { set: 'basic' })
const fruits = ['Apple', 'Banana', 'Blueberry', 'Grapes', 'Pineapple']
const fruit = ref('Blueberry')
const placed = ref('Blueberry')
const popper = ref('Blueberry')
const surfaces = [
  { label: 'popover (default)', value: 'popover' },
  { label: 'trigger', value: 'trigger' },
  { label: 'a CSS color', value: 'oklch(0.62 0.19 150)' },
] as const
</script>

<template>
  <GoopSelect v-if="set === 'basic'" v-model="fruit">
    <GoopSelectTrigger class="w-44">
      <GoopSelectValue placeholder="Pick a fruit" />
    </GoopSelectTrigger>
    <GoopSelectContent>
      <GoopSelectGroup>
        <GoopSelectLabel>Fruits</GoopSelectLabel>
        <GoopSelectItem v-for="f in fruits" :key="f" :value="f">{{ f }}</GoopSelectItem>
      </GoopSelectGroup>
    </GoopSelectContent>
  </GoopSelect>

  <template v-else-if="set === 'position'">
    <GoopSelect v-model="placed">
      <GoopSelectTrigger class="w-44" aria-label="Item-aligned select">
        <GoopSelectValue />
      </GoopSelectTrigger>
      <GoopSelectContent>
        <GoopSelectItem v-for="f in fruits" :key="f" :value="f">{{ f }}</GoopSelectItem>
      </GoopSelectContent>
    </GoopSelect>
    <GoopSelect v-model="popper">
      <GoopSelectTrigger class="w-44" aria-label="Popper select">
        <GoopSelectValue />
      </GoopSelectTrigger>
      <GoopSelectContent position="popper">
        <GoopSelectItem v-for="f in fruits" :key="f" :value="f">{{ f }}</GoopSelectItem>
      </GoopSelectContent>
    </GoopSelect>
  </template>

  <template v-else>
    <GoopSelect v-for="s in surfaces" :key="s.value" default-value="Apple">
      <GoopSelectTrigger class="w-48" :aria-label="`surface ${s.label}`">
        <span class="truncate text-muted-foreground">{{ s.label }}</span>
      </GoopSelectTrigger>
      <GoopSelectContent position="popper" :surface="s.value">
        <GoopSelectItem v-for="f in fruits" :key="f" :value="f">{{ f }}</GoopSelectItem>
      </GoopSelectContent>
    </GoopSelect>
  </template>
</template>
