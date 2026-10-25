<script setup lang="ts">
const props = defineProps<{ text: string; label?: string }>()
const copied = ref(false)
let t: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    clearTimeout(t)
    t = setTimeout(() => (copied.value = false), 1600)
  } catch {}
}
onUnmounted(() => clearTimeout(t))
</script>

<template>
  <button
    type="button"
    class="copy-btn grid size-8 place-items-center rounded-md text-muted-foreground"
    :aria-label="copied ? 'Copied' : (label ?? 'Copy code')"
    :title="copied ? 'Copied' : (label ?? 'Copy code')"
    @click="copy"
  >
    <Transition name="copy-swap" mode="out-in">
      <SiteIcon v-if="copied" key="ok" name="check" :size="15" class="text-foreground" />
      <SiteIcon v-else key="copy" name="copy" :size="15" />
    </Transition>
    <span class="sr-only" aria-live="polite">{{ copied ? 'Copied to clipboard' : '' }}</span>
  </button>
</template>

<style scoped>
.copy-btn {
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.copy-btn:hover {
  background: var(--muted);
  color: var(--foreground);
}
.copy-btn:active {
  transform: scale(0.92);
}
.copy-swap-enter-active,
.copy-swap-leave-active {
  transition:
    opacity 110ms ease,
    transform 160ms var(--ease-out-strong);
}
.copy-swap-enter-from,
.copy-swap-leave-to {
  opacity: 0;
  transform: scale(0.75);
}
@media (prefers-reduced-motion: reduce) {
  .copy-swap-enter-from,
  .copy-swap-leave-to {
    transform: none;
  }
}
</style>
