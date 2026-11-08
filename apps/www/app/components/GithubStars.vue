<script setup lang="ts">
// The star count beside a GitHub logo: a small tabular number that inherits the link's color
// (give it a muted class). With no count it collapses to zero width; a count that arrives
// after load (build fetch failed, browser refresh succeeded) slides open instead of jumping.
// The spacing before the number lives inside it (--stars-gap), so a hidden count adds none.
// Screen readers get "N stars"; links with an aria-label build it from useGithubStars.
const { stars, label } = useGithubStars()
</script>

<template>
  <span class="gh-stars" :data-shown="label !== null || undefined">
    <span class="gh-stars-inner">
      <span aria-hidden="true">{{ label }}</span>
      <span v-if="label !== null" class="sr-only">, {{ stars }} stars</span>
    </span>
  </span>
</template>

<style scoped>
.gh-stars {
  display: inline-grid;
  grid-template-columns: 0fr;
  opacity: 0;
  font-variant-numeric: tabular-nums;
  transition:
    grid-template-columns 260ms var(--ease-out-strong, ease-out),
    opacity 200ms ease;
}
.gh-stars[data-shown] {
  grid-template-columns: 1fr;
  opacity: 1;
}
.gh-stars-inner {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  padding-inline-start: var(--stars-gap, 0.375rem);
  transition: padding-inline-start 260ms var(--ease-out-strong, ease-out);
}
.gh-stars:not([data-shown]) .gh-stars-inner {
  padding-inline-start: 0;
}
@media (prefers-reduced-motion: reduce) {
  .gh-stars,
  .gh-stars-inner {
    transition: none;
  }
}
:global(html[data-reduced-motion='true']) .gh-stars,
:global(html[data-reduced-motion='true']) .gh-stars-inner {
  transition: none;
}
</style>
