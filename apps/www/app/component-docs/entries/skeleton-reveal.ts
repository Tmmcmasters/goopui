import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

// Not a page of its own: the reveal demo and props table on the Skeleton page.
export default defineComponentDoc({
  slug: 'skeleton-reveal',
  title: 'Skeleton reveal',
  category: 'Feedback',
  component: 'GoopSkeletonReveal',
  code: `<GoopCard class="w-full max-w-sm">
  <GoopSkeletonReveal :loading="loading" class="grid gap-4 px-6"{{main}}>
    <template #skeleton>
      <div class="flex items-center gap-4">
        <GoopSkeleton class="size-12 shrink-0 rounded-full" />
        <div class="grid flex-1 gap-1">
          <div class="flex h-5 items-center"><GoopSkeleton class="h-4 w-32" /></div>
          <div class="flex h-5 items-center"><GoopSkeleton class="h-3.5 w-24" /></div>
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
        <GoopAvatarImage :src="user.avatar" :alt="user.name" />
        <GoopAvatarFallback>{{ user.initials }}</GoopAvatarFallback>
      </GoopAvatar>
      <div class="grid min-w-0 flex-1 gap-1">
        <p class="truncate text-sm leading-5 font-semibold">{{ user.name }}</p>
        <p class="truncate text-sm leading-5 text-muted-foreground">{{ user.handle }}</p>
      </div>
    </div>
    <p class="line-clamp-2 h-10 text-sm leading-5 text-muted-foreground">{{ user.bio }}</p>
    <GoopButton class="w-28">Follow</GoopButton>
  </GoopSkeletonReveal>
</GoopCard>`,
  controls: [preset(), speed(), effect('sheen'), effect('breathe'), effect('melt')],
  tables: {
    main: {
      caption: 'GoopSkeletonReveal props',
      rows: [
        { prop: 'loading', type: 'boolean', def: 'false', note: 'Shows the #skeleton slot. Set it to false when the data arrives and the skeleton melts into the default slot.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root. Both slots are laid out by it, so give them the same layout.' },
        { prop: 'sheen', type: fx, def: 'true', note: 'While loading, a slow sheen flows through the group and close blocks bridge with goo as it passes. A number scales it.' },
        { prop: 'breathe', type: fx, def: 'true', note: 'While loading, each block breathes: a tiny, slow swell. A number scales it.' },
        { prop: 'melt', type: fx, def: 'true', note: 'Each block flows into the element replacing it, then drains away. A number scales the jelly. false: a plain cross-fade.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})
