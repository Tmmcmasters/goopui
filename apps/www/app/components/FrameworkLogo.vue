<script setup lang="ts">
// Monochrome Vue / React marks (ink = currentColor), for the framework switch.
defineProps<{ fw: Framework; size?: number }>()
</script>

<template>
  <svg v-if="fw === 'vue'" :width="size ?? 15" :height="size ?? 15" viewBox="0 0 128 128" aria-hidden="true" class="shrink-0">
    <path fill="currentColor" opacity="0.5" d="M78.8 10 64 35.4 49.2 10H0l64 110 64-110z" />
    <path fill="currentColor" d="M78.8 10 64 35.4 49.2 10H25.6L64 76l38.4-66z" />
  </svg>
  <svg v-else :width="size ?? 15" :height="size ?? 15" viewBox="-11.5 -10.23 23 20.46" aria-hidden="true" class="shrink-0">
    <circle r="2.05" fill="currentColor" />
    <g fill="none" stroke="currentColor" stroke-width="1.2">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
</template>
