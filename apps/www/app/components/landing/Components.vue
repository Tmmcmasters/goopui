<script setup lang="ts">
import { setGoopTimeScale, type GoopOptions } from '@goopui/core'

// Slow-mo uses the engine's global time scale (it affects every goo on the page).
const slow = ref(false)
watch(slow, (s) => setGoopTimeScale(s ? 0.3 : 1))
onUnmounted(() => setGoopTimeScale(1))

const buttons = ref<{ getHandle: () => import('@goopui/core').GoopHandle | null }[]>([])
const dripAll = () => buttons.value.forEach((b) => b.getHandle()?.drip())

const still: GoopOptions = { interactive: false, drips: false }

const soon = [
  { name: 'Spinner', slug: 'spinner', note: 'Blobs that orbit and merge.' },
  { name: 'Switch', slug: 'switch', note: 'The thumb stretches across the track.' },
  { name: 'Popover', slug: 'popover', note: 'A goo bridge from trigger to content.' },
  { name: 'Dropdown', slug: 'dropdown', note: 'Opens with a pinch, menu items stay crisp.' },
  { name: 'Blob', slug: 'blob', note: 'Backgrounds that ooze. The perf stress test.' },
] as const
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="components">
    <LandingSectionHead id="components" index="02" label="Components" title="Button drips today. The rest are on the way.">
      GoopButton is the first one, and it's live below. The others ship in order. Hover to drip, press to squish, hold to
      watch a drop let go.
    </LandingSectionHead>

    <div class="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Live: Button -->
      <article v-reveal class="card sm:col-span-2 lg:row-span-2">
        <div class="card-stage stage-lg flex-col gap-10">
          <div class="flex flex-wrap items-center justify-center gap-4 px-4">
            <GoopButtonDemo :ref="(el: any) => el && (buttons[0] = el)">Button</GoopButtonDemo>
            <GoopButtonDemo :ref="(el: any) => el && (buttons[1] = el)" variant="destructive">Delete</GoopButtonDemo>
            <GoopButtonDemo :ref="(el: any) => el && (buttons[2] = el)" variant="secondary">Secondary</GoopButtonDemo>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-4 px-4">
            <GoopButtonDemo :ref="(el: any) => el && (buttons[3] = el)" size="sm">Small</GoopButtonDemo>
            <GoopButtonDemo :ref="(el: any) => el && (buttons[4] = el)" shape="pill" variant="goo">Pill</GoopButtonDemo>
            <GoopButtonDemo :ref="(el: any) => el && (buttons[5] = el)" size="lg">Large button</GoopButtonDemo>
          </div>
        </div>
        <footer class="card-foot">
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-mono text-[13px]">
              GoopButton <span class="pill pill-live">live</span>
            </p>
            <p class="mt-1 text-sm text-muted-foreground">Drips on hover, squish on press, one drip per tap.</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <button type="button" class="ctl" @click="dripAll">Drip all</button>
            <button type="button" class="ctl" :aria-pressed="slow" @click="slow = !slow">Slow-mo</button>
          </div>
        </footer>
      </article>

      <!-- Coming soon: static goo previews -->
      <article v-for="(c, i) in soon" :key="c.slug" v-reveal="(i % 3) * 60" class="card card-soon">
        <div class="card-stage">
          <div v-if="c.slug === 'spinner'" class="flex items-end gap-1.5">
            <GoopHost class="dot" :options="{ ...still, restingDrips: 1, dripSize: 4, dripLength: 8 }" />
            <GoopHost class="dot dot-lg" :options="{ ...still, restingDrips: 1, dripSize: 5, dripLength: 12 }" />
            <GoopHost class="dot" :options="{ ...still, restingDrips: 1, dripSize: 4, dripLength: 8 }" />
          </div>
          <div v-else-if="c.slug === 'switch'" class="relative">
            <GoopHost class="track" :options="{ ...still, restingDrips: 1, dripSize: 5, dripLength: 10 }" />
            <span class="knob" />
          </div>
          <div v-else-if="c.slug === 'popover'" class="flex flex-col items-center gap-3">
            <GoopHost class="pop" :options="{ ...still, restingDrips: 1, dripSize: 6, dripLength: 12 }">
              <span class="pop-line w-16" /><span class="pop-line w-10" />
            </GoopHost>
            <span class="mini-trigger">Open</span>
          </div>
          <div v-else-if="c.slug === 'dropdown'" class="flex flex-col items-start gap-2">
            <span class="mini-trigger">Menu</span>
            <GoopHost class="menu" :options="{ ...still, restingDrips: 2, dripSize: 5, dripLength: 10 }">
              <span class="pop-line w-20" /><span class="pop-line w-14" /><span class="pop-line w-16" />
            </GoopHost>
          </div>
          <GoopHost v-else class="blob" :options="{ ...still, restingDrips: 3, dripSize: 9, dripLength: 22, blur: 6 }" />
        </div>
        <footer class="card-foot">
          <div class="min-w-0">
            <p class="flex items-center gap-2 font-mono text-[13px]">
              Goop{{ c.name }} <span class="pill">soon</span>
            </p>
            <p class="mt-1 text-sm text-muted-foreground">{{ c.note }}</p>
          </div>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 1.125rem;
  border: 1px solid var(--border);
  background: var(--card);
}
.card-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 11.5rem;
  padding: 1.5rem 0 2.25rem;
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
.stage-lg {
  min-height: 20rem;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-top: 1px solid var(--border);
}
.card-soon .card-stage > * {
  opacity: 0.9;
}
.pill {
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.pill-live {
  color: var(--goo-foreground);
  background: var(--goo);
  box-shadow: none;
}
.ctl {
  height: 2rem;
  padding: 0 0.7rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.ctl:hover {
  color: var(--foreground);
  background: var(--muted);
}
.ctl:active {
  transform: scale(0.96);
}
.ctl[aria-pressed='true'] {
  color: var(--background);
  background: var(--foreground);
  box-shadow: none;
}

/* Static goo shapes for the coming-soon cards. */
.dot,
.track,
.pop,
.menu,
.blob {
  --goop-color: var(--primary);
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
}
.dot-lg {
  width: 20px;
  height: 20px;
}
.track {
  width: 64px;
  height: 34px;
  border-radius: 999px;
}
.knob {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--primary-foreground);
}
.pop,
.menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
}
.pop-line {
  display: block;
  height: 6px;
  border-radius: 99px;
  background: color-mix(in oklch, var(--primary-foreground) 55%, transparent);
}
.mini-trigger {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.blob {
  width: 76px;
  height: 64px;
  border-radius: 46% 54% 50% 50% / 55% 50% 50% 45%;
  --goop-color: var(--goo);
}
</style>
