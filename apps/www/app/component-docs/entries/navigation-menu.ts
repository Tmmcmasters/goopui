import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc, type PropRow } from '../types'

const mainRows: PropRow[] = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn NavigationMenu.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The top-level items' hover and open background is one goo blob that flows between them with momentum.` },
  { prop: 'contentHighlight', type: 'boolean', def: 'true', note: 'The links inside a panel get the same goo blob. false: shadcn\'s flat hover background.' },
  { prop: 'bloom', type: 'boolean', def: 'true', note: `The panel is a goo body that blooms out of its trigger and shrinks back into it. false: shadcn's zoom.` },
  { prop: 'jelly', type: 'boolean', def: 'true', note: 'Moving to another trigger, the panel slides and resizes as one body and settles with a gentle wobble. false: it jumps to the new size.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Overshoot: the highlight lands with a bounce, the bloom overshoots, the panel wobbles as it settles.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The highlight stretches and necks to a trailing tail while it travels.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: `The panel's content fades in once the goo settles.` },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true', note: 'On open, every edge of the panel bulges past rest and wobbles. A number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'true', note: 'On open, a light splash of drops, kept off the menu bar. A number from 0 to 2 sets the strength.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges, 0 to 1.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true', note: 'On close, the panel pulls in and wobbles before it shrinks back.' },
  { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The panel's color. 'popover' uses shadcn's popover tokens. Any CSS color works.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

export default defineComponentDoc({
  slug: 'navigation-menu',
  title: 'Navigation Menu',
  category: 'Navigation',
  component: 'GoopNavigationMenu',
  code: `<GoopNavigationMenu{{main}}>
  <GoopNavigationMenuList>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuTrigger>Getting started</GoopNavigationMenuTrigger>
      <GoopNavigationMenuContent>
        <ul class="grid w-72 gap-1 p-1">
          <li>
            <GoopNavigationMenuLink href="/docs" class="flex-col items-start gap-1">
              <div class="text-sm font-medium">Introduction</div>
              <p class="text-sm text-muted-foreground">Components that drip.</p>
            </GoopNavigationMenuLink>
          </li>
        </ul>
      </GoopNavigationMenuContent>
    </GoopNavigationMenuItem>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuTrigger>Components</GoopNavigationMenuTrigger>
      <GoopNavigationMenuContent>...</GoopNavigationMenuContent>
    </GoopNavigationMenuItem>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuLink href="/docs" :class="navigationMenuTriggerStyle()">Docs</GoopNavigationMenuLink>
    </GoopNavigationMenuItem>
  </GoopNavigationMenuList>
</GoopNavigationMenu>`,
  reactCode: `<GoopNavigationMenu{{main}}>
  <GoopNavigationMenuList>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuTrigger>Getting started</GoopNavigationMenuTrigger>
      <GoopNavigationMenuContent>
        <ul className="grid w-72 gap-1 p-1">
          <li>
            <GoopNavigationMenuLink href="/docs" className="flex-col items-start gap-1">
              <div className="text-sm font-medium">Introduction</div>
              <p className="text-sm text-muted-foreground">Components that drip.</p>
            </GoopNavigationMenuLink>
          </li>
        </ul>
      </GoopNavigationMenuContent>
    </GoopNavigationMenuItem>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuTrigger>Components</GoopNavigationMenuTrigger>
      <GoopNavigationMenuContent>...</GoopNavigationMenuContent>
    </GoopNavigationMenuItem>
    <GoopNavigationMenuItem>
      <GoopNavigationMenuLink href="/docs" className={navigationMenuTriggerStyle()}>Docs</GoopNavigationMenuLink>
    </GoopNavigationMenuItem>
  </GoopNavigationMenuList>
</GoopNavigationMenu>`,
  controls: [
    preset(),
    speed(),
    effect('highlight', { type: 'boolean' }),
    effect('bloom', { type: 'boolean' }),
    effect('jelly', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    strength('openSlosh'),
    strength('openDrips'),
    effect('contentHighlight', { type: 'boolean', advanced: true }),
    effect('momentum', { type: 'boolean', advanced: true }),
    effect('fade', { type: 'boolean', advanced: true }),
    strength('closeSlosh', { advanced: true }),
  ],
  tables: {
    main: { caption: 'GoopNavigationMenu goo props', rows: mainRows },
  },
  reactTables: {
    main: { caption: 'GoopNavigationMenu goo props', rows: mainRows },
  },
})
