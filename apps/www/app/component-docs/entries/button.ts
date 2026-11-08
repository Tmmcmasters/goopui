import { color, engine, flag, preset } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'button',
  title: 'Button',
  category: 'Actions',
  component: 'GoopButton',
  stageControls: true,
  controlsInTable: false,
  code: `<GoopButton{{main}}>Save changes</GoopButton>`,
  reactCode: `import { GoopButton } from '@goopui/react'

export function SaveButton() {
  return <GoopButton{{main}}>Save changes</GoopButton>
}`,
  controls: [
    preset(),
    color(),
    engine('finish'),
    engine('dripSize'),
    engine('dripLength'),
    engine('squish'),
    engine('gloss'),
    engine('reach'),
    flag('taffy', { label: 'Taffy pull', description: 'Press and drag off the button to pull a stretchy string of goo until it snaps.', default: true, type: 'boolean | number' }),
    engine('dripCount', { advanced: true }),
    engine('dripInterval', { advanced: true }),
    engine('shockwave', { advanced: true }),
    engine('inertia', { advanced: true }),
    engine('labelRide', { advanced: true }),
    engine('hitEffect', { advanced: true }),
    engine('puddles', { advanced: true }),
    flag('drips', { label: 'Drips', description: 'false keeps the goo body and squish but never drips.', default: true, advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopButton component props',
      rows: [
        { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'`, def: `'default'`, note: `Same as shadcn. The goo takes the variant's color: tinted for destructive, a goo stroke for outline, hover-only for ghost. Link has no goo.` },
        { prop: 'size', type: `'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'`, def: `'default'`, note: 'Same as shadcn.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: `Render your own child (a NuxtLink, an <a>) with the button's classes and goo, via reka-ui Primitive.` },
        { prop: 'as', type: 'string | Component', def: `'button'`, note: 'The element to render.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn. Utilities such as bg-*, rounded-*, and [--goop-color:...] win over the variant.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables the button. Drips already running finish; nothing new starts.' },
        { prop: 'goo', type: 'boolean', def: 'true (false for link)', note: 'Master switch. false renders a plain shadcn Button.' },
        { prop: 'goop', type: 'GoopOptions', def: '', note: 'Escape hatch: any engine option as an object. The explicit props win over it.' },
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopButton component props',
      rows: [
        { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'`, def: `'default'`, note: `Same as shadcn/ui. The goo takes the variant's color: tinted for destructive, a goo stroke for outline, hover-only for ghost. Link has no goo.` },
        { prop: 'size', type: `'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'`, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: `Render your own child (a Next.js Link, an <a>) with the button's classes and goo, via Radix Slot.` },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root, like shadcn. Utilities such as bg-*, rounded-*, and [--goop-color:...] win over the variant.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables the button. Drips already running finish; nothing new starts.' },
        { prop: 'goo', type: 'boolean', def: 'true (false for link)', note: 'Master switch. false renders a plain shadcn Button.' },
        { prop: 'goop', type: 'GoopOptions', def: '', note: 'Escape hatch: any engine option as an object. The explicit props win over it.' },
        { prop: 'ref', type: 'Ref<HTMLButtonElement>', def: '', note: 'The DOM element, as in shadcn/ui.' },
        { prop: 'goopRef', type: 'Ref<GoopButtonApi>', def: '', note: 'The engine: handle, el, refresh(), press(), release(), hover(), drip(), addGoop(), shockwave(), splashThrough(), feedPointer(), inspect().' },
      ],
    },
  },
})
