<script setup lang="ts">
// The shadcn-vue Menubar demo's menus (shared by both sides of the compare page). `content`
// holds GoopMenubarContent props (the shadcn side passes { goo: false }).
defineProps<{ content?: Record<string, unknown> }>()
const bookmarks = ref(false)
const urls = ref(true)
const person = ref('benoit')
</script>

<template>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>File</GoopMenubarTrigger>
    <GoopMenubarContent v-bind="content">
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
    <GoopMenubarContent v-bind="content">
      <GoopMenubarItem>Undo <GoopMenubarShortcut>⌘Z</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarItem>Redo <GoopMenubarShortcut>⇧⌘Z</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarSeparator />
      <GoopMenubarSub>
        <GoopMenubarSubTrigger>Find</GoopMenubarSubTrigger>
        <GoopMenubarSubContent>
          <GoopMenubarItem>Search the web</GoopMenubarItem>
          <GoopMenubarSeparator />
          <GoopMenubarItem>Find...</GoopMenubarItem>
          <GoopMenubarItem>Find Next</GoopMenubarItem>
          <GoopMenubarItem>Find Previous</GoopMenubarItem>
        </GoopMenubarSubContent>
      </GoopMenubarSub>
      <GoopMenubarSeparator />
      <GoopMenubarItem>Cut</GoopMenubarItem>
      <GoopMenubarItem>Copy</GoopMenubarItem>
      <GoopMenubarItem>Paste</GoopMenubarItem>
    </GoopMenubarContent>
  </GoopMenubarMenu>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>View</GoopMenubarTrigger>
    <GoopMenubarContent class="w-64" v-bind="content">
      <GoopMenubarCheckboxItem v-model="bookmarks">Always Show Bookmarks Bar</GoopMenubarCheckboxItem>
      <GoopMenubarCheckboxItem v-model="urls">Always Show Full URLs</GoopMenubarCheckboxItem>
      <GoopMenubarSeparator />
      <GoopMenubarItem inset>Reload <GoopMenubarShortcut>⌘R</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarItem disabled inset>Force Reload <GoopMenubarShortcut>⇧⌘R</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarSeparator />
      <GoopMenubarItem inset>Toggle Fullscreen</GoopMenubarItem>
      <GoopMenubarSeparator />
      <GoopMenubarItem inset>Hide Sidebar</GoopMenubarItem>
    </GoopMenubarContent>
  </GoopMenubarMenu>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>Profiles</GoopMenubarTrigger>
    <GoopMenubarContent v-bind="content">
      <GoopMenubarRadioGroup v-model="person">
        <GoopMenubarRadioItem value="andy">Andy</GoopMenubarRadioItem>
        <GoopMenubarRadioItem value="benoit">Benoit</GoopMenubarRadioItem>
        <GoopMenubarRadioItem value="Luis">Luis</GoopMenubarRadioItem>
      </GoopMenubarRadioGroup>
      <GoopMenubarSeparator />
      <GoopMenubarItem inset>Edit...</GoopMenubarItem>
      <GoopMenubarSeparator />
      <GoopMenubarItem inset>Add Profile...</GoopMenubarItem>
    </GoopMenubarContent>
  </GoopMenubarMenu>
</template>
