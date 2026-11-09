/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React preview for the Sidebar page: a real @goopui/react GoopSidebarProvider + GoopSidebar +
// GoopSidebarInset in a small frame, mirroring components/content/DemoSidebar.vue; keep the
// two in sync. The frame is transformed (the Vue component's wrapper), so the sidebar's
// `fixed` container and its slosh are laid out inside it. The Documentation sub-menu is a
// GoopCollapsible with no goo props of its own: GoopSidebar's `submenus` decides (as in Vue).
import {
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  GoopSidebar,
  GoopSidebarContent,
  GoopSidebarFooter,
  GoopSidebarGroup,
  GoopSidebarGroupLabel,
  GoopSidebarHeader,
  GoopSidebarInset,
  GoopSidebarMenu,
  GoopSidebarMenuBadge,
  GoopSidebarMenuButton,
  GoopSidebarMenuItem,
  GoopSidebarMenuSub,
  GoopSidebarMenuSubButton,
  GoopSidebarMenuSubItem,
  GoopSidebarProvider,
  GoopSidebarRail,
  GoopSidebarTrigger,
} from '@goopui/react'
import { useState } from 'react'

type Pg = Record<string, Record<string, unknown>>

const ICONS: Record<string, string> = {
  home: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  search: 'm21 21-4.34-4.34 M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  book: 'M12 7v14 M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
  chevron: 'm9 18 6-6-6-6',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
}
const Icon = ({ name, className }: { name: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
)

const NAV = [
  { title: 'Dashboard', icon: 'home' },
  { title: 'Inbox', icon: 'inbox', badge: '12' },
  { title: 'Calendar', icon: 'calendar' },
  { title: 'Search', icon: 'search' },
]
const DOCS = ['Introduction', 'Get started', 'Theming']

export function SidebarDemo({ pg }: { pg: Pg }) {
  const [active, setActive] = useState('Dashboard')
  const { collapsible, variant, ...rest } = pg.main as { collapsible?: 'icon' | 'offcanvas' | 'none'; variant?: 'sidebar' | 'floating' | 'inset' }
  return (
    <GoopSidebarProvider className="h-full min-h-0">
      <GoopSidebar collapsible={collapsible} variant={variant} className="h-full" {...rest}>
        <GoopSidebarHeader>
          <GoopSidebarMenu>
            <GoopSidebarMenuItem>
              <GoopSidebarMenuButton size="lg" tooltip="Goop Inc.">
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">G</span>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Goop Inc.</span>
                  <span className="truncate text-xs text-muted-foreground">Enterprise</span>
                </span>
              </GoopSidebarMenuButton>
            </GoopSidebarMenuItem>
          </GoopSidebarMenu>
        </GoopSidebarHeader>
        <GoopSidebarContent>
          <GoopSidebarGroup>
            <GoopSidebarGroupLabel>Platform</GoopSidebarGroupLabel>
            <GoopSidebarMenu>
              {NAV.map((item) => (
                <GoopSidebarMenuItem key={item.title}>
                  <GoopSidebarMenuButton isActive={active === item.title} tooltip={item.title} onClick={() => setActive(item.title)}>
                    <Icon name={item.icon} />
                    <span>{item.title}</span>
                  </GoopSidebarMenuButton>
                  {item.badge ? <GoopSidebarMenuBadge>{item.badge}</GoopSidebarMenuBadge> : null}
                </GoopSidebarMenuItem>
              ))}
              <GoopCollapsible asChild className="group/collapsible">
                <GoopSidebarMenuItem>
                  <GoopCollapsibleTrigger asChild>
                    <GoopSidebarMenuButton tooltip="Documentation">
                      <Icon name="book" />
                      <span>Documentation</span>
                      <Icon name="chevron" className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </GoopSidebarMenuButton>
                  </GoopCollapsibleTrigger>
                  <GoopCollapsibleContent>
                    <GoopSidebarMenuSub>
                      {DOCS.map((d) => (
                        <GoopSidebarMenuSubItem key={d}>
                          <GoopSidebarMenuSubButton
                            href="#"
                            isActive={active === d}
                            onClick={(e) => {
                              e.preventDefault()
                              setActive(d)
                            }}
                          >
                            <span>{d}</span>
                          </GoopSidebarMenuSubButton>
                        </GoopSidebarMenuSubItem>
                      ))}
                    </GoopSidebarMenuSub>
                  </GoopCollapsibleContent>
                </GoopSidebarMenuItem>
              </GoopCollapsible>
            </GoopSidebarMenu>
          </GoopSidebarGroup>
        </GoopSidebarContent>
        <GoopSidebarFooter>
          <GoopSidebarMenu>
            <GoopSidebarMenuItem>
              <GoopSidebarMenuButton tooltip="Settings" isActive={active === 'Settings'} onClick={() => setActive('Settings')}>
                <Icon name="settings" />
                <span>Settings</span>
              </GoopSidebarMenuButton>
            </GoopSidebarMenuItem>
          </GoopSidebarMenu>
        </GoopSidebarFooter>
        <GoopSidebarRail />
      </GoopSidebar>
      <GoopSidebarInset className="min-h-0">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <GoopSidebarTrigger data-replay="" />
          <span className="text-sm font-medium">{active}</span>
        </header>
        <div className="grid flex-1 gap-3 p-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
          <div className="rounded-lg bg-muted sm:col-span-3" />
        </div>
      </GoopSidebarInset>
    </GoopSidebarProvider>
  )
}
