<script setup lang="ts">
// Live demos for the Skeleton, Badge, Card, Avatar, Separator and Label docs pages: the real
// components. `set` picks the demo. Keep each set in sync with the code sample beside it.
withDefaults(
  defineProps<{
    set?:
      | 'skeleton'
      | 'skeleton-card'
      | 'skeleton-off'
      | 'badge'
      | 'badge-links'
      | 'card'
      | 'card-goo'
      | 'avatar'
      | 'separator'
      | 'label'
  }>(),
  { set: 'skeleton' },
)

const replay = ref(0)
const portrait = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 22% 60%)"/><stop offset="1" stop-color="hsl(${hue + 30} 18% 34%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="hsl(${hue} 15% 86%)"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="hsl(${hue} 15% 86%)"/></svg>`,
  )}`
const people = [
  { name: 'Tim McMasters', initials: 'TM', src: portrait(30) },
  { name: 'Ada Lovelace', initials: 'AL', src: portrait(210) },
  { name: 'Grace Hopper', initials: 'GH', src: '' },
]
</script>

<template>
  <div v-if="set === 'skeleton'" class="grid w-full max-w-sm gap-5">
    <div v-for="n in 3" :key="n" class="flex items-center gap-4">
      <GoopSkeleton class="size-12 shrink-0 rounded-full" />
      <div class="grid flex-1 gap-2">
        <GoopSkeleton class="h-4 w-full" />
        <GoopSkeleton class="h-4 w-4/5" />
      </div>
    </div>
  </div>

  <div v-else-if="set === 'skeleton-card'" class="grid w-full max-w-xs gap-3">
    <GoopSkeleton class="h-32 w-full rounded-xl" />
    <GoopSkeleton class="h-4 w-3/4" />
    <GoopSkeleton class="h-4 w-1/2" />
  </div>

  <div v-else-if="set === 'skeleton-off'" class="grid w-full max-w-xs gap-3">
    <GoopSkeleton class="h-4 w-full" preset="subtle" />
    <GoopSkeleton class="h-4 w-full" preset="wild" />
    <GoopSkeleton class="h-4 w-full" :shimmer="false" />
  </div>

  <div v-else-if="set === 'badge'" class="flex flex-wrap justify-center gap-3">
    <GoopBadge>Badge</GoopBadge>
    <GoopBadge variant="secondary">Secondary</GoopBadge>
    <GoopBadge variant="destructive">Destructive</GoopBadge>
    <GoopBadge variant="outline">Outline</GoopBadge>
  </div>

  <div v-else-if="set === 'badge-links'" class="flex flex-wrap justify-center gap-3">
    <GoopBadge as-child><a href="#usage">Link</a></GoopBadge>
    <GoopBadge variant="secondary" as-child><a href="#usage">Secondary</a></GoopBadge>
    <GoopBadge variant="outline" as-child><a href="#usage">Outline</a></GoopBadge>
    <GoopBadge as-child :swell="false"><a href="#usage">No swell</a></GoopBadge>
  </div>

  <GoopCard v-else-if="set === 'card' || set === 'card-goo'" class="w-full max-w-sm" :goo="set === 'card-goo'">
    <GoopCardHeader>
      <GoopCardTitle>Project Apollo</GoopCardTitle>
      <GoopCardDescription>Three tasks due this week.</GoopCardDescription>
      <GoopCardAction>
        <GoopBadge variant="outline">Live</GoopBadge>
      </GoopCardAction>
    </GoopCardHeader>
    <GoopCardContent class="text-sm text-muted-foreground">
      {{ set === 'card-goo' ? 'Move the pointer near an edge.' : 'A plain card: no goo unless you ask for it.' }}
    </GoopCardContent>
    <GoopCardFooter class="gap-2">
      <GoopButton size="sm">Open</GoopButton>
      <GoopButton size="sm" variant="outline">Later</GoopButton>
    </GoopCardFooter>
  </GoopCard>

  <div v-else-if="set === 'avatar'" class="flex flex-col items-center gap-4">
    <div :key="replay" class="flex gap-3">
      <GoopAvatar v-for="p in people" :key="p.name" class="size-10">
        <GoopAvatarImage :src="p.src" :alt="p.name" />
        <GoopAvatarFallback>{{ p.initials }}</GoopAvatarFallback>
      </GoopAvatar>
    </div>
    <GoopButton size="sm" variant="outline" @click="replay++">Replay</GoopButton>
  </div>

  <div v-else-if="set === 'separator'" class="w-full max-w-xs text-sm">
    <div class="space-y-1">
      <h4 class="font-medium leading-none">goopUI</h4>
      <p class="text-muted-foreground">Components that drip.</p>
    </div>
    <GoopSeparator class="my-4" />
    <div class="flex h-5 items-center gap-4">
      <span>Blog</span>
      <GoopSeparator orientation="vertical" />
      <span>Docs</span>
      <GoopSeparator orientation="vertical" />
      <span>Source</span>
    </div>
  </div>

  <div v-else class="grid w-full max-w-xs gap-2">
    <GoopLabel for="demo-email">Email</GoopLabel>
    <GoopInput id="demo-email" type="email" placeholder="you@example.com" />
  </div>
</template>
