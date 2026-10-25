<script setup lang="ts">
// Below lg: a slim bar under the header with a Menu button that opens the docs nav as a
// left drawer. Scroll is locked (and Lenis paused) while it's open; Esc / backdrop /
// navigating closes it; focus goes in on open and back to the button on close.
const props = defineProps<{ title?: string }>()
const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const lock = (on: boolean) => {
  const lenis = getLenis()
  if (on) lenis?.stop()
  else lenis?.start()
  document.documentElement.style.overflow = on ? 'hidden' : ''
}

watch(open, async (o) => {
  lock(o)
  if (o) {
    await nextTick()
    panel.value?.querySelector<HTMLElement>('[aria-current="page"], a')?.focus({ preventScroll: true })
  } else {
    button.value?.focus({ preventScroll: true })
  }
})

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) open.value = false
}
const route = useRoute()
watch(() => route.path, () => (open.value = false))
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (open.value) lock(false)
})
</script>

<template>
  <div class="mobile-bar sticky top-[var(--header-h)] z-30 border-b border-border lg:hidden">
    <div class="flex h-11 items-center gap-2 px-4 sm:px-6">
      <button
        ref="button"
        type="button"
        class="-ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        :aria-expanded="open"
        aria-controls="docs-drawer"
        @click="open = true"
      >
        <SiteIcon name="menu" :size="16" />
        Menu
      </button>
      <span v-if="props.title" aria-hidden="true" class="text-subtle">/</span>
      <span class="truncate text-sm">{{ props.title }}</span>
    </div>
  </div>

  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50 lg:hidden">
        <div class="backdrop absolute inset-0" aria-hidden="true" @click="open = false" />
        <div
          id="docs-drawer"
          ref="panel"
          class="panel absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-background shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Docs navigation"
        >
          <div class="flex h-[var(--header-h)] shrink-0 items-center justify-between border-b border-border px-4">
            <SiteLogo />
            <button
              type="button"
              class="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close menu"
              @click="open = false"
            >
              <SiteIcon name="close" :size="18" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto overscroll-contain px-2 py-5" data-lenis-prevent>
            <DocsNav @navigate="open = false" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mobile-bar {
  background: color-mix(in oklch, var(--background) 88%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.backdrop {
  background: rgb(0 0 0 / 0.36);
}
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 320ms var(--ease-drawer);
}
.drawer-enter-active .panel,
.drawer-leave-active .panel {
  transition: transform 380ms var(--ease-drawer);
}
.drawer-leave-active,
.drawer-leave-active .panel {
  transition-duration: 220ms;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .panel,
.drawer-leave-to .panel {
  transform: translateX(-100%);
}
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-from .panel,
  .drawer-leave-to .panel {
    transform: none;
  }
}
html[data-reduced-motion='true'] .drawer-enter-from .panel,
html[data-reduced-motion='true'] .drawer-leave-to .panel {
  transform: none;
}
</style>
