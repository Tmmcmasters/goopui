<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="theming">
    <LandingSectionHead id="theming" title="Tune the goo with CSS variables.">
      Colors come from your shadcn tokens (<code class="font-mono text-[0.9em] text-foreground">--primary</code> and friends). The goo
      itself reads <code class="font-mono text-[0.9em] text-foreground">--goop-*</code> variables when it mounts: set them globally,
      per section, or per component.
    </LandingSectionHead>
    <div v-reveal class="mt-14">
      <GooTuner />
    </div>
  </section>
</template>
