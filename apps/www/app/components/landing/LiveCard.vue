<script setup lang="ts">
// The one live demo on the landing: a few hand-picked components on a stage, a preset switch
// that retunes all of them at once, and the line of code that matches. The preset reaches the
// components through GOOP_CONFIG_KEY (their option watchers push changes into the running
// engines). Reduced motion is the site-wide switch (footer) or the OS setting.
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

// The switch and slider tune the button above them, live.
const drips = ref(true)
const squish = ref([12])
const squishValue = computed(() => (squish.value[0] ?? 0) / 100)
const pokes = ref(0)
const id = useId()

const uses = [
  { name: 'Button', slug: 'button' },
  { name: 'Switch', slug: 'switch' },
  { name: 'Slider', slug: 'slider' },
]
const { docPath } = useComponentDocs()
</script>

<template>
  <div class="card">
    <div class="card-bar">
      <span class="font-mono text-xs text-muted-foreground">live</span>
      <span class="hint">Hover, click, swipe through fast</span>
    </div>

    <div class="stage">
      <GoopButton size="lg" class="poke h-14 px-8 text-base" :drips="drips" :squish="squishValue" @click="pokes++">
        {{ pokes === 0 ? 'Poke me' : pokes === 1 ? 'Again' : `Poked ×${pokes}` }}
      </GoopButton>

      <div class="mt-10 grid w-full max-w-[18rem] gap-6">
        <div class="flex items-center justify-between gap-4">
          <label :for="`${id}-sw`" class="text-sm font-medium">Hover drips</label>
          <GoopSwitch :id="`${id}-sw`" v-model="drips" />
        </div>
        <div>
          <div class="flex items-baseline justify-between text-sm">
            <span :id="`${id}-sl`" class="font-medium">Press squish</span>
            <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ squishValue.toFixed(2) }}</span>
          </div>
          <GoopSlider v-model="squish" :max="40" :step="1" :aria-labelledby="`${id}-sl`" class="mt-3" />
        </div>
      </div>
    </div>

    <div class="card-foot">
      <GoopToggleGroup
        :model-value="config.preset"
        type="single"
        variant="outline"
        size="sm"
        aria-label="Goo preset"
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

    <code class="code"><span class="t">&lt;GoopButton</span> preset=<span class="s">"{{ config.preset }}"</span> :squish=<span class="s">"{{ squishValue }}"</span><template v-if="!drips"> :drips=<span class="s">"false"</span></template><span class="t">&gt;</span></code>

    <ul class="uses" aria-label="Components in this demo">
      <li v-for="u in uses" :key="u.slug">
        <NuxtLink v-if="docPath(u.slug)" :to="docPath(u.slug)!" class="use-link">{{ u.name }}</NuxtLink>
        <span v-else>{{ u.name }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.card {
  border-radius: 1.5rem;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  box-shadow: 0 1px 0 0 color-mix(in oklch, var(--foreground) 4%, transparent), 0 24px 60px -32px color-mix(in oklch, var(--foreground) 30%, transparent);
}
.card-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
.hint {
  font-size: 12px;
  color: var(--subtle);
}
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Room for drips and splashes around the button. */
  padding: 3.25rem 1.25rem 2.75rem;
}
.card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.875rem 1rem 0.75rem;
  border-top: 1px solid var(--border);
}
.code {
  display: block;
  padding: 0 1rem;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--muted-foreground);
}
.code .t {
  color: var(--foreground);
}
.code .s {
  color: var(--goo-ink);
}
.uses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.875rem;
  padding: 0.5rem 1rem 0.875rem;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted-foreground);
}
.use-link {
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
  .stage {
    padding: 4.5rem 2rem 3.5rem;
  }
}
</style>
