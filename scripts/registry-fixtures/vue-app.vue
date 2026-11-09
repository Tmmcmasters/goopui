<script setup lang="ts">
// The app `pnpm check:registry` renders in a fresh Vite + Vue + shadcn-vue app (and, as
// app.vue, in a Nuxt + shadcn-nuxt app), after `shadcn-vue add` installed these components
// from the goopUI registry.
import { GoopButton } from '@/components/ui/goop-button'
import {
  GoopCommand,
  GoopCommandEmpty,
  GoopCommandGroup,
  GoopCommandInput,
  GoopCommandItem,
  GoopCommandList,
} from '@/components/ui/goop-command'
import {
  GoopDialog,
  GoopDialogContent,
  GoopDialogDescription,
  GoopDialogHeader,
  GoopDialogTitle,
  GoopDialogTrigger,
} from '@/components/ui/goop-dialog'
import {
  GoopDrawer,
  GoopDrawerContent,
  GoopDrawerDescription,
  GoopDrawerHeader,
  GoopDrawerTitle,
  GoopDrawerTrigger,
} from '@/components/ui/goop-drawer'
import { GoopSelect, GoopSelectContent, GoopSelectItem, GoopSelectTrigger, GoopSelectValue } from '@/components/ui/goop-select'
import {
  GoopSidebar,
  GoopSidebarContent,
  GoopSidebarInset,
  GoopSidebarMenu,
  GoopSidebarMenuButton,
  GoopSidebarMenuItem,
  GoopSidebarProvider,
  GoopSidebarRail,
  GoopSidebarTrigger,
} from '@/components/ui/goop-sidebar'
import { GoopTabs, GoopTabsContent, GoopTabsList, GoopTabsTrigger } from '@/components/ui/goop-tabs'
</script>

<template>
  <GoopSidebarProvider>
    <GoopSidebar collapsible="icon">
      <GoopSidebarContent>
        <GoopSidebarMenu>
          <GoopSidebarMenuItem>
            <GoopSidebarMenuButton is-active tooltip="Home">Sidebar home</GoopSidebarMenuButton>
          </GoopSidebarMenuItem>
        </GoopSidebarMenu>
      </GoopSidebarContent>
      <GoopSidebarRail />
    </GoopSidebar>
    <GoopSidebarInset>
      <GoopSidebarTrigger />
      <main class="flex flex-col items-start gap-6 p-8">
        <GoopButton>Hello goo</GoopButton>
        <GoopTabs default-value="a">
          <GoopTabsList>
            <GoopTabsTrigger value="a">Tab A</GoopTabsTrigger>
            <GoopTabsTrigger value="b">Tab B</GoopTabsTrigger>
          </GoopTabsList>
          <GoopTabsContent value="a">Panel A</GoopTabsContent>
          <GoopTabsContent value="b">Panel B</GoopTabsContent>
        </GoopTabs>
        <GoopSelect>
          <GoopSelectTrigger class="w-48">
            <GoopSelectValue placeholder="Pick a fruit" />
          </GoopSelectTrigger>
          <GoopSelectContent>
            <GoopSelectItem value="apple">Apple</GoopSelectItem>
            <GoopSelectItem value="pear">Pear</GoopSelectItem>
          </GoopSelectContent>
        </GoopSelect>
        <GoopCommand class="w-72 rounded-lg border">
          <GoopCommandInput placeholder="Search..." />
          <GoopCommandList>
            <GoopCommandEmpty>Nothing found.</GoopCommandEmpty>
            <GoopCommandGroup heading="Fruit">
              <GoopCommandItem value="apple">Apple</GoopCommandItem>
              <GoopCommandItem value="pear">Pear</GoopCommandItem>
            </GoopCommandGroup>
          </GoopCommandList>
        </GoopCommand>
        <GoopDrawer>
          <GoopDrawerTrigger as-child>
            <GoopButton variant="secondary">Open drawer</GoopButton>
          </GoopDrawerTrigger>
          <GoopDrawerContent>
            <GoopDrawerHeader>
              <GoopDrawerTitle>Goo drawer</GoopDrawerTitle>
              <GoopDrawerDescription>It pours.</GoopDrawerDescription>
            </GoopDrawerHeader>
          </GoopDrawerContent>
        </GoopDrawer>
        <GoopDialog>
          <GoopDialogTrigger as-child>
            <GoopButton variant="outline">Open dialog</GoopButton>
          </GoopDialogTrigger>
          <GoopDialogContent>
            <GoopDialogHeader>
              <GoopDialogTitle>Goo dialog</GoopDialogTitle>
              <GoopDialogDescription>It drips.</GoopDialogDescription>
            </GoopDialogHeader>
          </GoopDialogContent>
        </GoopDialog>
      </main>
    </GoopSidebarInset>
  </GoopSidebarProvider>
</template>
