<script setup lang="ts">
// One bento tile: a small, real UI scene on top, the components it uses underneath.
// `uses` names link to their docs; `new` adds the "New" tag.
export interface TileUse {
  name: string
  slug: string
  new?: boolean
}
defineProps<{ uses: TileUse[] }>()
const { docPath } = useComponentDocs()
</script>

<template>
  <article class="tile">
    <div class="tile-scene">
      <slot />
    </div>
    <footer class="tile-foot">
      <ul class="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Components in this scene">
        <li v-for="u in uses" :key="u.slug" class="inline-flex items-center gap-1.5">
          <NuxtLink v-if="docPath(u.slug)" :to="docPath(u.slug)!" class="use-link">{{ u.name }}</NuxtLink>
          <span v-else class="use-link">{{ u.name }}</span>
          <LandingNewTag v-if="u.new" />
        </li>
      </ul>
    </footer>
  </article>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 1.25rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
}
.tile-scene {
  flex: 1;
  min-width: 0;
  /* Room under the controls for resting drips. */
  padding: 1.25rem 1.25rem 1.75rem;
}
.tile-foot {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12px;
}
.use-link {
  color: var(--muted-foreground);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition:
    color 150ms ease,
    text-decoration-color 150ms ease;
}
.use-link:hover {
  color: var(--foreground);
  text-decoration-color: var(--border-strong);
}
@media (min-width: 640px) {
  .tile-scene {
    padding: 1.5rem 1.5rem 2rem;
  }
}
</style>
