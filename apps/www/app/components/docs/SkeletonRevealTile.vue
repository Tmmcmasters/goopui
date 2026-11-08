<script setup lang="ts">
// The Skeleton tile on /docs/components: a tiny profile card that loads (pooled goo
// skeleton), melts into its content, rests, and loads again.
const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
const cycle = (): void => {
  loading.value = !loading.value
  timer = setTimeout(cycle, loading.value ? 2000 : 2800)
}
onMounted(() => (timer = setTimeout(cycle, 1600)))
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <GoopCard class="w-36 gap-0 border-0 py-2.5">
    <GoopSkeletonReveal :loading="loading" class="grid gap-2 px-3">
      <template #skeleton>
        <div class="flex h-6 items-center gap-2">
          <GoopSkeleton class="size-6 shrink-0 rounded-full" />
          <div class="grid flex-1">
            <div class="flex h-3 items-center"><GoopSkeleton class="h-2 w-14" /></div>
            <div class="flex h-3 items-center"><GoopSkeleton class="h-1.5 w-10" /></div>
          </div>
        </div>
        <div class="flex h-3 items-center"><GoopSkeleton class="h-1.5 w-full" /></div>
        <GoopSkeleton class="h-5 w-12 rounded-sm" />
      </template>
      <div class="flex h-6 items-center gap-2">
        <GoopAvatar class="size-6">
          <GoopAvatarFallback class="text-[8px]">AL</GoopAvatarFallback>
        </GoopAvatar>
        <div class="grid min-w-0 flex-1">
          <p class="m-0 truncate text-[10px] leading-3 font-semibold">Ada Lovelace</p>
          <p class="m-0 truncate text-[8px] leading-3 text-muted-foreground">@ada</p>
        </div>
      </div>
      <p class="m-0 truncate text-[8px] leading-3 text-muted-foreground">First published program.</p>
      <span class="flex h-5 w-12 items-center justify-center rounded-sm bg-primary text-[8px] font-medium text-primary-foreground" data-goop-reveal>Follow</span>
    </GoopSkeletonReveal>
  </GoopCard>
</template>
