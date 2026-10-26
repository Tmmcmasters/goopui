<script setup lang="ts">
const xray = ref(false)

const code = `<!-- shadcn-vue -->
<Button variant="destructive">Delete</Button>

<!-- goopUI: same props, plus goo -->
<GoopButton variant="destructive" preset="wild">
  Delete
</GoopButton>`

const points = [
  {
    title: 'Same API',
    body: 'cva variants, class passthrough, and asChild work the way they do in shadcn-vue. Swap the import, keep your markup.',
  },
  {
    title: 'Built on reka-ui',
    body: 'Each component wraps the same reka-ui primitive shadcn-vue uses, so focus, keyboard, and ARIA come from there.',
  },
  {
    title: 'Goo is a layer',
    body: 'An aria-hidden layer under your content holds the filtered goo. Labels stay crisp, and drips never move your layout.',
  },
]
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="what">
    <LandingSectionHead id="what" index="01" label="What it is" title="The shadcn you know, with goo in it.">
      goopUI copies shadcn's components and API. Underneath, a small engine draws a goo body behind each one and runs the drip
      physics.
    </LandingSectionHead>

    <div class="mt-14 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
      <ul class="grid content-start gap-8">
        <li v-for="(p, i) in points" :key="p.title" v-reveal="i * 70" class="grid grid-cols-[auto_1fr] gap-x-4">
          <span class="mt-0.5 font-mono text-xs text-subtle">0{{ i + 1 }}</span>
          <div>
            <h3 class="font-medium tracking-[-0.01em]">{{ p.title }}</h3>
            <p class="mt-1.5 leading-relaxed text-muted-foreground">{{ p.body }}</p>
          </div>
        </li>
      </ul>

      <div v-reveal="80" class="min-w-0">
        <div class="anatomy relative overflow-hidden rounded-2xl border border-border bg-card" :data-xray="xray || undefined">
          <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span class="font-mono text-xs text-muted-foreground">anatomy</span>
            <label class="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
              <input v-model="xray" type="checkbox" class="xray-check" />
              X-ray the layers
            </label>
          </div>
          <div class="stage grid h-56 place-items-center pb-8">
            <GoopButton variant="destructive" size="lg" :resting-drips="2">Delete project</GoopButton>
          </div>
          <Transition name="legend">
            <ul v-if="xray" class="legend absolute bottom-3 left-4 right-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
              <li><span class="sw sw-label" />label (real content, unfiltered)</li>
              <li><span class="sw sw-layer" />goo layer (aria-hidden, filtered)</li>
            </ul>
          </Transition>
        </div>
        <CodeSnippet :code="code" lang="vue" filename="Usage" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
.xray-check {
  accent-color: var(--foreground);
  width: 14px;
  height: 14px;
}
.anatomy[data-xray] :deep([data-goop='layer']) {
  outline: 1px dashed var(--goo-ink);
  outline-offset: -1px;
}
.anatomy[data-xray] :deep([data-goop='body']),
.anatomy[data-xray] :deep([data-goop='blob']) {
  opacity: 0.45;
}
.anatomy[data-xray] :deep([data-slot="button"]) {
  outline: 1px solid var(--foreground);
  outline-offset: 0;
}
.sw {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  vertical-align: -1px;
  border-radius: 2px;
}
.sw-label {
  border: 1px solid var(--foreground);
}
.sw-layer {
  border: 1px dashed var(--goo-ink);
}
.legend-enter-active,
.legend-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms var(--ease-out-strong);
}
.legend-enter-from,
.legend-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
