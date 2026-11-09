import { choice, effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'sidebar',
  title: 'Sidebar',
  category: 'Navigation',
  component: 'GoopSidebar',
  replay: { action: 'toggle', label: 'Collapse / expand' },
  // side / variant change which panel the goo attaches to: re-create the demo after a change.
  remount: true,
  code: `<GoopSidebarProvider>
  <GoopSidebar{{main}}>
    <GoopSidebarContent>
      <GoopSidebarGroup>
        <GoopSidebarGroupLabel>Platform</GoopSidebarGroupLabel>
        <GoopSidebarMenu>
          <GoopSidebarMenuItem>
            <GoopSidebarMenuButton is-active tooltip="Dashboard">
              <HomeIcon />
              <span>Dashboard</span>
            </GoopSidebarMenuButton>
          </GoopSidebarMenuItem>
          <GoopSidebarMenuItem>
            <GoopSidebarMenuButton tooltip="Inbox">
              <InboxIcon />
              <span>Inbox</span>
            </GoopSidebarMenuButton>
          </GoopSidebarMenuItem>
        </GoopSidebarMenu>
      </GoopSidebarGroup>
    </GoopSidebarContent>
    <GoopSidebarRail />
  </GoopSidebar>
  <GoopSidebarInset>
    <header class="flex h-12 items-center gap-2 border-b px-3">
      <GoopSidebarTrigger />
    </header>
  </GoopSidebarInset>
</GoopSidebarProvider>`,
  controls: [
    preset(),
    choice('variant', ['sidebar', 'floating', 'inset'], 'sidebar'),
    choice('collapsible', ['offcanvas', 'icon', 'none'], 'offcanvas'),
    choice('side', ['left', 'right'], 'left'),
    effect('highlight', { type: 'boolean' }),
    effect('pill', { type: 'boolean' }),
    effect('travel', { type: 'boolean' }),
    strength('slosh'),
    effect('submenus', { type: 'boolean' }),
    effect('pour', { type: 'boolean' }),
    effect('drawer', { type: 'boolean' }),
    effect('tooltips', { type: 'boolean', advanced: true }),
    effect('bloom', { type: 'boolean', advanced: true }),
    effect('followPointer', { type: 'boolean', advanced: true }),
    speed({ advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopSidebar props',
      rows: [
        { prop: 'side', type: `'left' | 'right'`, def: `'left'`, note: 'The screen side the sidebar sits on.' },
        { prop: 'variant', type: `'sidebar' | 'floating' | 'inset'`, def: `'sidebar'`, note: 'shadcn\'s three looks: flush with a border, a floating card, or inset beside a rounded main area.' },
        { prop: 'collapsible', type: `'offcanvas' | 'icon' | 'none'`, def: `'offcanvas'`, note: 'How it collapses: slides off screen, shrinks to icons, or never collapses.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Sidebar.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: 'The hover and focus highlight is a goo blob that glides between items, its soft swell under the cursor.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: 'The highlight\'s swell follows the cursor along the item. false keeps it centred.' },
        { prop: 'pill', type: 'boolean', def: 'true', note: 'The active item is a soft filled pill with a faint rim.' },
        { prop: 'travel', type: 'boolean', def: 'true', note: 'Collapse and expand move like the Drawer: a fast launch into a small landing overshoot, and a collapse that accelerates away. false is shadcn\'s 200ms linear.' },
        { prop: 'slosh', type: 'boolean | number', def: 'true', note: 'Collapsing and expanding slosh the inner edge in low, wide mounds, driven by how fast the edge moves. A number from 0 to 2 sets the strength.' },
        { prop: 'submenus', type: 'boolean', def: 'true', note: 'GoopCollapsible sub-menus inside spring open. The open row stays unfilled, so only the active item is a pill.' },
        { prop: 'pour', type: 'boolean', def: 'true', note: 'An opening sub-menu\'s guide line pours down behind a goo bead that melts into it. Needs submenus.' },
        { prop: 'drawer', type: 'boolean', def: 'true', note: 'On mobile the sidebar is a GoopDrawer: panel and goo move as one body, land with a small overshoot, close by accelerating away, and swipe closed.' },
        { prop: 'tooltips', type: 'boolean', def: 'true', note: 'Icon-mode tooltips (GoopSidebarMenuButton tooltip) bloom as goo.' },
        { prop: 'bloom', type: 'boolean', def: 'true', note: 'With drawer off, the mobile sheet blooms from its screen edge like GoopSheet.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `app config, then 'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  reactCode: `<GoopSidebarProvider>
  <GoopSidebar{{main}}>
    <GoopSidebarContent>
      <GoopSidebarGroup>
        <GoopSidebarGroupLabel>Platform</GoopSidebarGroupLabel>
        <GoopSidebarMenu>
          <GoopSidebarMenuItem>
            <GoopSidebarMenuButton isActive tooltip="Dashboard">
              <HomeIcon />
              <span>Dashboard</span>
            </GoopSidebarMenuButton>
          </GoopSidebarMenuItem>
          <GoopSidebarMenuItem>
            <GoopSidebarMenuButton tooltip="Inbox">
              <InboxIcon />
              <span>Inbox</span>
            </GoopSidebarMenuButton>
          </GoopSidebarMenuItem>
        </GoopSidebarMenu>
      </GoopSidebarGroup>
    </GoopSidebarContent>
    <GoopSidebarRail />
  </GoopSidebar>
  <GoopSidebarInset>
    <header className="flex h-12 items-center gap-2 border-b px-3">
      <GoopSidebarTrigger />
    </header>
  </GoopSidebarInset>
</GoopSidebarProvider>`,
  reactTables: {
    main: {
      caption: 'GoopSidebar props',
      rows: [
        { prop: 'side', type: `'left' | 'right'`, def: `'left'`, note: 'The screen side the sidebar sits on.' },
        { prop: 'variant', type: `'sidebar' | 'floating' | 'inset'`, def: `'sidebar'`, note: 'shadcn\'s three looks: flush with a border, a floating card, or inset beside a rounded main area.' },
        { prop: 'collapsible', type: `'offcanvas' | 'icon' | 'none'`, def: `'offcanvas'`, note: 'How it collapses: slides off screen, shrinks to icons, or never collapses.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Sidebar.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: 'The hover and focus highlight is a goo blob that glides between items, its soft swell under the cursor.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: 'The highlight\'s swell follows the cursor along the item. false keeps it centred.' },
        { prop: 'pill', type: 'boolean', def: 'true', note: 'The active item is a soft filled pill with a faint rim.' },
        { prop: 'travel', type: 'boolean', def: 'true', note: 'Collapse and expand move like the Drawer: a fast launch into a small landing overshoot, and a collapse that accelerates away. false is shadcn\'s 200ms linear.' },
        { prop: 'slosh', type: 'boolean | number', def: 'true', note: 'Collapsing and expanding slosh the inner edge in low, wide mounds, driven by how fast the edge moves. A number from 0 to 2 sets the strength.' },
        { prop: 'submenus', type: 'boolean', def: 'true', note: 'An open Collapsible sub-menu keeps its row unfilled, so only the active item is a pill. The spring comes from a goo Collapsible.' },
        { prop: 'pour', type: 'boolean', def: 'true', note: 'An opening sub-menu\'s guide line pours down behind a goo bead that melts into it. Needs submenus and a goo Collapsible.' },
        { prop: 'drawer', type: 'boolean', def: 'true', note: 'On mobile the sidebar is a GoopDrawer: panel and goo move as one body, land with a small overshoot, close by accelerating away, and swipe closed. false is shadcn\'s Sheet.' },
        { prop: 'tooltips, bloom', type: 'boolean', def: 'true', note: 'Accepted for parity with @goopui/vue. In React, icon-mode tooltips are shadcn\'s and the mobile sheet (drawer off) slides in like shadcn\'s.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `app config, then 'svg'`, note: 'How the goo is drawn.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the fixed container (shadcn).' },
      ],
    },
  },
})
