<script setup lang="ts">
withDefaults(defineProps<{ type?: 'note' | 'soon' | 'alpha' | 'tip' }>(), { type: 'note' })
</script>

<template>
  <aside class="callout not-prose my-6 flex gap-3 rounded-xl border px-4 py-3.5 text-[0.9375rem] leading-relaxed" :data-type="type">
    <span class="mt-[0.55em] size-2 shrink-0 rounded-full" aria-hidden="true" />
    <div class="min-w-0 [&>p]:my-0 [&>p+p]:mt-2">
      <strong v-if="type === 'soon'" class="font-medium">Not released yet. </strong>
      <strong v-else-if="type === 'alpha'" class="font-medium">Alpha, not yet published. </strong>
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.callout {
  border-color: var(--border);
  background: var(--card);
}
.callout > span {
  background: var(--border-strong);
}
.callout[data-type='soon'] > span,
.callout[data-type='alpha'] > span {
  background: var(--goo);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--goo) 30%, transparent);
}
.callout[data-type='tip'] > span {
  background: var(--foreground);
}
.callout :deep(p) {
  color: color-mix(in oklch, var(--foreground) 84%, var(--background));
}
</style>
