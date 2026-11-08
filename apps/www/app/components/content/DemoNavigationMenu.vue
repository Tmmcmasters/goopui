<script setup lang="ts">
// Live navigation menu demos for the Navigation Menu docs page: a real <GoopNavigationMenu>.
// Divs and spans, not ul/p: the docs prose styles lists, paragraphs and links. `set` picks the group. Keep each set in sync with the code sample beside it in the docs.
import { navigationMenuTriggerStyle } from '@goopui/vue'

withDefaults(defineProps<{ set?: 'basic' | 'inline' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()

const started = [
  { title: 'Introduction', body: 'Components that drip, built on reka-ui and Tailwind.' },
  { title: 'Installation', body: 'Add the Nuxt module or the Vue package.' },
  { title: 'Sound', body: 'Optional interaction cues.' },
]
const components = [
  { title: 'Button', body: 'Drips, splats and a shockwave.' },
  { title: 'Hover Card', body: 'Blooms out of the edge facing its link.' },
  { title: 'Tabs', body: 'A goo blob slides between triggers.' },
  { title: 'Sidebar', body: 'The edge sloshes as it collapses.' },
]
const panel = 'grid gap-1 p-1 w-[min(17rem,calc(100vw-5rem))] sm:w-80'
</script>

<template>
  <div class="flex w-full justify-start pb-72 sm:justify-center">
    <GoopNavigationMenu v-bind="pg.props" :viewport="set !== 'inline'">
      <GoopNavigationMenuList class="m-0 p-0">
        <GoopNavigationMenuItem class="m-0 p-0">
          <GoopNavigationMenuTrigger>Getting started</GoopNavigationMenuTrigger>
          <GoopNavigationMenuContent>
            <div :class="panel">
              <template v-for="s in started" :key="s.title">
                <GoopNavigationMenuLink href="#" class="flex-col items-start gap-1 no-underline" @click.prevent>
                  <span class="text-sm leading-none font-medium">{{ s.title }}</span>
                  <span class="line-clamp-2 text-sm leading-snug font-normal text-muted-foreground">{{ s.body }}</span>
                </GoopNavigationMenuLink>
              </template>
            </div>
          </GoopNavigationMenuContent>
        </GoopNavigationMenuItem>
        <GoopNavigationMenuItem class="m-0 p-0">
          <GoopNavigationMenuTrigger>Components</GoopNavigationMenuTrigger>
          <GoopNavigationMenuContent>
            <div :class="[panel, 'sm:w-[28rem] sm:grid-cols-2']">
              <template v-for="c in components" :key="c.title">
                <GoopNavigationMenuLink href="#" class="flex-col items-start gap-1 no-underline" @click.prevent>
                  <span class="text-sm leading-none font-medium">{{ c.title }}</span>
                  <span class="line-clamp-2 text-sm leading-snug font-normal text-muted-foreground">{{ c.body }}</span>
                </GoopNavigationMenuLink>
              </template>
            </div>
          </GoopNavigationMenuContent>
        </GoopNavigationMenuItem>
        <GoopNavigationMenuItem class="m-0 p-0 max-sm:hidden">
          <GoopNavigationMenuLink href="#" :class="[navigationMenuTriggerStyle(), 'no-underline']" @click.prevent>
            Docs
          </GoopNavigationMenuLink>
        </GoopNavigationMenuItem>
      </GoopNavigationMenuList>
    </GoopNavigationMenu>
  </div>
</template>
