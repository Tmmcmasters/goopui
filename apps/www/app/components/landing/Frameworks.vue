<script setup lang="ts">
const rows = [
  {
    name: 'Vue + Nuxt',
    pkgs: ['@goopui/vue', '@goopui/nuxt'],
    status: 'In progress',
    live: true,
    body: 'First, because it proves the API. SFCs that work in plain Vue/Vite, plus a Nuxt module that auto-imports them.',
  },
  {
    name: 'React',
    pkgs: ['@goopui/react'],
    status: 'Later',
    live: false,
    body: 'Same components and props, after the Vue API settles.',
  },
  {
    name: 'Svelte',
    pkgs: ['@goopui/svelte'],
    status: 'Later',
    live: false,
    body: 'Same again, as Svelte components.',
  },
]
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="frameworks">
    <LandingSectionHead id="frameworks" index="03" label="Frameworks" title="One engine. Thin adapters.">
      The goo lives in <code class="inline-code">@goopui/core</code>: plain TypeScript and DOM, no framework, and no
      <code class="inline-code">document</code> access at import time, so it's SSR-safe. Each framework package is a thin wrapper
      around it.
    </LandingSectionHead>

    <ol class="mt-14 divide-y divide-border border-y border-border">
      <li
        v-for="(r, i) in rows"
        :key="r.name"
        v-reveal="i * 60"
        class="grid gap-3 py-6 sm:grid-cols-[12rem_1fr_auto] sm:items-baseline sm:gap-8"
      >
        <h3 class="text-lg font-medium tracking-[-0.02em]" :class="!r.live && 'text-muted-foreground'">{{ r.name }}</h3>
        <div class="min-w-0">
          <p class="leading-relaxed text-muted-foreground">{{ r.body }}</p>
          <p class="mt-2 flex flex-wrap gap-2">
            <code v-for="p in r.pkgs" :key="p" class="inline-code">{{ p }}</code>
          </p>
        </div>
        <span class="status justify-self-start" :data-live="r.live || undefined">
          <span class="dot" aria-hidden="true" />{{ r.status }}
        </span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.inline-code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  padding: 0.12em 0.4em;
  border-radius: 0.375rem;
  background: var(--muted);
  border: 1px solid var(--border);
  color: var(--foreground);
  white-space: nowrap;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted-foreground);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: var(--border-strong);
}
.status[data-live] {
  color: var(--foreground);
}
.status[data-live] .dot {
  background: var(--goo);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--goo) 30%, transparent);
}
</style>
