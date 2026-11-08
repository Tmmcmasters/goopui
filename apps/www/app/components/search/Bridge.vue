<script setup lang="ts">
// Lives inside <GoopCommand>: reports the search text and turns off the command's built-in
// filter, because the palette ranks and filters its own results (utils/search.ts).
// GoopCommand's filter (shadcn-vue's) hides every item whose text doesn't contain the query,
// which would drop fuzzy and body-text matches. Our watcher runs right after it (same source,
// child component, so later in the pre-flush queue) and marks every item and group visible;
// the palette only renders the items it wants.
import { injectGoopCommand } from '@goopui/vue'

const emit = defineEmits<{ search: [query: string] }>()
const command = injectGoopCommand()

watch(
  () => command.filterState.search,
  (q) => {
    const f = command.filterState.filtered
    for (const id of command.allItems.value.keys()) f.items.set(id, 1)
    for (const id of command.allGroups.value.keys()) f.groups.add(id)
    f.count = command.allItems.value.size
    emit('search', q)
  },
)
</script>

<template>
  <slot />
</template>
