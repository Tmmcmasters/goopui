<script setup lang="ts">
// Live input group demos for the Input Group docs page: real <GoopInputGroup>s. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs (and
// react-demos/display.tsx).
const props = withDefaults(defineProps<{ set?: 'basic' | 'button' | 'textarea' }>(), { set: 'basic' })
const query = ref('')
const message = ref('')
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/display.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="input-group" :set="props.set" :pg="{ main: pg.props }" />
  <GoopInputGroup v-else-if="props.set === 'basic'" container-class="max-w-sm" v-bind="pg.props">
    <GoopInputGroupInput v-model="query" placeholder="Search..." aria-label="Search" />
    <GoopInputGroupAddon>
      <SiteIcon name="search" />
    </GoopInputGroupAddon>
    <GoopInputGroupAddon align="inline-end">12 results</GoopInputGroupAddon>
  </GoopInputGroup>
  <GoopInputGroup v-else-if="props.set === 'button'" container-class="max-w-sm">
    <GoopInputGroupInput default-value="https://goop.timmcmasters.work" readonly aria-label="Link" />
    <GoopInputGroupAddon align="inline-end">
      <GoopInputGroupButton size="icon-xs" aria-label="Copy">
        <SiteIcon name="copy" />
      </GoopInputGroupButton>
    </GoopInputGroupAddon>
  </GoopInputGroup>
  <GoopInputGroup v-else container-class="max-w-sm">
    <GoopInputGroupTextarea v-model="message" placeholder="Ask, search or chat..." aria-label="Message" />
    <GoopInputGroupAddon align="block-end">
      <GoopInputGroupText>{{ message.length }}/280</GoopInputGroupText>
      <GoopInputGroupButton variant="default" size="xs" class="ml-auto">Send</GoopInputGroupButton>
    </GoopInputGroupAddon>
  </GoopInputGroup>
</template>
