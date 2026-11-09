<script setup lang="ts">
// Live kbd demos for the Kbd docs page: real <GoopKbd>. `set` picks the group. Keep each set in
// sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'text' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/batch-simple.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="kbd" :set="set" :pg="{ main: pg.props }" />
  <div v-else-if="set === 'basic'" class="flex flex-col items-center gap-4">
    <GoopKbdGroup>
      <GoopKbd :keys="['Meta']" v-bind="pg.props">⌘</GoopKbd>
      <GoopKbd :keys="['Meta', 'K']" v-bind="pg.props">K</GoopKbd>
    </GoopKbdGroup>
    <GoopKbdGroup>
      <GoopKbd :keys="['Shift']" v-bind="pg.props">⇧</GoopKbd>
      <GoopKbd :keys="['Alt']" v-bind="pg.props">⌥</GoopKbd>
      <GoopKbd :keys="['Control']" v-bind="pg.props">⌃</GoopKbd>
      <GoopKbd :keys="['Escape']" v-bind="pg.props">Esc</GoopKbd>
    </GoopKbdGroup>
  </div>
  <p v-else class="text-sm text-muted-foreground">
    Use
    <GoopKbdGroup>
      <GoopKbd :keys="['Control', 'B']">Ctrl + B</GoopKbd>
      <GoopKbd :keys="['Control', 'K']">Ctrl + K</GoopKbd>
    </GoopKbdGroup>
    to open the command palette
  </p>
</template>
