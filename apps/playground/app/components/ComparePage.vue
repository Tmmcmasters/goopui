<script setup lang="ts">
const props = defineProps<{
  /** Route path in the catalog, e.g. `/button`. */
  path: string
}>()

const entry = computed(() => {
  const found = catalog.find(e => e.path === props.path)
  if (!found) throw new Error(`No catalog entry for ${props.path}`)
  return found
})

provide(compareGoopKey, computed(() => entry.value.goop))

useHead({ title: () => entry.value.goop })
</script>

<template>
  <article>
    <header class="mb-8">
      <h1 class="text-xl font-semibold tracking-tight">
        {{ entry.goop }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ entry.blurb }}
        <template v-if="entry.shadcn">
          Compared against shadcn-vue <code class="font-mono text-foreground">{{ entry.shadcn }}</code>.
        </template>
        <template v-else>
          No shadcn-vue original.
        </template>
      </p>
    </header>

    <slot name="controls" />

    <div class="overflow-hidden rounded-xl border">
      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b bg-muted/40 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div class="hidden px-4 py-2 sm:block">
          Variant
        </div>
        <div class="px-4 py-2">
          shadcn
        </div>
        <div class="border-l px-4 py-2">
          goop
        </div>
      </div>
      <slot />
    </div>
  </article>
</template>
