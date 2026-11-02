<script setup lang="ts">
// Props of the static set: GoopSkeleton, GoopBadge, GoopCard, GoopAvatar. Effects are core's
// SKELETON_EFFECTS / BADGE_EFFECTS / CARD_EFFECTS / AVATAR_EFFECTS.
import type { PropRow } from '../docs/PropsTable.vue'

const props = withDefaults(defineProps<{ part?: 'skeleton' | 'badge' | 'card' | 'avatar' }>(), { part: 'skeleton' })

const fx = 'boolean | number'
const engine: PropRow[] = [
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
]
const cls: PropRow = { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' }
const as: PropRow = { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' }

const tables: Record<string, PropRow[]> = {
  skeleton: [
    cls,
    { prop: 'shimmer', type: fx, def: 'true', note: 'A low mound of lighter goo drifts across. A number scales its brightness. false: shadcn\'s pulse.' },
    ...engine,
  ],
  badge: [
    { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline'`, def: `'default'`, note: 'Same as shadcn.' },
    cls,
    as,
    { prop: 'swell', type: fx, def: 'true', note: 'A link or button badge swells ~1px on hover with a soft overshoot. A number scales it. A plain badge never moves.' },
    ...engine,
  ],
  card: [
    cls,
    { prop: 'goo', type: 'boolean', def: 'false', note: 'Turns the edge swell on. Off: a plain shadcn Card.' },
    { prop: 'swell', type: fx, def: 'true', note: 'With goo on, the edge nearest the pointer swells toward it in a low, wide mound. A number scales its height.' },
    ...engine,
  ],
  avatar: [
    cls,
    as,
    { prop: 'settle', type: fx, def: 'true', note: 'The image or fallback plops in with a soft overshoot when it appears. A number scales it. false: shadcn\'s Avatar.' },
    ...engine,
  ],
}
const captions: Record<string, string> = {
  skeleton: 'GoopSkeleton props',
  badge: 'GoopBadge props',
  card: 'GoopCard props',
  avatar: 'GoopAvatar props',
}
const rows = computed(() => tables[props.part] ?? [])
</script>

<template>
  <DocsPropsTable :rows="rows" :caption="captions[part]" />
</template>
