<script setup lang="ts">
// The same navigation menu twice: shadcn's parts (`kind: 'shadcn'`) or goopUI's (`'goop'`),
// so the compare page shows identical content side by side.
import * as Shadcn from '@/components/ui/navigation-menu'

const props = withDefaults(defineProps<{
  kind: 'shadcn' | 'goop'
  /** GoopNavigationMenu engine props (goop only). */
  engine?: Record<string, unknown>
  viewport?: boolean
  /** Fewer items (a small bar). */
  compact?: boolean
}>(), { engine: () => ({}), viewport: true, compact: false })

const goop = resolveComponent('GoopNavigationMenu')
const parts = computed(() =>
  props.kind === 'goop'
    ? {
        Root: goop,
        List: resolveComponent('GoopNavigationMenuList'),
        Item: resolveComponent('GoopNavigationMenuItem'),
        Trigger: resolveComponent('GoopNavigationMenuTrigger'),
        Content: resolveComponent('GoopNavigationMenuContent'),
        Link: resolveComponent('GoopNavigationMenuLink'),
      }
    : {
        Root: Shadcn.NavigationMenu,
        List: Shadcn.NavigationMenuList,
        Item: Shadcn.NavigationMenuItem,
        Trigger: Shadcn.NavigationMenuTrigger,
        Content: Shadcn.NavigationMenuContent,
        Link: Shadcn.NavigationMenuLink,
      },
)
const triggerStyle = Shadcn.navigationMenuTriggerStyle

const components = [
  { title: 'Alert Dialog', body: 'A modal dialog that interrupts the user with important content.' },
  { title: 'Hover Card', body: 'For sighted users to preview content available behind a link.' },
  { title: 'Progress', body: 'Displays an indicator showing the completion progress of a task.' },
  { title: 'Scroll-area', body: 'Visually or semantically separates content.' },
  { title: 'Tabs', body: 'A set of layered sections of content, displayed one at a time.' },
  { title: 'Tooltip', body: 'A popup that shows information when an element has focus or is hovered.' },
]
const started = [
  { title: 'Introduction', body: 'Re-usable components built with reka-ui and Tailwind CSS.' },
  { title: 'Installation', body: 'How to install dependencies and structure your app.' },
  { title: 'Typography', body: 'Styles for headings, paragraphs, lists...etc' },
]
const simple = ['Components', 'Documentation', 'Blocks']
</script>

<template>
  <component :is="parts.Root" :viewport="viewport" v-bind="kind === 'goop' ? engine : {}">
    <component :is="parts.List">
      <component :is="parts.Item">
        <component :is="parts.Trigger">
          Getting started
        </component>
        <component :is="parts.Content">
          <ul :class="['grid gap-2 p-2', compact ? 'w-[min(340px,calc(100vw-3rem))]' : 'w-[min(400px,calc(100vw-3rem))] md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]']">
            <li v-if="!compact" class="lg:row-span-3">
              <component :is="parts.Link" as-child>
                <a href="#" class="flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-4 no-underline outline-hidden select-none" @click.prevent>
                  <div class="mb-2 text-lg font-medium">goopUI</div>
                  <p class="text-sm leading-tight text-muted-foreground">Components that drip.</p>
                </a>
              </component>
            </li>
            <li v-for="s in started" :key="s.title">
              <component :is="parts.Link" as-child>
                <a href="#" class="flex-col items-start gap-1" @click.prevent>
                  <div class="text-sm leading-none font-medium">{{ s.title }}</div>
                  <p class="line-clamp-2 text-sm leading-snug text-muted-foreground">{{ s.body }}</p>
                </a>
              </component>
            </li>
          </ul>
        </component>
      </component>
      <component :is="parts.Item">
        <component :is="parts.Trigger">
          Components
        </component>
        <component :is="parts.Content">
          <ul :class="['grid gap-2 p-2', compact ? 'w-[min(420px,calc(100vw-3rem))] grid-cols-2' : 'w-[min(400px,calc(100vw-3rem))] md:w-[500px] md:grid-cols-2 lg:w-[600px]']">
            <li v-for="c in compact ? components.slice(0, 4) : components" :key="c.title">
              <component :is="parts.Link" as-child>
                <a href="#" class="flex-col items-start gap-1" @click.prevent>
                  <div class="text-sm leading-none font-medium">{{ c.title }}</div>
                  <p class="line-clamp-2 text-sm leading-snug text-muted-foreground">{{ c.body }}</p>
                </a>
              </component>
            </li>
          </ul>
        </component>
      </component>
      <component :is="parts.Item" v-if="!compact">
        <component :is="parts.Trigger">
          List
        </component>
        <component :is="parts.Content">
          <ul class="grid w-[200px] gap-1 p-1">
            <li v-for="s in simple" :key="s">
              <component :is="parts.Link" as-child>
                <a href="#" @click.prevent>{{ s }}</a>
              </component>
            </li>
          </ul>
        </component>
      </component>
      <component :is="parts.Item">
        <component :is="parts.Link" as-child :class="triggerStyle()">
          <a href="#" @click.prevent>Docs</a>
        </component>
      </component>
    </component>
  </component>
</template>
