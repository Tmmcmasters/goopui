<script setup lang="ts">
// Live demos for the Command and Combobox docs pages: real <GoopCommand> / <GoopCombobox>.
// `set` picks the demo. Keep each in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'dialog' | 'combobox' }>(), { set: 'basic' })
const suggestions = ['Calendar', 'Search Emoji', 'Calculator']
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
const open = ref(false)
const framework = ref<(typeof frameworks)[number]>()
</script>

<template>
  <GoopCommand v-if="set === 'basic'" class="w-full max-w-sm rounded-lg border shadow-md">
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

  <template v-else-if="set === 'dialog'">
    <GoopButton variant="outline" @click="open = true">
      Open the palette
    </GoopButton>
    <GoopCommandDialog v-model:open="open">
      <GoopCommandInput placeholder="Type a command or search..." auto-focus />
      <GoopCommandList>
        <GoopCommandEmpty>No results found.</GoopCommandEmpty>
        <GoopCommandGroup heading="Suggestions">
          <GoopCommandItem v-for="s in suggestions" :key="s" :value="s" @select="open = false">
            {{ s }}
          </GoopCommandItem>
        </GoopCommandGroup>
        <GoopCommandSeparator />
        <GoopCommandGroup heading="Settings">
          <GoopCommandItem v-for="[s, k] in settings" :key="s" :value="s" @select="open = false">
            {{ s }}
            <GoopCommandShortcut>{{ k }}</GoopCommandShortcut>
          </GoopCommandItem>
        </GoopCommandGroup>
      </GoopCommandList>
    </GoopCommandDialog>
  </template>

  <GoopCombobox v-else v-model="framework" by="value">
    <GoopComboboxAnchor class="w-full max-w-56">
      <GoopComboboxInput placeholder="Select framework..." :display-value="(v) => v?.label ?? ''" />
    </GoopComboboxAnchor>
    <GoopComboboxList class="w-(--reka-combobox-trigger-width)">
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
