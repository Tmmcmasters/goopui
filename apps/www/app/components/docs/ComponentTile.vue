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
    <GoopRadioGroup v-else-if="slug === 'radio-group'" default-value="a" class="flex w-auto gap-3" aria-label="Choice">
      <GoopRadioGroupItem value="a" aria-label="A" />
      <GoopRadioGroupItem value="b" aria-label="B" />
      <GoopRadioGroupItem value="c" aria-label="C" />
    </GoopRadioGroup>
    <GoopInput v-else-if="slug === 'input'" container-class="w-auto" class="h-8 w-36 text-xs" placeholder="you@example.com" aria-label="Email" />
    <GoopSlider v-else-if="slug === 'slider'" :default-value="[62]" class="w-32" aria-label="Volume" />
    <GoopProgress v-else-if="slug === 'progress'" :model-value="64" class="w-32" aria-label="Progress" />
    <GoopNumberField v-else-if="slug === 'number-field'" :default-value="3" class="w-28" aria-label="Quantity">
      <GoopNumberFieldContent class="[&_input]:h-8 [&_input]:text-xs">
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
    <GoopInputOTP v-else-if="slug === 'input-otp'" :default-value="['4', '2']" aria-label="Code">
      <GoopInputOTPGroup class="[&>*]:size-8 [&>*]:text-xs">
        <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
    <GoopPagination v-else-if="slug === 'pagination'" :items-per-page="10" :total="30" :default-page="2" class="w-auto">
      <GoopPaginationContent>
        <GoopPaginationItem v-for="n in 3" :key="n" :value="n" :is-active="n === 2" class="size-7 text-xs">{{ n }}</GoopPaginationItem>
      </GoopPaginationContent>
    </GoopPagination>
    <DocsSkeletonRevealTile v-else-if="slug === 'skeleton'" class="sk-card" />
    <div v-else-if="slug === 'badge'" class="flex items-center gap-1.5">
      <GoopBadge>New</GoopBadge>
      <GoopBadge variant="secondary">Beta</GoopBadge>
      <GoopBadge variant="outline">v1</GoopBadge>
    </div>
    <GoopCard v-else-if="slug === 'card'" class="sk-card w-36 gap-1.5 border-0 py-2.5">
      <GoopCardHeader class="gap-0.5 px-3">
        <GoopCardTitle class="text-xs">Project Apollo</GoopCardTitle>
        <GoopCardDescription class="text-[10px]">Three tasks due</GoopCardDescription>
      </GoopCardHeader>
      <GoopCardContent class="flex gap-1 px-3 pt-1">
        <span class="sk-pill h-2.5 w-8 goo-fill" />
        <span class="sk-pill h-2.5 w-6" />
      </GoopCardContent>
    </GoopCard>
    <div v-else-if="slug === 'avatar'" class="flex -space-x-2">
      <GoopAvatar class="size-9 ring-2 ring-card">
        <GoopAvatarFallback class="bg-[color-mix(in_oklch,var(--foreground)_14%,transparent)] text-[11px]">TM</GoopAvatarFallback>
      </GoopAvatar>
      <GoopAvatar class="size-9 ring-2 ring-card">
        <GoopAvatarFallback class="bg-[var(--goo)] text-[11px] text-[var(--goo-foreground)]">GU</GoopAvatarFallback>
      </GoopAvatar>
    </div>
    <div v-else-if="slug === 'separator'" class="w-32 text-[11px]">
      <span class="font-medium">goopUI</span>
      <GoopSeparator class="my-2" />
      <div class="flex h-3 items-center gap-2 text-muted-foreground">
        <span>Blog</span>
        <GoopSeparator orientation="vertical" />
        <span>Docs</span>
        <GoopSeparator orientation="vertical" />
        <span>Source</span>
      </div>
    </div>
    <div v-else-if="slug === 'label'" class="grid w-36 gap-1.5">
      <GoopLabel class="text-xs">Email</GoopLabel>
      <GoopInput class="h-8 text-xs" placeholder="you@example.com" aria-label="Email" />
    </div>

    <GoopAlert v-else-if="slug === 'alert'" class="w-40 px-2 py-1.5 text-[10px] *:[svg:not([class*=size-])]:size-3">
      <SiteIcon name="circleCheck" />
      <GoopAlertTitle>Saved</GoopAlertTitle>
      <GoopAlertDescription class="text-[10px]">Your changes are live.</GoopAlertDescription>
    </GoopAlert>
    <GoopKbdGroup v-else-if="slug === 'kbd'">
      <GoopKbd>⌘</GoopKbd>
      <GoopKbd>K</GoopKbd>
    </GoopKbdGroup>
    <GoopBreadcrumb v-else-if="slug === 'breadcrumb'" class="text-[11px]">
      <GoopBreadcrumbList class="gap-1 text-[11px]">
        <GoopBreadcrumbItem><GoopBreadcrumbLink as="span">Home</GoopBreadcrumbLink></GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator />
        <GoopBreadcrumbItem><GoopBreadcrumbLink as="span">Docs</GoopBreadcrumbLink></GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator />
        <GoopBreadcrumbItem><GoopBreadcrumbPage>Here</GoopBreadcrumbPage></GoopBreadcrumbItem>
      </GoopBreadcrumbList>
    </GoopBreadcrumb>
    <GoopButtonGroup v-else-if="slug === 'button-group'">
      <GoopButton variant="outline" size="xs">Archive</GoopButton>
      <GoopButton variant="outline" size="xs">Report</GoopButton>
      <GoopButton variant="outline" size="xs">Snooze</GoopButton>
    </GoopButtonGroup>
    <GoopEmpty v-else-if="slug === 'empty'" class="gap-1 p-0">
      <GoopEmptyHeader class="gap-1">
        <GoopEmptyMedia variant="icon"><SiteIcon name="folder" /></GoopEmptyMedia>
        <GoopEmptyTitle class="text-[11px]">No projects</GoopEmptyTitle>
      </GoopEmptyHeader>
    </GoopEmpty>

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
    <!-- Command: a still palette (a live list only highlights under a pointer). -->
    <div v-else-if="slug === 'command'" class="sk-card flex w-32 flex-col gap-1 p-1.5 text-[10px]">
      <span class="flex items-center gap-1.5 border-b border-border px-1 pb-1.5 text-subtle">
        <SiteIcon name="search" :size="10" /> Search...
      </span>
      <span class="rounded px-1.5 py-0.5 text-muted-foreground">Calendar</span>
      <span class="rounded bg-[color-mix(in_oklch,var(--goo)_80%,transparent)] px-1.5 py-0.5 text-[var(--goo-foreground)]">Calculator</span>
      <span class="rounded px-1.5 py-0.5 text-muted-foreground">Settings</span>
    </div>
    <div v-else-if="slug === 'combobox'" class="flex flex-col items-center gap-1">
      <span class="sk-card flex h-6 w-28 items-center justify-between px-2 text-[10px] text-muted-foreground">
        Nuxt <SiteIcon name="chevronDown" :size="10" />
      </span>
      <span class="sk-card flex w-28 flex-col gap-1.5 p-2">
        <span class="flex items-center justify-between"><span class="sk-line w-1/2 goo" /><span class="size-1.5 rounded-full bg-[var(--goo)]" /></span>
        <span class="sk-line w-3/4" />
        <span class="sk-line w-2/3" />
      </span>
    </div>
    <div v-else-if="slug === 'hover-card'" class="flex flex-col items-center gap-1.5">
      <span class="sk-card flex w-28 items-center gap-2 p-2">
        <span class="size-5 shrink-0 rounded-full bg-[color-mix(in_oklch,var(--goo)_80%,transparent)]" />
        <span class="flex flex-1 flex-col gap-1.5">
          <span class="sk-line w-3/4" />
          <span class="sk-line w-full" />
        </span>
      </span>
      <span class="text-[11px] font-medium underline decoration-[var(--goo)] underline-offset-2">@goopui</span>
    </div>
    <div v-else-if="slug === 'context-menu'" class="sk-screen">
      <span class="sk-card absolute left-[42%] top-[22%] flex w-16 flex-col gap-1.5 p-1.5">
        <span class="sk-line w-full goo" />
        <span class="sk-line w-3/4" />
        <span class="h-px bg-[var(--border)]" />
        <span class="sk-line w-2/3" />
      </span>
      <span class="absolute left-[38%] top-[17%] size-1.5 rounded-full bg-[var(--foreground)] opacity-60" />
    </div>
    <div v-else-if="slug === 'navigation-menu'" class="flex w-36 flex-col items-center gap-1">
      <span class="flex items-center gap-1 text-[10px] font-medium">
        <span class="rounded-md bg-[color-mix(in_oklch,var(--goo)_80%,transparent)] px-1.5 py-0.5 text-[var(--goo-foreground)]">Start</span>
        <span class="px-1.5 py-0.5">Parts</span>
        <span class="px-1.5 py-0.5">Docs</span>
      </span>
      <span class="sk-card flex w-28 flex-col gap-1.5 p-2">
        <span class="sk-line w-3/4 goo" />
        <span class="sk-line w-full" />
        <span class="sk-line w-2/3" />
      </span>
    </div>
    <div v-else-if="slug === 'sidebar'" class="sk-screen flex overflow-hidden">
      <span class="flex w-2/5 flex-col gap-1.5 sk-panel p-2">
        <span class="sk-line w-3/4 goo" />
        <span class="sk-line w-full" />
        <span class="sk-line w-2/3" />
        <span class="sk-line w-4/5" />
      </span>
      <span class="flex flex-1 flex-col gap-1.5 p-2">
        <span class="sk-line w-1/2" />
        <span class="sk-line w-full opacity-60" />
      </span>
    </div>
    <!-- Menubar: the real bar, "File" open so the goo body sits on it (no menu content). -->
    <GoopMenubar v-else-if="slug === 'menubar'" default-value="File" class="h-7 gap-0 [&_[data-slot=menubar-trigger]]:text-xs">
      <GoopMenubarMenu v-for="m in ['File', 'Edit', 'View']" :key="m" :value="m">
        <GoopMenubarTrigger>{{ m }}</GoopMenubarTrigger>
      </GoopMenubarMenu>
    </GoopMenubar>
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
