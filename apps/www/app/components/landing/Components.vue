<script setup lang="ts">
import { NuxtLink } from '#components'

// The catalog index: every component, grouped, each linking to its docs page.
type Item = { name: string; slug: string; note: string; new?: boolean }

const groups: { title: string; items: Item[] }[] = [
  {
    title: 'Forms',
    items: [
      { name: 'Input', slug: 'input', note: 'Focus flows a goo ring around the border.', new: true },
      { name: 'Textarea', slug: 'textarea', note: 'The same focus ring, for long text.', new: true },
      { name: 'Select', slug: 'select', note: 'The list blooms out of the selected item.', new: true },
      { name: 'Checkbox', slug: 'checkbox', note: 'Checking drops goo into the box.' },
      { name: 'RadioGroup', slug: 'radio-group', note: 'The dot flies between options and splats.' },
      { name: 'Switch', slug: 'switch', note: 'Colour floods in on impact.' },
      { name: 'Slider', slug: 'slider', note: 'Goo thumbs on a liquid range.' },
    ],
  },
  {
    title: 'Actions',
    items: [
      { name: 'Button', slug: 'button', note: 'Drips, splashes, shockwaves, oil.' },
      { name: 'Toggle', slug: 'toggle', note: 'Floods with goo when pressed.', new: true },
      { name: 'ToggleGroup', slug: 'toggle-group', note: 'The fill flows from item to item.' },
      { name: 'DropdownMenu', slug: 'dropdown-menu', note: 'Blooms open, items stay crisp.' },
      { name: 'Tabs', slug: 'tabs', note: 'The active blob slides with momentum.' },
    ],
  },
  {
    title: 'Overlays',
    items: [
      { name: 'Dialog', slug: 'dialog', note: 'Blooms from its centre with a big splash.', new: true },
      { name: 'AlertDialog', slug: 'alert-dialog', note: 'A lighter splash for hard questions.', new: true },
      { name: 'Sheet', slug: 'sheet', note: 'Blooms in from the screen edge.', new: true },
      { name: 'Drawer', slug: 'drawer', note: 'Drag it; it rubber-bands and snaps.', new: true },
      { name: 'Popover', slug: 'popover', note: 'Blooms with a big splash.' },
      { name: 'Tooltip', slug: 'tooltip', note: 'A small bloom on every hover.' },
    ],
  },
  {
    title: 'Feedback and layout',
    items: [
      { name: 'Toaster', slug: 'toaster', note: 'Sonner toasts, gooey.' },
      { name: 'Progress', slug: 'progress', note: 'Fills like liquid, with the odd drip.' },
      { name: 'Spinner', slug: 'spinner', note: 'Blobs that orbit and merge.' },
      { name: 'Accordion', slug: 'accordion', note: 'Floods the open row; opens on a jelly spring.', new: true },
      { name: 'Collapsible', slug: 'collapsible', note: 'The accordion, one section.', new: true },
    ],
  },
]
const { docPath } = useComponentDocs()
const total = groups.reduce((n, g) => n + g.items.length, 0)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="components">
    <LandingSectionHead id="components" :title="`${total} components, all of them gooey.`">
      The shadcn catalog you already use, each on the same reka-ui primitive. Every one is in the grid above; here's where
      their docs live.
    </LandingSectionHead>

    <div class="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="(g, gi) in groups" :key="g.title" v-reveal="gi * 60" class="min-w-0">
        <h3 class="border-b border-border pb-3 text-sm font-medium">{{ g.title }}</h3>
        <ul class="mt-1">
          <li v-for="c in g.items" :key="c.slug">
            <component :is="docPath(c.slug) ? NuxtLink : 'div'" :to="docPath(c.slug) ?? undefined" class="item" :data-link="docPath(c.slug) ? '' : undefined">
              <span class="flex items-center gap-2">
                <span class="item-name">{{ c.name }}</span>
                <LandingNewTag v-if="c.new" />
              </span>
              <span class="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{{ c.note }}</span>
            </component>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.item {
  display: block;
  margin: 0 -0.625rem;
  padding: 0.6rem 0.625rem;
  border-radius: 0.625rem;
  transition: background-color 150ms ease;
}
.item[data-link]:hover {
  background: var(--muted);
}
.item-name {
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.item[data-link]:hover .item-name {
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 3px;
}
</style>
