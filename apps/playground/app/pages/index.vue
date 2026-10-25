<script setup lang="ts">
import { VERSION } from '@goopui/core'
</script>

<template>
  <div>
    <header class="mb-8">
      <h1 class="text-xl font-semibold tracking-tight">
        Playground
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Each page puts a goop component next to its shadcn-vue original.
        <span class="font-mono">@goopui/core</span> v{{ VERSION }}.
      </p>
    </header>

    <ul class="divide-y overflow-hidden rounded-xl border">
      <li v-for="entry in catalog" :key="entry.path">
        <NuxtLink
          :to="entry.path"
          class="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
        >
          <span class="min-w-0">
            <span class="text-sm font-medium">{{ entry.goop }}</span>
            <span class="ml-2 text-sm text-muted-foreground">{{ entry.blurb }}</span>
          </span>
          <span class="shrink-0 font-mono text-xs text-muted-foreground">
            {{ entry.shadcn ?? 'no original' }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
