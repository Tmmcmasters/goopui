<script setup lang="ts">
import { NuxtLink } from '#components'

// The only thing under the hero: what's in the box, as one wrapping row of names that link
// to their docs. Each docs page is where the live demo + props live.
const names: [string, string][] = [
  ['Button', 'button'],
  ['Input', 'input'],
  ['Textarea', 'textarea'],
  ['Select', 'select'],
  ['Checkbox', 'checkbox'],
  ['RadioGroup', 'radio-group'],
  ['Switch', 'switch'],
  ['Slider', 'slider'],
  ['Toggle', 'toggle'],
  ['ToggleGroup', 'toggle-group'],
  ['Tabs', 'tabs'],
  ['DropdownMenu', 'dropdown-menu'],
  ['Popover', 'popover'],
  ['Tooltip', 'tooltip'],
  ['Dialog', 'dialog'],
  ['AlertDialog', 'alert-dialog'],
  ['Sheet', 'sheet'],
  ['Drawer', 'drawer'],
  ['Accordion', 'accordion'],
  ['Collapsible', 'collapsible'],
  ['Progress', 'progress'],
  ['Spinner', 'spinner'],
  ['Toaster', 'toaster'],
]
const { docPath } = useComponentDocs()
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pb-32" aria-labelledby="inside">
    <div v-reveal class="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <h2 id="inside" class="text-xl font-medium tracking-[-0.02em] sm:text-2xl">
        {{ names.length }} components, all of them gooey.
      </h2>
      <NuxtLink to="/docs/components/button" class="more">
        Browse components
        <SiteIcon name="arrowRight" :size="15" />
      </NuxtLink>
    </div>
    <ul v-reveal="60" class="mt-6 flex flex-wrap gap-2">
      <li v-for="[name, slug] in names" :key="slug">
        <component :is="docPath(slug) ? NuxtLink : 'span'" :to="docPath(slug) ?? undefined" class="chip" :data-link="docPath(slug) ? '' : undefined">
          {{ name }}
        </component>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.more {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
  transition: color 150ms ease;
}
.more:hover {
  color: var(--foreground);
}
.chip {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: 999px;
  font-size: 0.875rem;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    color 150ms ease,
    background-color 150ms ease,
    box-shadow 150ms ease;
}
.chip[data-link]:hover {
  color: var(--foreground);
  background: var(--muted);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
</style>
