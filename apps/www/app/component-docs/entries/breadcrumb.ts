import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'breadcrumb',
  title: 'Breadcrumb',
  category: 'Navigation',
  component: 'GoopBreadcrumb',
  code: `<GoopBreadcrumb{{main}}>
  <GoopBreadcrumbList>
    <GoopBreadcrumbItem>
      <GoopBreadcrumbLink href="/">Home</GoopBreadcrumbLink>
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbEllipsis />
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbLink href="/docs/components">Components</GoopBreadcrumbLink>
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
    </GoopBreadcrumbItem>
  </GoopBreadcrumbList>
</GoopBreadcrumb>`,
  reactCode: `<GoopBreadcrumb{{main}}>
  <GoopBreadcrumbList>
    <GoopBreadcrumbItem>
      <GoopBreadcrumbLink href="/">Home</GoopBreadcrumbLink>
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbEllipsis />
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbLink href="/docs/components">Components</GoopBreadcrumbLink>
    </GoopBreadcrumbItem>
    <GoopBreadcrumbSeparator />
    <GoopBreadcrumbItem>
      <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
    </GoopBreadcrumbItem>
  </GoopBreadcrumbList>
</GoopBreadcrumb>`,
  reactTables: {
    main: {
      caption: 'GoopBreadcrumb props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Breadcrumb parts.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The links' hover and keyboard-focus highlight is one goo blob that flows from link to link. false gives shadcn's text-colour hover only.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'A soft jelly landing when the blob reaches a link.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: 'A low, wide swell of the blob sits under the pointer.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  controls: [
    preset(),
    speed(),
    effect('highlight', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    effect('momentum', { type: 'boolean' }),
    effect('followPointer', { type: 'boolean' }),
  ],
  tables: {
    main: {
      caption: 'GoopBreadcrumb props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Breadcrumb parts.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The links' hover and keyboard-focus highlight is one goo blob that flows from link to link. false gives shadcn's text-colour hover only.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'A soft jelly landing when the blob reaches a link.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: 'A low, wide swell of the blob sits under the pointer.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})
