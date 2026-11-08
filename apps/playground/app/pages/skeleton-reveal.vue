<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

// GoopSkeletonReveal compare page: a profile card loads (skeleton) and its blocks melt into
// the real content. Left: shadcn's pulse skeleton and an instant v-if swap.
const speed = ref(1)
const fx = reactive({ sheen: true, breathe: true, melt: true })
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({ ...fx, speed: speed.value, preset: preset.value || undefined }))

/** How long a reload stays loading (ms); 0 holds the skeleton until "reveal". */
const wait = ref(1800)
const loading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
const reload = (): void => {
  clearTimeout(timer)
  loading.value = true
  if (wait.value > 0) timer = setTimeout(() => (loading.value = false), wait.value)
}
onMounted(reload)
onBeforeUnmount(() => clearTimeout(timer))

const portrait = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(200 30% 62%)"/><stop offset="1" stop-color="hsl(230 25% 38%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="hsl(200 20% 86%)"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="hsl(200 20% 86%)"/></svg>`,
)}`
const bio = 'Wrote the first published program for a machine that did not exist yet, then explained it better than its inventor.'
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/skeleton-reveal">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Skeleton reveal props">
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.25" max="2" step="0.05" class="w-28">
        </label>
        <label v-for="(_, name) in fx" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="fx[name]" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">loading for</span>
          <select v-model.number="wait" :class="selectClass">
            <option :value="900">0.9s</option>
            <option :value="1800">1.8s</option>
            <option :value="4000">4s</option>
            <option :value="0">until "reveal"</option>
          </select>
        </label>
        <button type="button" class="h-7 rounded-md border px-2 text-xs" data-shot="reload" @click="reload">
          reload
        </button>
        <button type="button" class="h-7 rounded-md border px-2 text-xs" data-shot="reveal" @click="loading = false">
          reveal
        </button>
      </section>
    </template>

    <CompareRow label="profile card" note="the blocks pool into goo while loading, then melt into the avatar, text and button">
      <template #shadcn>
        <div class="w-full max-w-sm rounded-xl border bg-card py-6 text-card-foreground shadow-sm">
          <div class="grid gap-4 px-6">
            <template v-if="loading">
              <div class="flex items-center gap-4">
                <Skeleton class="size-12 shrink-0 rounded-full" />
                <div class="grid min-w-0 flex-1 gap-1">
                  <div class="flex h-5 items-center"><Skeleton class="h-4 w-32" /></div>
                  <div class="flex h-5 items-center"><Skeleton class="h-3.5 w-24" /></div>
                </div>
              </div>
              <div class="grid">
                <div class="flex h-5 items-center"><Skeleton class="h-3.5 w-full" /></div>
                <div class="flex h-5 items-center"><Skeleton class="h-3.5 w-4/5" /></div>
              </div>
              <Skeleton class="h-9 w-28" />
            </template>
            <template v-else>
              <div class="flex items-center gap-4">
                <Avatar class="size-12"><AvatarImage :src="portrait" alt="Ada Lovelace" /><AvatarFallback>AL</AvatarFallback></Avatar>
                <div class="grid min-w-0 flex-1 gap-1">
                  <p class="truncate text-sm font-semibold leading-5">Ada Lovelace</p>
                  <p class="truncate text-sm leading-5 text-muted-foreground">@ada &middot; Analyst</p>
                </div>
              </div>
              <p class="line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">{{ bio }}</p>
              <Button class="w-28">Follow</Button>
            </template>
          </div>
        </div>
      </template>
      <template #goop>
        <GoopCard class="w-full max-w-sm" data-shot="reveal-card">
          <GoopSkeletonReveal :loading="loading" class="grid gap-4 px-6" v-bind="engine">
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
              <GoopAvatar class="size-12"><GoopAvatarImage :src="portrait" alt="Ada Lovelace" /><GoopAvatarFallback>AL</GoopAvatarFallback></GoopAvatar>
              <div class="grid min-w-0 flex-1 gap-1">
                <p class="truncate text-sm font-semibold leading-5">Ada Lovelace</p>
                <p class="truncate text-sm leading-5 text-muted-foreground">@ada &middot; Analyst</p>
              </div>
            </div>
            <p class="line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">{{ bio }}</p>
            <GoopButton class="w-28">Follow</GoopButton>
          </GoopSkeletonReveal>
        </GoopCard>
      </template>
    </CompareRow>

    <CompareRow label="list" note="any content: three rows reveal with the same stagger">
      <template #goop>
        <GoopSkeletonReveal :loading="loading" class="grid w-full max-w-sm gap-4" v-bind="engine">
          <template #skeleton>
            <div v-for="n in 3" :key="n" class="flex items-center gap-3">
              <GoopSkeleton class="size-9 shrink-0 rounded-full" />
              <div class="flex h-5 flex-1 items-center"><GoopSkeleton class="h-3.5 w-full max-w-56" /></div>
            </div>
          </template>
          <div v-for="name in ['Ada Lovelace', 'Grace Hopper', 'Alan Turing']" :key="name" class="flex items-center gap-3">
            <GoopAvatar class="size-9"><GoopAvatarFallback>{{ name.split(' ').map(w => w[0]).join('') }}</GoopAvatarFallback></GoopAvatar>
            <p class="text-sm leading-5">{{ name }} joined the project</p>
          </div>
        </GoopSkeletonReveal>
      </template>
    </CompareRow>
  </ComparePage>
</template>
