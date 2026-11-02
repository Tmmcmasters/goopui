<script setup lang="ts">
// The shadcn-vue ContextMenu demo's items (shared by both sides of the compare page).
const bookmarks = defineModel<boolean>('bookmarks', { default: true })
const urls = defineModel<boolean>('urls', { default: false })
const person = defineModel<string>('person', { default: 'pedro' })
</script>

<template>
  <GoopContextMenuItem inset>
    Back
    <GoopContextMenuShortcut>⌘[</GoopContextMenuShortcut>
  </GoopContextMenuItem>
  <GoopContextMenuItem inset disabled>
    Forward
    <GoopContextMenuShortcut>⌘]</GoopContextMenuShortcut>
  </GoopContextMenuItem>
  <GoopContextMenuItem inset>
    Reload
    <GoopContextMenuShortcut>⌘R</GoopContextMenuShortcut>
  </GoopContextMenuItem>
  <GoopContextMenuSub>
    <GoopContextMenuSubTrigger inset>
      More tools
    </GoopContextMenuSubTrigger>
    <GoopContextMenuSubContent class="w-44">
      <GoopContextMenuItem>Save page…</GoopContextMenuItem>
      <GoopContextMenuItem>Create shortcut…</GoopContextMenuItem>
      <GoopContextMenuItem>Name window…</GoopContextMenuItem>
      <GoopContextMenuSeparator />
      <GoopContextMenuItem>Developer tools</GoopContextMenuItem>
      <GoopContextMenuSeparator />
      <GoopContextMenuItem variant="destructive">
        Delete
      </GoopContextMenuItem>
    </GoopContextMenuSubContent>
  </GoopContextMenuSub>
  <GoopContextMenuSeparator />
  <GoopContextMenuCheckboxItem v-model="bookmarks">
    Show bookmarks
  </GoopContextMenuCheckboxItem>
  <GoopContextMenuCheckboxItem v-model="urls">
    Show full URLs
  </GoopContextMenuCheckboxItem>
  <GoopContextMenuSeparator />
  <GoopContextMenuRadioGroup v-model="person">
    <GoopContextMenuLabel inset>
      People
    </GoopContextMenuLabel>
    <GoopContextMenuRadioItem value="pedro">
      Pedro Duarte
    </GoopContextMenuRadioItem>
    <GoopContextMenuRadioItem value="colm">
      Colm Tuite
    </GoopContextMenuRadioItem>
  </GoopContextMenuRadioGroup>
</template>
