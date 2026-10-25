<script setup lang="ts">
defineProps<{ id?: string }>()
</script>

<template>
  <h2 :id="id" class="group">
    <a v-if="id" :href="`#${id}`" class="heading-anchor"><slot /><span class="hash" aria-hidden="true">#</span></a>
    <slot v-else />
  </h2>
</template>

<style scoped>
.heading-anchor {
  color: inherit;
  text-decoration: none;
}
.hash {
  margin-left: 0.4em;
  color: var(--subtle);
  font-weight: 400;
  opacity: 0;
  transition: opacity 150ms ease;
}
.heading-anchor:hover .hash,
.heading-anchor:focus-visible .hash {
  opacity: 1;
}
</style>
