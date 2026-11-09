<script setup lang="ts">
// Live hover card demos for the Hover Card docs page: real <GoopHoverCard>s. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'from' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/overlays.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="hover-card" :set="set" :pg="{ content: pg.part('content') }" />
  <div v-else class="flex flex-wrap items-start justify-center gap-10 pb-40">
    <GoopHoverCard v-if="set === 'basic'" :open-delay="200">
      <GoopHoverCardTrigger href="https://nuxt.com" target="_blank" rel="noreferrer" class="text-sm font-medium underline underline-offset-4">
        @nuxt
      </GoopHoverCardTrigger>
      <GoopHoverCardContent v-bind="pg.part('content')">
        <div class="flex gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">N</div>
          <div class="grid gap-1">
            <p class="text-sm font-semibold">@nuxt</p>
            <p class="text-sm">The intuitive Vue framework, created and maintained by the Nuxt team.</p>
            <span class="text-xs text-muted-foreground">Joined December 2016</span>
          </div>
        </div>
      </GoopHoverCardContent>
    </GoopHoverCard>

    <template v-else>
      <GoopHoverCard v-for="from in (['trigger', 'center'] as const)" :key="from" :open-delay="200">
        <GoopHoverCardTrigger href="#" class="text-sm font-medium underline underline-offset-4" @click.prevent>
          bloom-from="{{ from }}"
        </GoopHoverCardTrigger>
        <GoopHoverCardContent :bloom-from="from" class="w-56">
          <p class="text-sm">This card blooms from {{ from === 'trigger' ? 'the edge facing its link' : 'its own center' }}.</p>
        </GoopHoverCardContent>
      </GoopHoverCard>
    </template>
  </div>
</template>
