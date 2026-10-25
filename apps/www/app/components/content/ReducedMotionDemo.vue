<template>
  <div class="not-prose my-6 overflow-hidden rounded-xl border border-border bg-card">
    <div class="stage flex min-h-48 flex-wrap items-center justify-center gap-4 px-4 pb-12 pt-10">
      <GoopButtonDemo :options="{ restingDrips: 2 }">Resting drips</GoopButtonDemo>
      <GoopButtonDemo variant="destructive">Hover me</GoopButtonDemo>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <MotionSwitch label="Reduce motion on this site" />
      <span class="text-xs text-muted-foreground">Same switch as the footer.</span>
    </div>
  </div>
</template>

<style scoped>
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
</style>
