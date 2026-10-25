<script setup lang="ts">
// A live demo frame for docs pages. Put any goo demo in the default slot.
import { setGoopTimeScale } from '@goopui/core'

withDefaults(defineProps<{ caption?: string; controls?: boolean }>(), { controls: true })
const emit = defineEmits<{ drip: [] }>()

const slow = ref(false)
watch(slow, (s) => setGoopTimeScale(s ? 0.3 : 1))
onUnmounted(() => slow.value && setGoopTimeScale(1))

const stage = ref<HTMLElement | null>(null)
// Drip every goo host inside the stage: dispatch to children that registered a handle.
const dripAll = () => {
  emit('drip')
  stage.value?.dispatchEvent(new CustomEvent('goop:drip', { bubbles: false }))
}
</script>

<template>
  <div class="preview not-prose my-6 overflow-hidden rounded-xl border border-border bg-card">
    <div ref="stage" data-goop-stage class="stage flex min-h-56 flex-wrap items-center justify-center gap-4 px-4 pb-14 pt-10">
      <slot />
    </div>
    <div v-if="controls || caption" class="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
      <span class="pl-1 text-xs text-muted-foreground">{{ caption }}</span>
      <div v-if="controls" class="flex gap-1.5">
        <button type="button" class="ctl" @click="dripAll">Drip</button>
        <button type="button" class="ctl" :aria-pressed="slow" @click="slow = !slow">Slow-mo</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
.ctl {
  height: 1.875rem;
  padding: 0 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.ctl:hover {
  color: var(--foreground);
  background: var(--muted);
}
.ctl:active {
  transform: scale(0.96);
}
.ctl[aria-pressed='true'] {
  color: var(--background);
  background: var(--foreground);
  box-shadow: none;
}
</style>
