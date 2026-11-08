<script setup lang="ts">
// The Skeleton page's reveal demo: a profile card loads (GoopSkeleton blocks inside a
// GoopSkeletonReveal), then each block melts into the avatar, text and button. "Reload"
// replays it. Keep it in sync with the `code` sample in entries/skeleton-reveal.ts.
const props = withDefaults(defineProps<{ wait?: number }>(), { wait: 1600 })

// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()

const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
const reload = (): void => {
  clearTimeout(timer)
  loading.value = true
  timer = setTimeout(() => (loading.value = false), props.wait)
}
onMounted(reload)
onBeforeUnmount(() => clearTimeout(timer))

const portrait = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(200 22% 60%)"/><stop offset="1" stop-color="hsl(230 18% 34%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="hsl(200 15% 86%)"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="hsl(200 15% 86%)"/></svg>`,
)}`
// On /react/docs: the same demo, as real @goopui/react components (react-demos/batch1.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="skeleton-reveal" :pg="{ main: pg.props }" />
  <div v-else class="flex w-full flex-col items-center gap-4">
    <GoopCard class="w-full max-w-sm" data-shot="reveal-card">
      <GoopSkeletonReveal :loading="loading" class="grid gap-4 px-6" v-bind="pg.props">
        <template #skeleton>
          <div class="flex items-center gap-4">
            <GoopSkeleton class="size-12 shrink-0 rounded-full" />
            <div class="grid min-w-0 flex-1 gap-1">
              <div class="flex h-5 items-center"><GoopSkeleton class="h-4 w-32 max-w-full" /></div>
              <div class="flex h-5 items-center"><GoopSkeleton class="h-3.5 w-24 max-w-full" /></div>
            </div>
          </div>
          <div class="grid">
            <div class="flex h-5 items-center"><GoopSkeleton class="h-3.5 w-full" /></div>
            <div class="flex h-5 items-center"><GoopSkeleton class="h-3.5 w-4/5" /></div>
          </div>
          <GoopSkeleton class="h-8 w-28" />
        </template>
        <div class="flex items-center gap-4">
          <GoopAvatar class="size-12">
            <GoopAvatarImage :src="portrait" alt="Ada Lovelace" />
            <GoopAvatarFallback>AL</GoopAvatarFallback>
          </GoopAvatar>
          <div class="grid min-w-0 flex-1 gap-1">
            <p class="m-0 truncate text-sm leading-5 font-semibold">Ada Lovelace</p>
            <p class="m-0 truncate text-sm leading-5 text-muted-foreground">@ada &middot; Analyst</p>
          </div>
        </div>
        <p class="m-0 line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">
          Wrote the first published program, for a machine that was never built, and explained it better than its inventor.
        </p>
        <GoopButton class="w-28">Follow</GoopButton>
      </GoopSkeletonReveal>
    </GoopCard>
    <GoopButton variant="outline" size="sm" data-replay :disabled="loading" @click="reload">
      Reload
    </GoopButton>
  </div>
</template>
