<script setup lang="ts">
// A small dashboard: GoopSidebar + GoopSidebarInset, with every sidebar toggle in the page.
// The page covers the playground chrome (a fixed, transformed frame, so the sidebar's `fixed`
// container is laid out inside it).
import { BookOpen, Calendar, ChevronRight, Ellipsis, House, Inbox, Plus, Search, Settings } from '@lucide/vue'
import type { GoopPreset } from '@goopui/core'

useHead({ title: 'Sidebar' })

const goo = ref(true)
const highlight = ref(true)
const pill = ref(true)
const slosh = ref(true)
const submenus = ref(true)
const tooltips = ref(true)
const bloom = ref(true)
const travel = ref(true)
const pour = ref(true)
const drawer = ref(true)
const preset = ref<GoopPreset | ''>('')
const variant = ref<'sidebar' | 'floating' | 'inset'>('sidebar')
const collapsible = ref<'offcanvas' | 'icon' | 'none'>('icon')
const side = ref<'left' | 'right'>('left')
const toggles = { goo, highlight, pill, slosh, travel, submenus, pour, tooltips, drawer, bloom }

const nav = [
  { title: 'Dashboard', icon: House, active: true },
  { title: 'Inbox', icon: Inbox, badge: '12' },
  { title: 'Calendar', icon: Calendar },
  { title: 'Search', icon: Search },
]
const docs = ['Introduction', 'Get started', 'Theming', 'Changelog']
const projects = ['Design engineering', 'Sales & marketing', 'Travel']
const active = ref('Dashboard')
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <div data-sidebar-demo class="fixed inset-0 z-40 overflow-hidden bg-background [transform:translateZ(0)]">
    <GoopSidebarProvider class="h-full min-h-0">
      <GoopSidebar
        :key="`${variant}-${collapsible}-${side}`"
        :side="side"
        :variant="variant"
        :collapsible="collapsible"
        class="h-full"
        :goo="goo"
        :highlight="highlight"
        :pill="pill"
        :slosh="slosh"
        :submenus="submenus"
        :tooltips="tooltips"
        :bloom="bloom"
        :travel="travel"
        :pour="pour"
        :drawer="drawer"
        :preset="preset || undefined"
      >
        <GoopSidebarHeader>
          <GoopSidebarMenu>
            <GoopSidebarMenuItem>
              <GoopSidebarMenuButton size="lg" tooltip="Goop Inc.">
                <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                  G
                </div>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-semibold">Goop Inc.</span>
                  <span class="truncate text-xs text-sidebar-foreground/70">Enterprise</span>
                </div>
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
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </GoopSidebarMenuButton>
                <GoopSidebarMenuBadge v-if="item.badge">{{ item.badge }}</GoopSidebarMenuBadge>
              </GoopSidebarMenuItem>
              <GoopCollapsible as-child class="group/collapsible" data-testid="docs">
                <GoopSidebarMenuItem>
                  <GoopCollapsibleTrigger as-child>
                    <GoopSidebarMenuButton tooltip="Documentation">
                      <BookOpen />
                      <span>Documentation</span>
                      <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
          <GoopSidebarGroup>
            <GoopSidebarGroupLabel>Projects</GoopSidebarGroupLabel>
            <GoopSidebarGroupAction title="Add project">
              <Plus /><span class="sr-only">Add project</span>
            </GoopSidebarGroupAction>
            <GoopSidebarMenu>
              <GoopSidebarMenuItem v-for="p in projects" :key="p">
                <GoopSidebarMenuButton :tooltip="p" :is-active="active === p" @click="active = p">
                  <span class="flex size-4 shrink-0 items-center justify-center rounded-sm bg-sidebar-accent text-[10px] font-semibold">{{ p[0] }}</span>
                  <span>{{ p }}</span>
                </GoopSidebarMenuButton>
                <GoopSidebarMenuAction show-on-hover>
                  <Ellipsis /><span class="sr-only">More</span>
                </GoopSidebarMenuAction>
              </GoopSidebarMenuItem>
              <GoopSidebarMenuItem>
                <GoopSidebarMenuSkeleton show-icon />
              </GoopSidebarMenuItem>
            </GoopSidebarMenu>
          </GoopSidebarGroup>
        </GoopSidebarContent>
        <GoopSidebarFooter>
          <GoopSidebarMenu>
            <GoopSidebarMenuItem>
              <GoopSidebarMenuButton tooltip="Settings" :is-active="active === 'Settings'" @click="active = 'Settings'">
                <Settings />
                <span>Settings</span>
              </GoopSidebarMenuButton>
            </GoopSidebarMenuItem>
          </GoopSidebarMenu>
        </GoopSidebarFooter>
        <GoopSidebarRail />
      </GoopSidebar>

      <GoopSidebarInset class="min-h-0 overflow-auto">
        <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <GoopSidebarTrigger class="-ml-1" />
          <div class="mx-1 h-4 w-px bg-border" />
          <span class="text-sm font-medium">{{ active }}</span>
          <NuxtLink to="/" class="ml-auto text-xs text-muted-foreground hover:text-foreground">Playground</NuxtLink>
        </header>
        <div class="flex flex-1 flex-col gap-4 p-4">
          <section class="rounded-xl border p-4" data-testid="controls">
            <p class="mb-3 text-xs text-muted-foreground">Ctrl/Cmd + B toggles the sidebar. Below 768px it's a drawer (swipe to close).</p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-1.5">
                <input v-model="r.value" type="checkbox"> {{ name }}
              </label>
              <select v-model="preset" :class="selectClass">
                <option value="">preset: default</option>
                <option value="subtle">subtle</option>
                <option value="playful">playful</option>
                <option value="wild">wild</option>
              </select>
              <select v-model="variant" :class="selectClass">
                <option value="sidebar">variant: sidebar</option>
                <option value="floating">floating</option>
                <option value="inset">inset</option>
              </select>
              <select v-model="collapsible" :class="selectClass">
                <option value="icon">collapsible: icon</option>
                <option value="offcanvas">offcanvas</option>
                <option value="none">none</option>
              </select>
              <select v-model="side" :class="selectClass">
                <option value="left">side: left</option>
                <option value="right">right</option>
              </select>
            </div>
          </section>
          <div class="grid auto-rows-min gap-4 md:grid-cols-3">
            <div v-for="i in 3" :key="i" class="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div class="min-h-80 flex-1 rounded-xl bg-muted/50" />
        </div>
      </GoopSidebarInset>
    </GoopSidebarProvider>
  </div>
</template>

<style>
/* The active pill's hint is green (only accents are green), also in the mobile sheet's portal. */
html:has([data-sidebar-demo]) {
  --sidebar-primary: oklch(0.62 0.15 150);
  --sidebar-primary-foreground: oklch(0.985 0 0);
}
</style>
