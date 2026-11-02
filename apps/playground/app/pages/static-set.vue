<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

/** Props from the panel, applied to every goop component on the page. */
const speed = ref(1)
const fx = reactive({ shimmer: true, swell: true, settle: true, cardGoo: true })
const preset = ref<GoopPreset | ''>('')
const engine = computed(() => ({ speed: speed.value, preset: preset.value || undefined }))

/** Bumping it remounts the avatars, so their settle plays again. */
const replay = ref(0)
const portrait = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 62%)"/><stop offset="1" stop-color="hsl(${hue + 30} 25% 38%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="hsl(${hue} 20% 86%)"/><path d="M12 64c2-14 10-20 20-20s18 6 20 20z" fill="hsl(${hue} 20% 86%)"/></svg>`,
  )}`
const people = [
  { name: 'Tim McMasters', initials: 'TM', src: portrait(30) },
  { name: 'Ada Lovelace', initials: 'AL', src: portrait(200) },
  { name: 'Grace Hopper', initials: 'GH', src: '' },
]

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/static-set">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Static set props">
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
        <button type="button" class="h-7 rounded-md border px-2 text-xs" @click="replay++">
          replay avatars
        </button>
      </section>
    </template>

    <CompareRow label="skeleton" note="a low mound of lighter goo drifts across instead of the pulse">
      <template #shadcn>
        <div class="grid w-full gap-4">
          <div v-for="n in 3" :key="n" class="flex items-center gap-4">
            <Skeleton class="size-12 shrink-0 rounded-full" />
            <div class="grid flex-1 gap-2">
              <Skeleton class="h-4 w-full max-w-[250px]" />
              <Skeleton class="h-4 w-4/5 max-w-[200px]" />
            </div>
          </div>
        </div>
      </template>
      <template #goop>
        <div class="grid w-full gap-4" data-shot="skeletons">
          <div v-for="n in 3" :key="n" class="flex items-center gap-4">
            <GoopSkeleton class="size-12 shrink-0 rounded-full" :shimmer="fx.shimmer" v-bind="engine" />
            <div class="grid flex-1 gap-2">
              <GoopSkeleton class="h-4 w-full max-w-[250px]" :shimmer="fx.shimmer" v-bind="engine" />
              <GoopSkeleton class="h-4 w-4/5 max-w-[200px]" :shimmer="fx.shimmer" v-bind="engine" />
            </div>
          </div>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="skeleton card" note="goo only: a card-shaped skeleton">
      <template #goop>
        <div class="grid w-full max-w-sm gap-3">
          <GoopSkeleton class="h-32 w-full rounded-xl" :shimmer="fx.shimmer" v-bind="engine" />
          <GoopSkeleton class="h-4 w-3/4" :shimmer="fx.shimmer" v-bind="engine" />
          <GoopSkeleton class="h-4 w-1/2" :shimmer="fx.shimmer" v-bind="engine" />
        </div>
      </template>
    </CompareRow>

    <CompareRow label="badge" note="static: a plain badge never moves">
      <template #shadcn>
        <Badge>Badge</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </template>
      <template #goop>
        <div class="flex flex-wrap gap-3" data-shot="badges">
          <GoopBadge :swell="fx.swell" v-bind="engine">Badge</GoopBadge>
          <GoopBadge variant="secondary" :swell="fx.swell" v-bind="engine">Secondary</GoopBadge>
          <GoopBadge variant="destructive" :swell="fx.swell" v-bind="engine">Destructive</GoopBadge>
          <GoopBadge variant="outline" :swell="fx.swell" v-bind="engine">Outline</GoopBadge>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="badge links" note="hover: asChild links swell ~1px with a soft overshoot">
      <template #shadcn>
        <Badge as-child><a href="#badges">Link</a></Badge>
        <Badge variant="secondary" as-child><a href="#badges">Secondary</a></Badge>
        <Badge variant="outline" as-child><a href="#badges">Outline</a></Badge>
      </template>
      <template #goop>
        <div class="flex flex-wrap gap-3" data-shot="badge-links">
          <GoopBadge as-child :swell="fx.swell" v-bind="engine"><a href="#badges">Link</a></GoopBadge>
          <GoopBadge variant="secondary" as-child :swell="fx.swell" v-bind="engine"><a href="#badges">Secondary</a></GoopBadge>
          <GoopBadge variant="outline" as-child :swell="fx.swell" v-bind="engine"><a href="#badges">Outline</a></GoopBadge>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="card" note="left: goo off (exactly shadcn). Right: goo on, hover near an edge">
      <template #shadcn>
        <GoopCard class="w-full max-w-xs">
          <GoopCardHeader>
            <GoopCardTitle>Project Apollo</GoopCardTitle>
            <GoopCardDescription>Static, the shadcn card.</GoopCardDescription>
          </GoopCardHeader>
          <GoopCardContent class="text-sm">
            Three tasks due this week.
          </GoopCardContent>
        </GoopCard>
      </template>
      <template #goop>
        <GoopCard class="w-full max-w-xs" data-shot="card" :goo="fx.cardGoo" v-bind="engine">
          <GoopCardHeader>
            <GoopCardTitle>Project Apollo</GoopCardTitle>
            <GoopCardDescription>Its edge swells toward you.</GoopCardDescription>
            <GoopCardAction>
              <GoopBadge variant="outline">Live</GoopBadge>
            </GoopCardAction>
          </GoopCardHeader>
          <GoopCardContent class="text-sm">
            Three tasks due this week.
          </GoopCardContent>
          <GoopCardFooter class="gap-2">
            <GoopButton size="sm">
              Open
            </GoopButton>
            <GoopButton size="sm" variant="outline">
              Later
            </GoopButton>
          </GoopCardFooter>
        </GoopCard>
      </template>
    </CompareRow>

    <CompareRow label="avatar" note="the image / fallback settles in with a soft overshoot (replay above)">
      <template #shadcn>
        <div :key="replay" class="flex gap-3">
          <Avatar v-for="p in people" :key="p.name" class="size-10">
            <AvatarImage :src="p.src" :alt="p.name" />
            <AvatarFallback>{{ p.initials }}</AvatarFallback>
          </Avatar>
        </div>
      </template>
      <template #goop>
        <div :key="replay" class="flex gap-3" data-shot="avatars">
          <GoopAvatar v-for="p in people" :key="p.name" class="size-10" :settle="fx.settle" v-bind="engine">
            <GoopAvatarImage :src="p.src" :alt="p.name" />
            <GoopAvatarFallback>{{ p.initials }}</GoopAvatarFallback>
          </GoopAvatar>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="separator + label" note="plain shadcn ports, no goo">
      <template #goop>
        <div class="grid w-full max-w-xs gap-3 text-sm">
          <div class="grid gap-2">
            <GoopLabel for="static-email">Email</GoopLabel>
            <GoopInput id="static-email" type="email" placeholder="you@example.com" />
          </div>
          <GoopSeparator />
          <div class="flex h-5 items-center gap-3">
            <span>Blog</span>
            <GoopSeparator orientation="vertical" />
            <span>Docs</span>
            <GoopSeparator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </template>
    </CompareRow>
  </ComparePage>
</template>
