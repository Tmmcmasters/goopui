<script setup lang="ts">
// The bento: every goopUI component, live, in small realistic scenes. The preset switch
// feeds a reactive GoopConfig to the whole grid (components read it through inject, and
// their option watchers push the change into the running engines). The reduce-motion switch
// is the site-wide one.
import type { GoopPreset } from '@goopui/core'
import { GOOP_CONFIG_KEY, type GoopConfig } from '@goopui/vue'

const config = reactive<GoopConfig>({ preset: 'playful' })
provide(GOOP_CONFIG_KEY, config)

const presets: { value: GoopPreset; label: string }[] = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'playful', label: 'Playful' },
  { value: 'wild', label: 'Wild' },
]
const setPreset = (v: unknown) => {
  if (v) config.preset = v as GoopPreset
}
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28" aria-labelledby="showcase">
    <GoopTooltipProvider :delay-duration="200">
      <div class="controls">
        <div class="min-w-0">
          <h2 id="showcase" class="text-base font-medium tracking-[-0.01em]">Everything below is live. Poke it.</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">Hover, click, swipe through fast. The switches change the whole grid.</p>
        </div>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div class="flex items-center gap-2.5">
            <span id="showcase-preset" class="text-sm text-muted-foreground">Preset</span>
            <GoopToggleGroup
              :model-value="config.preset"
              type="single"
              variant="outline"
              size="sm"
              aria-labelledby="showcase-preset"
              class="[--goop-toggle-fill:var(--primary)]"
              @update:model-value="setPreset"
            >
              <GoopToggleGroupItem
                v-for="p in presets"
                :key="p.value"
                :value="p.value"
                class="data-[state=on]:text-primary-foreground"
              >{{ p.label }}</GoopToggleGroupItem>
            </GoopToggleGroup>
          </div>
          <MotionSwitch />
        </div>
      </div>

      <div class="bento mt-5">
        <LandingShowcaseToolbar class="md:col-span-2 lg:col-span-6" />
        <LandingShowcaseSettings class="lg:col-span-2 lg:row-span-2" />
        <LandingShowcaseSignUp class="lg:col-span-2 lg:row-span-2" />
        <LandingShowcaseOverlays class="lg:col-span-2" />
        <LandingShowcaseUpload class="lg:col-span-2" />
        <LandingShowcaseFaq class="md:col-span-2 lg:col-span-4" />
        <LandingShowcaseToasts class="md:col-span-2 lg:col-span-2" />
      </div>

      <ClientOnly>
        <GoopToaster />
      </ClientOnly>
    </GoopTooltipProvider>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  padding: 0.875rem 1rem;
  border-radius: 1rem;
  background: var(--muted);
}
.bento {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.875rem;
}
@media (min-width: 768px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
