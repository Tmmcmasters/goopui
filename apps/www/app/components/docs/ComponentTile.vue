<script setup lang="ts">
// The small preview in a /docs/components index tile. Inline components render live (and
// still: the tile is inert); overlays get a quiet sketch. Unknown slugs get a monogram, so a
// new component's tile works before anyone draws one. Add a case here to give it a preview.
defineProps<{ slug: string; title: string }>()
</script>

<template>
  <div class="tile-art flex size-full items-center justify-center" inert>
    <GoopButton v-if="slug === 'button'" size="sm" :resting-drips="[0.3, 0.72]" :interactive="false">Button</GoopButton>
    <GoopSpinner v-else-if="slug === 'spinner'" class="size-9" />
    <GoopToggle v-else-if="slug === 'toggle'" default-value class="[--accent:var(--goo)] [--accent-foreground:var(--goo-foreground)]" aria-label="Bold">
      <span class="font-bold">B</span>
    </GoopToggle>
    <GoopSwitch v-else-if="slug === 'switch'" default-value aria-label="On" />
    <div v-else-if="slug === 'checkbox'" class="flex items-center gap-2.5">
      <GoopCheckbox :default-value="true" aria-label="Checked" />
      <GoopCheckbox aria-label="Unchecked" />
    </div>
    <GoopRadioGroup v-else-if="slug === 'radio-group'" default-value="a" class="flex gap-3" aria-label="Choice">
      <GoopRadioGroupItem value="a" aria-label="A" />
      <GoopRadioGroupItem value="b" aria-label="B" />
      <GoopRadioGroupItem value="c" aria-label="C" />
    </GoopRadioGroup>
    <GoopInput v-else-if="slug === 'input'" class="h-8 w-36 text-xs" placeholder="you@example.com" aria-label="Email" />
    <GoopSlider v-else-if="slug === 'slider'" :default-value="[62]" class="w-32" aria-label="Volume" />
    <GoopProgress v-else-if="slug === 'progress'" :model-value="64" class="w-32" aria-label="Progress" />

    <!-- Sketches: overlays and the rest. Ink, with the goo colour as the accent. -->
    <div v-else-if="slug === 'select'" class="sk-card flex h-8 w-32 items-center justify-between px-2.5 text-[11px] text-muted-foreground">
      Pick a fruit <SiteIcon name="chevronDown" :size="12" />
    </div>
    <div v-else-if="slug === 'popover' || slug === 'dropdown-menu'" class="flex flex-col items-center gap-1.5">
      <span class="sk-pill h-5 w-14" />
      <span class="sk-card flex w-24 flex-col gap-1.5 p-2">
        <span class="sk-line w-3/4 goo" />
        <span class="sk-line w-full" />
        <span class="sk-line w-2/3" />
      </span>
    </div>
    <div v-else-if="slug === 'tooltip'" class="flex flex-col items-center gap-1.5">
      <span class="sk-tip px-2 py-1 text-[10px]">Tooltip</span>
      <span class="sk-pill h-5 w-14" />
    </div>
    <div v-else-if="slug === 'tabs'" class="sk-card flex gap-1 p-1">
      <span class="sk-pill h-5 w-10 goo-fill" />
      <span class="h-5 w-10" />
      <span class="h-5 w-10" />
    </div>
    <div v-else-if="slug === 'accordion'" class="flex w-32 flex-col gap-1">
      <span class="sk-card h-4 goo-fill" />
      <span class="sk-card h-4" />
      <span class="sk-card h-4" />
    </div>
    <div v-else-if="slug === 'dialog' || slug === 'alert-dialog'" class="sk-screen">
      <span class="sk-card absolute left-1/2 top-1/2 flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col gap-1.5 p-2">
        <span class="sk-line w-3/4" />
        <span class="sk-line w-full" />
        <span class="mt-0.5 flex justify-end gap-1">
          <span class="sk-pill h-2.5 w-5" />
          <span class="sk-pill h-2.5 w-5" :class="slug === 'alert-dialog' ? 'danger' : 'goo-fill'" />
        </span>
      </span>
    </div>
    <div v-else-if="slug === 'sheet'" class="sk-screen">
      <span class="sk-panel absolute inset-y-0 right-0 w-2/5 rounded-l-xl" />
    </div>
    <div v-else-if="slug === 'drawer'" class="sk-screen">
      <span class="sk-panel absolute inset-x-0 bottom-0 flex h-1/2 justify-center rounded-t-xl pt-1.5">
        <span class="h-1 w-6 rounded-full bg-[color-mix(in_oklch,var(--foreground)_25%,transparent)]" />
      </span>
    </div>
    <div v-else-if="slug === 'toaster'" class="relative h-14 w-32">
      <span class="sk-card absolute inset-x-3 top-0 h-6 opacity-50" />
      <span class="sk-card absolute inset-x-1.5 top-2 h-6 opacity-75" />
      <span class="sk-card absolute inset-x-0 top-4 flex h-7 items-center gap-1.5 px-2">
        <span class="size-2 rounded-full bg-[var(--goo)]" />
        <span class="sk-line w-16" />
      </span>
    </div>
    <div v-else-if="slug === 'page-transition'" class="sk-screen overflow-hidden">
      <span class="absolute inset-x-0 top-0 h-3/5 rounded-b-[40%] bg-[var(--goo)] opacity-85" />
    </div>
    <span v-else class="monogram">{{ title.charAt(0) }}</span>
  </div>
</template>

<style scoped>
.sk-card,
.sk-panel,
.sk-tip {
  border-radius: 0.45rem;
  background: var(--card);
  box-shadow:
    inset 0 0 0 1px var(--border-strong),
    0 6px 14px -8px rgb(0 0 0 / 0.4);
}
.sk-panel {
  border-radius: 0;
  background: var(--popover);
}
.sk-pill {
  display: block;
  border-radius: 999px;
  background: color-mix(in oklch, var(--foreground) 14%, transparent);
}
.sk-line {
  display: block;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--foreground) 18%, transparent);
}
.sk-line.goo,
.goo-fill {
  background: color-mix(in oklch, var(--goo) 80%, transparent);
}
.danger {
  background: var(--destructive);
}
.sk-tip {
  color: var(--foreground);
}
.sk-screen {
  position: relative;
  width: 7.5rem;
  height: 4.75rem;
  border-radius: 0.5rem;
  background: color-mix(in oklch, var(--foreground) 5%, transparent);
  box-shadow: inset 0 0 0 1px var(--border);
}
.monogram {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: 46% 54% 50% 50% / 55% 48% 52% 45%;
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--goo-foreground);
  background: var(--goo);
}
</style>
