import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const shared = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ItemGroup and plain items.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The interactive items' hover and keyboard-focus background is one goo blob that glides between them. false gives shadcn's flat hover fill.` },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'A soft jelly landing when the blob reaches an item.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: 'A low, wide swell of the blob sits under the pointer.' },
  { prop: 'press', type: fx, def: 'true', note: 'An interactive item (a link or button) squishes a little when pressed and settles with a small jelly bounce. Inherited by the items; a number scales it.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

const item = (vue: boolean) => [
  { prop: 'variant', type: `'default' | 'outline' | 'muted'`, def: `'default'`, note: 'shadcn variants.' },
  { prop: 'size', type: `'default' | 'sm' | 'xs'`, def: `'default'`, note: 'shadcn sizes.' },
  vue
    ? { prop: 'as, asChild', type: 'string | Component, boolean', def: `'div', false`, note: 'reka-ui Primitive: render as a link (or NuxtLink with as-child) to make the item interactive.' }
    : { prop: 'asChild', type: 'boolean', def: 'false', note: 'Radix Slot: render your <a> or Link to make the item interactive.' },
  { prop: 'goo, press, speed, preset', type: '', def: 'from the group', note: `The item's own press squish; set here they win over the group's.` },
]

const code = (cls: string, child: string) => `<GoopItemGroup{{main}}>
  <GoopItem ${child} size="sm">
    <a href="/people/ada">
      <GoopItemMedia>
        <GoopAvatar ${cls}="size-8">
          <GoopAvatarFallback>AL</GoopAvatarFallback>
        </GoopAvatar>
      </GoopItemMedia>
      <GoopItemContent>
        <GoopItemTitle>Ada Lovelace</GoopItemTitle>
        <GoopItemDescription>ada@example.com</GoopItemDescription>
      </GoopItemContent>
      <GoopItemActions>
        <ArrowRightIcon />
      </GoopItemActions>
    </a>
  </GoopItem>
  <!-- ...more items -->
</GoopItemGroup>`

export default defineComponentDoc({
  slug: 'item',
  title: 'Item',
  category: 'Layout',
  component: 'GoopItem',
  code: code('class', 'as-child'),
  reactCode: code('className', 'asChild').replace('<!-- ...more items -->', '{/* ...more items */}'),
  controls: [
    preset(),
    speed(),
    effect('highlight', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    effect('momentum', { type: 'boolean' }),
    effect('followPointer', { type: 'boolean' }),
    strength('press'),
  ],
  tables: {
    main: { caption: 'GoopItemGroup props', rows: [...shared, { prop: 'handle', type: 'ListHighlightHandle | null (exposed)', def: '', note: 'The live blob handle.' }] },
    item: { caption: 'GoopItem props', rows: [...item(true), { prop: 'handle', type: 'ItemPressHandle | null (exposed)', def: '', note: 'The live press handle.' }] },
  },
  reactTables: {
    main: { caption: 'GoopItemGroup props', rows: [...shared, { prop: 'goopRef', type: 'Ref<ListHighlightHandle>', def: '', note: 'The live blob handle (null before mount or with the blob off).' }] },
    item: { caption: 'GoopItem props', rows: [...item(false), { prop: 'goopRef', type: 'Ref<ItemPressHandle>', def: '', note: 'The live press handle (null before mount or with the squish off).' }] },
  },
})
