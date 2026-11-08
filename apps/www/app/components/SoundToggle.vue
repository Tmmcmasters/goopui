<script setup lang="ts">
// Header mute switch for the site's interaction sounds. Same look as ThemeToggle.
const { enabled, setEnabled } = useSoundPreference()
const mounted = ref(false)
onMounted(() => (mounted.value = true))
// The server doesn't know the preference; keep a neutral label until hydrated.
const label = computed(() => (!mounted.value ? 'Toggle sound' : enabled.value ? 'Mute sounds' : 'Turn sounds on'))
</script>

<template>
  <button
    type="button"
    class="sound-toggle relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
    :aria-label="label"
    :title="label"
    @click="setEnabled(!enabled)"
  >
    <ClientOnly>
      <span class="icon-swap" :data-muted="!enabled">
        <SiteIcon name="volume" :size="17" class="on" />
        <SiteIcon name="volumeOff" :size="17" class="off" />
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
    transform 220ms var(--ease-out-strong),
    opacity 140ms ease;
}
.icon-swap .off,
.icon-swap[data-muted='true'] .on {
  opacity: 0;
  transform: scale(0.8);
}
.icon-swap[data-muted='true'] .off {
  opacity: 1;
  transform: none;
}
.sound-toggle:active {
  transform: scale(0.94);
}
.sound-toggle {
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
html[data-reduced-motion='true'] .icon-swap > * {
  transition: opacity 120ms ease;
  transform: none !important;
}
</style>
