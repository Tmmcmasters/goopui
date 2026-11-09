<script setup lang="ts">
// Live context menu demo for the Context Menu docs page: a real <GoopContextMenu>. Keep it in
// sync with the code sample in the docs.
const bookmarks = ref(true)
const urls = ref(false)
const person = ref('pedro')
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react menus (react-demos/menus.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="context-menu" :pg="{ content: pg.part('content') }" />
  <GoopContextMenu v-else>
    <GoopContextMenuTrigger class="flex h-44 w-full max-w-sm select-none items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Right-click here (or long-press)
    </GoopContextMenuTrigger>
    <GoopContextMenuContent class="w-52" v-bind="pg.part('content')">
      <GoopContextMenuItem inset>Back <GoopContextMenuShortcut>⌘[</GoopContextMenuShortcut></GoopContextMenuItem>
      <GoopContextMenuItem inset disabled>Forward <GoopContextMenuShortcut>⌘]</GoopContextMenuShortcut></GoopContextMenuItem>
      <GoopContextMenuItem inset>Reload <GoopContextMenuShortcut>⌘R</GoopContextMenuShortcut></GoopContextMenuItem>
      <GoopContextMenuSub>
        <GoopContextMenuSubTrigger inset>More tools</GoopContextMenuSubTrigger>
        <GoopContextMenuSubContent class="w-44">
          <GoopContextMenuItem>Save page…</GoopContextMenuItem>
          <GoopContextMenuItem>Create shortcut…</GoopContextMenuItem>
          <GoopContextMenuSeparator />
          <GoopContextMenuItem>Developer tools</GoopContextMenuItem>
        </GoopContextMenuSubContent>
      </GoopContextMenuSub>
      <GoopContextMenuSeparator />
      <GoopContextMenuCheckboxItem v-model="bookmarks">Show bookmarks</GoopContextMenuCheckboxItem>
      <GoopContextMenuCheckboxItem v-model="urls">Show full URLs</GoopContextMenuCheckboxItem>
      <GoopContextMenuSeparator />
      <GoopContextMenuRadioGroup v-model="person">
        <GoopContextMenuLabel inset>People</GoopContextMenuLabel>
        <GoopContextMenuRadioItem value="pedro">Pedro Duarte</GoopContextMenuRadioItem>
        <GoopContextMenuRadioItem value="colm">Colm Tuite</GoopContextMenuRadioItem>
      </GoopContextMenuRadioGroup>
    </GoopContextMenuContent>
  </GoopContextMenu>
</template>
