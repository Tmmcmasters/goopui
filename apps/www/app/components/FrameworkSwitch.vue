<script setup lang="ts">
// Header Vue / React switch. On a docs page each side is a link to the same page in that
// framework (/docs/x <-> /react/docs/x, scroll position kept); elsewhere it sets the
// preference that the docs links follow. The choice is remembered (localStorage
// `goop-framework`, see useFramework). Same 36px height as the other header controls; below
// `sm` it shows just the two logos.
const { fw, counterpart, setPreferred } = useFramework()
const route = useRoute()
const onDocs = computed(() => frameworkOfPath(route.path) !== null)
// Off the docs the preference decides, which the server can't know: show it after mount.
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const current = computed(() => (onDocs.value || mounted.value ? fw.value : null))

function pick(target: Framework) {
  setPreferred(target)
}
</script>

<template>
  <div class="fw-switch" role="group" aria-label="Framework">
    <template v-for="f in FRAMEWORKS" :key="f.id">
      <NuxtLink
        v-if="onDocs"
        :to="counterpart(f.id)!"
        class="fw-option"
        :aria-current="current === f.id ? 'page' : undefined"
        :data-on="current === f.id || undefined"
        :title="`${f.label} docs`"
        @click="pick(f.id)"
      >
        <FrameworkLogo :fw="f.id" />
        <span class="fw-label">{{ f.label }}</span>
      </NuxtLink>
      <button
        v-else
        type="button"
        class="fw-option"
        :aria-pressed="current === f.id"
        :data-on="current === f.id || undefined"
        :title="`Use the ${f.label} docs`"
        @click="pick(f.id)"
      >
        <FrameworkLogo :fw="f.id" />
        <span class="fw-label">{{ f.label }}</span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.fw-switch {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  height: 2.25rem;
  padding: 3px;
  border-radius: 0.625rem;
  box-shadow: inset 0 0 0 1px var(--border);
}
.fw-option {
  display: inline-flex;
  height: 100%;
  align-items: center;
  gap: 0.375rem;
  padding: 0 0.5rem;
  border-radius: 0.4375rem;
  font-size: 0.8125rem;
  line-height: 1;
  color: var(--muted-foreground);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.fw-option:hover {
  color: var(--foreground);
}
.fw-option[data-on] {
  color: var(--foreground);
  background: var(--muted);
  box-shadow: inset 0 0 0 1px var(--border);
}
.fw-option:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
@media (max-width: 639.98px) {
  .fw-option {
    padding: 0 0.3125rem;
  }
}
/* The labels only fit next to the full desktop nav from `lg` (1024px) up. */
@media (max-width: 1023.98px) {
  .fw-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
</style>
