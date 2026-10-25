<script setup lang="ts">
// "Reduce motion" switch. Sets <html data-reduced-motion="true">, which @goopui/core,
// Lenis (via useMotionPreference) and the reveal CSS all follow. If the OS already asks
// for reduced motion, the switch shows on and locked.
withDefaults(defineProps<{ label?: string; compact?: boolean }>(), { label: 'Reduce motion' })
const { reduced, osReduced, setForced } = useMotionPreference()
const id = useId()
// Render the SSR value (off) until hydrated; the real preference lives in the browser.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const on = computed(() => mounted.value && reduced.value)
const locked = computed(() => mounted.value && osReduced.value)
</script>

<template>
  <div class="inline-flex items-center gap-2.5" :class="compact ? 'text-xs' : 'text-sm'">
    <button
      :id="id"
      type="button"
      role="switch"
      class="motion-switch"
      :aria-checked="on"
      :disabled="locked"
      :title="locked ? 'Your system is set to reduce motion' : undefined"
      @click="setForced(!on)"
    >
      <span class="thumb" />
    </button>
    <label :for="id" class="cursor-pointer select-none text-muted-foreground">
      {{ label }}<span v-if="locked" class="text-subtle"> (system)</span>
    </label>
  </div>
</template>

<style scoped>
.motion-switch {
  position: relative;
  width: 34px;
  height: 20px;
  flex: none;
  border-radius: 999px;
  background: var(--border-strong);
  transition: background-color 180ms ease;
  cursor: pointer;
}
.motion-switch[aria-checked='true'] {
  background: var(--foreground);
}
.motion-switch:disabled {
  cursor: default;
  opacity: 0.7;
}
.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--background);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  transition: transform 220ms var(--ease-out-strong);
}
.motion-switch[aria-checked='true'] .thumb {
  transform: translateX(14px);
}
@media (prefers-reduced-motion: reduce) {
  .thumb {
    transition: none;
  }
}
html[data-reduced-motion='true'] .thumb {
  transition: none;
}
</style>
