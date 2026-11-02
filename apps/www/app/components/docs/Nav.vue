<script setup lang="ts">
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { data: nav } = await useDocsNav()
</script>

<template>
  <nav aria-label="Docs" class="text-sm">
    <div v-for="section in nav" :key="section.path" class="mb-7">
      <p class="mb-2 px-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{{ section.title }}</p>
      <ul class="grid gap-px">
        <li v-for="item in section.children" :key="item.path">
          <NuxtLink
            :to="item.path"
            class="nav-item flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
            :aria-current="route.path === item.path ? 'page' : undefined"
            @click="emit('navigate')"
          >
            <span>{{ item.title }}</span>
            <span v-if="item.status === 'soon'" class="soon">soon</span>
            <span v-else-if="item.badge === 'experimental'" class="new" title="New · experimental">
              New<span class="sr-only"> · experimental</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.nav-item {
  color: var(--muted-foreground);
  transition:
    color 120ms ease,
    background-color 120ms ease;
}
.nav-item:hover {
  color: var(--foreground);
  background: var(--muted);
}
.nav-item[aria-current='page'] {
  color: var(--foreground);
  background: var(--muted);
  font-weight: 500;
}
.soon {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--subtle);
}
.new {
  border-radius: 999px;
  padding: 0 0.4rem;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--foreground);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--goo) 70%, transparent);
  background: color-mix(in oklch, var(--goo) 16%, transparent);
}
</style>
