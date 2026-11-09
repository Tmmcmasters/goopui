<script setup lang="ts">
// Live menubar demo for the Menubar docs page: a real <GoopMenubar>. Keep it in sync with the
// code sample in the docs.
const bookmarks = ref(false)
const urls = ref(true)
const person = ref('benoit')
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react menus (react-demos/menus.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="menubar" :pg="{ main: pg.props, content: pg.part('content') }" />
  <GoopMenubar v-else v-bind="pg.props">
    <GoopMenubarMenu>
      <GoopMenubarTrigger>File</GoopMenubarTrigger>
      <GoopMenubarContent v-bind="pg.part('content')">
        <GoopMenubarItem>New Tab <GoopMenubarShortcut>⌘T</GoopMenubarShortcut></GoopMenubarItem>
        <GoopMenubarItem>New Window <GoopMenubarShortcut>⌘N</GoopMenubarShortcut></GoopMenubarItem>
        <GoopMenubarItem disabled>New Incognito Window</GoopMenubarItem>
        <GoopMenubarSeparator />
        <GoopMenubarSub>
          <GoopMenubarSubTrigger>Share</GoopMenubarSubTrigger>
          <GoopMenubarSubContent>
            <GoopMenubarItem>Email link</GoopMenubarItem>
            <GoopMenubarItem>Messages</GoopMenubarItem>
            <GoopMenubarItem>Notes</GoopMenubarItem>
          </GoopMenubarSubContent>
        </GoopMenubarSub>
        <GoopMenubarSeparator />
        <GoopMenubarItem>Print... <GoopMenubarShortcut>⌘P</GoopMenubarShortcut></GoopMenubarItem>
      </GoopMenubarContent>
    </GoopMenubarMenu>
    <GoopMenubarMenu>
      <GoopMenubarTrigger>Edit</GoopMenubarTrigger>
      <GoopMenubarContent v-bind="pg.part('content')">
        <GoopMenubarItem>Undo <GoopMenubarShortcut>⌘Z</GoopMenubarShortcut></GoopMenubarItem>
        <GoopMenubarItem>Redo <GoopMenubarShortcut>⇧⌘Z</GoopMenubarShortcut></GoopMenubarItem>
        <GoopMenubarSeparator />
        <GoopMenubarItem>Cut</GoopMenubarItem>
        <GoopMenubarItem>Copy</GoopMenubarItem>
        <GoopMenubarItem>Paste</GoopMenubarItem>
      </GoopMenubarContent>
    </GoopMenubarMenu>
    <GoopMenubarMenu>
      <GoopMenubarTrigger>View</GoopMenubarTrigger>
      <GoopMenubarContent class="w-60" v-bind="pg.part('content')">
        <GoopMenubarCheckboxItem v-model="bookmarks">Always Show Bookmarks Bar</GoopMenubarCheckboxItem>
        <GoopMenubarCheckboxItem v-model="urls">Always Show Full URLs</GoopMenubarCheckboxItem>
        <GoopMenubarSeparator />
        <GoopMenubarItem inset>Reload <GoopMenubarShortcut>⌘R</GoopMenubarShortcut></GoopMenubarItem>
        <GoopMenubarItem inset>Toggle Fullscreen</GoopMenubarItem>
      </GoopMenubarContent>
    </GoopMenubarMenu>
    <GoopMenubarMenu>
      <GoopMenubarTrigger>Profiles</GoopMenubarTrigger>
      <GoopMenubarContent v-bind="pg.part('content')">
        <GoopMenubarRadioGroup v-model="person">
          <GoopMenubarRadioItem value="andy">Andy</GoopMenubarRadioItem>
          <GoopMenubarRadioItem value="benoit">Benoit</GoopMenubarRadioItem>
          <GoopMenubarRadioItem value="luis">Luis</GoopMenubarRadioItem>
        </GoopMenubarRadioGroup>
        <GoopMenubarSeparator />
        <GoopMenubarItem inset>Add Profile...</GoopMenubarItem>
      </GoopMenubarContent>
    </GoopMenubarMenu>
  </GoopMenubar>
</template>
