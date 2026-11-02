<script setup lang="ts">
import type { GoopPreset } from '@goopui/core'

const suggestions = ['Calendar', 'Search Emoji', 'Calculator'] as const
const settings = [
  ['Profile', '⌘P'],
  ['Billing', '⌘B'],
  ['Settings', '⌘S'],
] as const
const frameworks = [
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]

const goo = ref(true)
const highlight = ref(true)
const pop = ref(true)
const ring = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const followPointer = ref(true)
const plop = ref(true)
const openDrips = ref(true)
const preset = ref<GoopPreset | ''>('')
const toggles = { goo, highlight, pop, ring, wobble, momentum, followPointer, plop, openDrips }

const command = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  pop: pop.value,
  ring: ring.value,
  wobble: wobble.value,
  momentum: momentum.value,
  followPointer: followPointer.value,
  preset: preset.value || undefined,
}))
const dialog = computed(() => ({ ...command.value, openDrips: openDrips.value }))
const list = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  pop: pop.value,
  plop: plop.value,
  wobble: wobble.value,
  momentum: momentum.value,
  followPointer: followPointer.value,
  openDrips: openDrips.value,
  preset: preset.value || undefined,
}))

const plainOpen = ref(false)
const goopOpen = ref(false)
const plainFw = ref<(typeof frameworks)[number]>()
const goopFw = ref<(typeof frameworks)[number]>()

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    goopOpen.value = !goopOpen.value
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
const triggerClass = 'inline-flex h-8 items-center gap-2 rounded-lg border bg-background px-3 text-sm'
</script>

<template>
  <ComparePage path="/command">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Command props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="inline" note="shadcn column: the same parts with :goo=&quot;false&quot;. Arrow keys or the pointer move the goo highlight; type to filter.">
      <template #shadcn>
        <GoopCommand :goo="false" class="w-full max-w-sm rounded-lg border shadow-md">
          <GoopCommandInput placeholder="Type a command or search..." />
          <GoopCommandList>
            <GoopCommandEmpty>No results found.</GoopCommandEmpty>
            <GoopCommandGroup heading="Suggestions">
              <GoopCommandItem v-for="s in suggestions" :key="s" :value="s">
                {{ s }}
              </GoopCommandItem>
            </GoopCommandGroup>
            <GoopCommandSeparator />
            <GoopCommandGroup heading="Settings">
              <GoopCommandItem v-for="[s, k] in settings" :key="s" :value="s">
                {{ s }}
                <GoopCommandShortcut>{{ k }}</GoopCommandShortcut>
              </GoopCommandItem>
            </GoopCommandGroup>
          </GoopCommandList>
        </GoopCommand>
      </template>
      <template #goop>
        <GoopCommand v-bind="command" class="w-full max-w-sm rounded-lg border shadow-md" data-testid="goop-command">
          <GoopCommandInput placeholder="Type a command or search..." />
          <GoopCommandList>
            <GoopCommandEmpty>No results found.</GoopCommandEmpty>
            <GoopCommandGroup heading="Suggestions">
              <GoopCommandItem v-for="s in suggestions" :key="s" :value="s">
                {{ s }}
              </GoopCommandItem>
            </GoopCommandGroup>
            <GoopCommandSeparator />
            <GoopCommandGroup heading="Settings">
              <GoopCommandItem v-for="[s, k] in settings" :key="s" :value="s">
                {{ s }}
                <GoopCommandShortcut>{{ k }}</GoopCommandShortcut>
              </GoopCommandItem>
            </GoopCommandGroup>
          </GoopCommandList>
        </GoopCommand>
      </template>
    </CompareRow>

    <CompareRow label="dialog" note="CommandDialog; the goop one also opens with ⌘K / Ctrl+K and blooms open">
      <template #shadcn>
        <button :class="triggerClass" @click="plainOpen = true">
          Open palette
        </button>
        <GoopCommandDialog v-model:open="plainOpen" :goo="false">
          <GoopCommandInput placeholder="Type a command or search..." auto-focus />
          <GoopCommandList>
            <GoopCommandEmpty>No results found.</GoopCommandEmpty>
            <GoopCommandGroup heading="Suggestions">
              <GoopCommandItem v-for="s in suggestions" :key="s" :value="s">
                {{ s }}
              </GoopCommandItem>
            </GoopCommandGroup>
          </GoopCommandList>
        </GoopCommandDialog>
      </template>
      <template #goop>
        <button :class="triggerClass" data-testid="open-dialog" @click="goopOpen = true">
          Open palette <kbd class="text-muted-foreground text-xs">⌘K</kbd>
        </button>
        <GoopCommandDialog v-model:open="goopOpen" v-bind="dialog">
          <GoopCommandInput placeholder="Type a command or search..." auto-focus />
          <GoopCommandList>
            <GoopCommandEmpty>No results found.</GoopCommandEmpty>
            <GoopCommandGroup heading="Suggestions">
              <GoopCommandItem v-for="s in suggestions" :key="s" :value="s" @select="goopOpen = false">
                {{ s }}
              </GoopCommandItem>
            </GoopCommandGroup>
            <GoopCommandSeparator />
            <GoopCommandGroup heading="Settings">
              <GoopCommandItem v-for="[s, k] in settings" :key="s" :value="s" @select="goopOpen = false">
                {{ s }}
                <GoopCommandShortcut>{{ k }}</GoopCommandShortcut>
              </GoopCommandItem>
            </GoopCommandGroup>
          </GoopCommandList>
        </GoopCommandDialog>
      </template>
    </CompareRow>

    <CompareRow label="combobox" note="Combobox: the list blooms open below the input; same highlight, pop and check plop as Select">
      <template #shadcn>
        <GoopCombobox v-model="plainFw" by="value">
          <GoopComboboxAnchor class="w-full max-w-56">
            <GoopComboboxInput :goo="false" placeholder="Select framework..." :display-value="(v) => v?.label ?? ''" />
          </GoopComboboxAnchor>
          <GoopComboboxList :goo="false" class="w-(--reka-combobox-trigger-width)">
            <GoopComboboxEmpty>No framework found.</GoopComboboxEmpty>
            <GoopComboboxGroup>
              <GoopComboboxItem v-for="f in frameworks" :key="f.value" :value="f">
                {{ f.label }}
                <GoopComboboxItemIndicator />
              </GoopComboboxItem>
            </GoopComboboxGroup>
          </GoopComboboxList>
        </GoopCombobox>
      </template>
      <template #goop>
        <GoopCombobox v-model="goopFw" by="value">
          <GoopComboboxAnchor class="w-full max-w-56">
            <GoopComboboxInput :goo="goo && ring" placeholder="Select framework..." :display-value="(v) => v?.label ?? ''" data-testid="goop-combobox" />
          </GoopComboboxAnchor>
          <GoopComboboxList v-bind="list" class="w-(--reka-combobox-trigger-width)">
            <GoopComboboxEmpty>No framework found.</GoopComboboxEmpty>
            <GoopComboboxGroup>
              <GoopComboboxItem v-for="f in frameworks" :key="f.value" :value="f">
                {{ f.label }}
                <GoopComboboxItemIndicator />
              </GoopComboboxItem>
            </GoopComboboxGroup>
          </GoopComboboxList>
        </GoopCombobox>
      </template>
    </CompareRow>
  </ComparePage>
</template>
