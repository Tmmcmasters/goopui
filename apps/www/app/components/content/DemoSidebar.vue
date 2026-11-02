<script setup lang="ts">
// Live sidebar demo for the Sidebar docs page: a real GoopSidebarProvider + GoopSidebar +
// GoopSidebarInset in a small frame. The frame is transformed, so the sidebar's `fixed`
// container (and its slosh) is laid out inside it. Keep in sync with the usage sample.
const props = defineProps<{ collapsible?: 'icon' | 'offcanvas' | 'none'; variant?: 'sidebar' | 'floating' | 'inset' }>()
// Customize choices from the page's playground (empty outside it); they win over `props`.
const pg = usePlayground()

const ICONS: Record<string, string> = {
  home: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  search: 'm21 21-4.34-4.34 M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  book: 'M12 7v14 M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
  chevron: 'm9 18 6-6-6-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
}
const nav = [
  { title: 'Dashboard', icon: 'home' },
  { title: 'Inbox', icon: 'inbox', badge: '12' },
  { title: 'Calendar', icon: 'calendar' },
  { title: 'Search', icon: 'search' },
]
const docs = ['Introduction', 'Get started', 'Theming']
const active = ref('Dashboard')
</script>

<template>
  <div class="sidebar-demo relative h-[420px] w-full overflow-hidden rounded-lg border border-border bg-background text-left [transform:translateZ(0)]">
    <GoopSidebarProvider class="h-full min-h-0">
      <GoopSidebar :collapsible="props.collapsible" :variant="props.variant" class="h-full" v-bind="pg.props">
        <GoopSidebarHeader>
          <GoopSidebarMenu>
            <GoopSidebarMenuItem>
              <GoopSidebarMenuButton size="lg" tooltip="Goop Inc.">
                <span class="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">G</span>
                <span class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">Goop Inc.</span>
                  <span class="truncate text-xs text-muted-foreground">Enterprise</span>
                </span>
              </GoopSidebarMenuButton>
            </GoopSidebarMenuItem>
          </GoopSidebarMenu>
        </GoopSidebarHeader>
        <GoopSidebarContent>
          <GoopSidebarGroup>
            <GoopSidebarGroupLabel>Platform</GoopSidebarGroupLabel>
            <GoopSidebarMenu>
              <GoopSidebarMenuItem v-for="item in nav" :key="item.title">
                <GoopSidebarMenuButton :is-active="active === item.title" :tooltip="item.title" @click="active = item.title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICONS[item.icon]" /></svg>
                  <span>{{ item.title }}</span>
                </GoopSidebarMenuButton>
                <GoopSidebarMenuBadge v-if="item.badge">{{ item.badge }}</GoopSidebarMenuBadge>
              </GoopSidebarMenuItem>
              <GoopCollapsible as-child class="group/collapsible">
                <GoopSidebarMenuItem>
                  <GoopCollapsibleTrigger as-child>
                    <GoopSidebarMenuButton tooltip="Documentation">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICONS.book" /></svg>
                      <span>Documentation</span>
                      <svg class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICONS.chevron" /></svg>
                    </GoopSidebarMenuButton>
                  </GoopCollapsibleTrigger>
                  <GoopCollapsibleContent>
                    <GoopSidebarMenuSub>
                      <GoopSidebarMenuSubItem v-for="d in docs" :key="d">
                        <GoopSidebarMenuSubButton href="#" :is-active="active === d" @click.prevent="active = d">
                          <span>{{ d }}</span>
                        </GoopSidebarMenuSubButton>
                      </GoopSidebarMenuSubItem>
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
              <GoopSidebarMenuButton tooltip="Settings" :is-active="active === 'Settings'" @click="active = 'Settings'">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="ICONS.settings" /></svg>
                <span>Settings</span>
              </GoopSidebarMenuButton>
            </GoopSidebarMenuItem>
          </GoopSidebarMenu>
        </GoopSidebarFooter>
        <GoopSidebarRail />
      </GoopSidebar>
      <GoopSidebarInset class="min-h-0">
        <header class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <GoopSidebarTrigger data-replay />
          <span class="text-sm font-medium">{{ active }}</span>
        </header>
        <div class="grid flex-1 gap-3 p-3 sm:grid-cols-3">
          <div v-for="i in 3" :key="i" class="h-20 rounded-lg bg-muted" />
          <div class="rounded-lg bg-muted sm:col-span-3" />
        </div>
      </GoopSidebarInset>
    </GoopSidebarProvider>
  </div>
</template>

<style>
/* The docs prose styles lists and links. The demo is app UI: undo those, and restate the
   sub-menu spacing its utilities set (mx-3.5 px-2.5 py-0.5), which this rule outranks. */
.prose .sidebar-demo ul,
.prose .sidebar-demo li {
  margin: 0;
  padding: 0;
  list-style: none;
  color: inherit;
}
.prose .sidebar-demo ul[data-sidebar="menu-sub"] {
  margin: 0 0.875rem;
  padding: 0.125rem 0.625rem;
}
.prose .sidebar-demo a {
  color: inherit;
  font-weight: inherit;
  text-decoration: none;
}
</style>
