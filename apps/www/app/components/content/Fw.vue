<script setup lang="ts">
// Framework-specific markdown. The Vue docs (/docs) and the React docs (/react/docs) render
// the same files; these blocks pick what differs:
//
//   ::fw                      ::fw{when="react"}
//   #vue                      Only on the React page.
//   ```vue ... ```            ::
//   #react
//   ```tsx ... ```
//   ::
//
// With slots, the React page falls back to the Vue slot when there is no #react one. Keep
// headings outside these blocks: the table of contents lists every heading in the file.
// `when`, not `only`: MDC strips attributes starting with "on" as unsafe.
const props = defineProps<{ when?: Framework }>()
const { fw } = useFramework()
const slots = useSlots()
const show = computed<'default' | 'vue' | 'react' | null>(() => {
  if (props.when) return props.when === fw.value ? 'default' : null
  if (fw.value === 'react' && slots.react) return 'react'
  return slots.vue ? 'vue' : 'default'
})
</script>

<template>
  <slot v-if="show === 'default'" />
  <slot v-else-if="show === 'vue'" name="vue" />
  <slot v-else-if="show === 'react'" name="react" />
</template>
