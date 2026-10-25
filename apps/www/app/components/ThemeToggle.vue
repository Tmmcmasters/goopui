<script setup lang="ts">
const { isDark, toggle } = useTheme()
const mounted = ref(false)
onMounted(() => (mounted.value = true))
// Server doesn't know the theme; keep the SSR label until hydrated.
const label = computed(() => (mounted.value && isDark.value ? 'Switch to light theme' : mounted.value ? 'Switch to dark theme' : 'Toggle theme'))
</script>

<template>
  <button
    type="button"
    class="theme-toggle relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
    :aria-label="label"
    :title="label"
    @click="toggle"
  >
    <ClientOnly>
      <span class="icon-swap" :data-dark="isDark">
        <SiteIcon name="sun" :size="17" class="sun" />
        <SiteIcon name="moon" :size="17" class="moon" />
      </span>
      <template #fallback>
        <span class="size-[17px]" />
      </template>
    </ClientOnly>
  </button>
</template>

<style scoped>
.icon-swap {
  display: grid;
}
.icon-swap > * {
  grid-area: 1 / 1;
  transition:
    transform 260ms var(--ease-out-strong),
    opacity 160ms ease;
}
.icon-swap .moon,
.icon-swap[data-dark='true'] .sun {
  opacity: 0;
  transform: rotate(-60deg) scale(0.7);
}
.icon-swap[data-dark='true'] .moon {
  opacity: 1;
  transform: none;
}
.theme-toggle:active {
  transform: scale(0.94);
}
.theme-toggle {
  transition:
    transform 140ms var(--ease-out-strong),
    background-color 150ms ease,
    color 150ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .icon-swap > * {
    transition: opacity 120ms ease;
    transform: none !important;
  }
}
</style>
