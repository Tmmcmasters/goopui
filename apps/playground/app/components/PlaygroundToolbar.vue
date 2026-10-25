<script setup lang="ts">
import { MoonIcon, SunIcon } from '@lucide/vue'

const { theme, simulateReducedMotion, toggleTheme } = usePlaygroundSettings()
const systemReducedMotion = useSystemReducedMotion()

const systemLabel = computed(() => {
  if (systemReducedMotion.value === null) return 'checking'
  return systemReducedMotion.value ? 'reduce' : 'no preference'
})
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
    <div class="mx-auto flex h-12 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
      <NuxtLink to="/" class="text-sm font-semibold tracking-tight">
        goopUI
      </NuxtLink>

      <nav class="-mx-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto" aria-label="Components">
        <NuxtLink
          v-for="entry in catalog"
          :key="entry.path"
          :to="entry.path"
          class="shrink-0 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground"
        >
          {{ entry.path.slice(1) }}
        </NuxtLink>
      </nav>

      <div class="flex shrink-0 items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-muted-foreground" title="Sets data-reduced-motion=&quot;true&quot; on <html>">
          <Switch v-model="simulateReducedMotion" size="sm" />
          <span class="hidden sm:inline">Reduced motion</span>
          <span class="sr-only sm:hidden">Simulate reduced motion</span>
        </label>
        <span
          class="text-xs whitespace-nowrap text-muted-foreground"
          :title="`Real prefers-reduced-motion media query: ${systemLabel}`"
        >
          OS: <span :class="systemReducedMotion ? 'text-foreground' : ''">{{ systemLabel }}</span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggleTheme"
        >
          <SunIcon v-if="theme === 'dark'" />
          <MoonIcon v-else />
        </Button>
      </div>
    </div>
  </header>
</template>
