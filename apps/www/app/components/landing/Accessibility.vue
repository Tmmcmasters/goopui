<script setup lang="ts">
const { reduced } = useMotionPreference()
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const still = computed(() => mounted.value && reduced.value)

const points = [
  {
    title: 'Reduced motion keeps the goo',
    body: 'With prefers-reduced-motion, the shape and resting drips stay. The drip simulation, wobble, and pointer-follow stop. State changes are instant or a short fade.',
  },
  {
    title: 'The goo is invisible to assistive tech',
    body: 'The goo layer is aria-hidden and has pointer-events: none. Screen readers and hit-testing only see your real button.',
  },
  {
    title: 'Behavior comes from reka-ui',
    body: 'Focus, keyboard, and ARIA come from the same primitives shadcn-vue uses. The goo is only visual.',
  },
  {
    title: 'Hover drips need a real hover',
    body: 'Hover drips only run when (hover: hover) matches. Touch gets a squish and one drip per tap.',
  },
]
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="a11y">
    <div class="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
      <div>
        <LandingSectionHead id="a11y" title="The motion is optional. The goo stays.">
          Reduced motion isn't a broken fallback here. Every component has a still state that keeps its goo shape.
        </LandingSectionHead>

        <div v-reveal class="mt-10 rounded-2xl border border-border bg-card">
          <div class="still-stage grid h-48 place-items-center pb-6">
            <GoopButton size="lg" :resting-drips="2">{{ still ? 'Still goo' : 'Hover me' }}</GoopButton>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <MotionSwitch label="Reduce motion on this site" />
            <span class="text-xs text-muted-foreground">Also turns off smooth scroll and reveals.</span>
          </div>
        </div>
      </div>

      <ul class="grid content-start gap-8 lg:pt-28">
        <li v-for="(p, i) in points" :key="p.title" v-reveal="i * 60" class="border-l border-border pl-5">
          <h3 class="font-medium tracking-[-0.01em]">{{ p.title }}</h3>
          <p class="mt-1.5 leading-relaxed text-muted-foreground">{{ p.body }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.still-stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
</style>
