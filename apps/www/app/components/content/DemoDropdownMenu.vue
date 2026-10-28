<script setup lang="ts">
// Live dropdown menu demos for the Dropdown Menu docs page: real <GoopDropdownMenu>s.
// `set` picks the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'checks' | 'sub' | 'plain' }>(), { set: 'basic' })
const statusBar = ref(true)
const panel = ref(false)
const position = ref('bottom')
</script>

<template>
  <div class="flex flex-wrap items-start justify-center gap-4 pb-36">
  <GoopDropdownMenu v-if="set === 'basic'">
    <GoopDropdownMenuTrigger as-child>
      <GoopButton variant="outline">Open menu</GoopButton>
    </GoopDropdownMenuTrigger>
    <GoopDropdownMenuContent class="w-48">
      <GoopDropdownMenuLabel>My account</GoopDropdownMenuLabel>
      <GoopDropdownMenuGroup>
        <GoopDropdownMenuItem>Profile <GoopDropdownMenuShortcut>⇧⌘P</GoopDropdownMenuShortcut></GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Settings <GoopDropdownMenuShortcut>⌘,</GoopDropdownMenuShortcut></GoopDropdownMenuItem>
        <GoopDropdownMenuItem disabled>Billing</GoopDropdownMenuItem>
      </GoopDropdownMenuGroup>
      <GoopDropdownMenuSeparator />
      <GoopDropdownMenuItem variant="destructive">Log out</GoopDropdownMenuItem>
    </GoopDropdownMenuContent>
  </GoopDropdownMenu>

  <GoopDropdownMenu v-else-if="set === 'checks'">
    <GoopDropdownMenuTrigger as-child>
      <GoopButton variant="outline">Appearance</GoopButton>
    </GoopDropdownMenuTrigger>
    <GoopDropdownMenuContent class="w-48">
      <GoopDropdownMenuLabel>View</GoopDropdownMenuLabel>
      <GoopDropdownMenuCheckboxItem v-model="statusBar">Status bar</GoopDropdownMenuCheckboxItem>
      <GoopDropdownMenuCheckboxItem v-model="panel">Panel</GoopDropdownMenuCheckboxItem>
      <GoopDropdownMenuSeparator />
      <GoopDropdownMenuLabel>Panel position</GoopDropdownMenuLabel>
      <GoopDropdownMenuRadioGroup v-model="position">
        <GoopDropdownMenuRadioItem value="top">Top</GoopDropdownMenuRadioItem>
        <GoopDropdownMenuRadioItem value="bottom">Bottom</GoopDropdownMenuRadioItem>
        <GoopDropdownMenuRadioItem value="right">Right</GoopDropdownMenuRadioItem>
      </GoopDropdownMenuRadioGroup>
    </GoopDropdownMenuContent>
  </GoopDropdownMenu>

  <GoopDropdownMenu v-else-if="set === 'sub'">
    <GoopDropdownMenuTrigger as-child>
      <GoopButton variant="outline">Share</GoopButton>
    </GoopDropdownMenuTrigger>
    <GoopDropdownMenuContent class="w-48">
      <GoopDropdownMenuItem>Copy link</GoopDropdownMenuItem>
      <GoopDropdownMenuSub>
        <GoopDropdownMenuSubTrigger>Send to</GoopDropdownMenuSubTrigger>
        <GoopDropdownMenuSubContent>
          <GoopDropdownMenuItem>Email</GoopDropdownMenuItem>
          <GoopDropdownMenuItem>Message</GoopDropdownMenuItem>
          <GoopDropdownMenuItem>Slack</GoopDropdownMenuItem>
        </GoopDropdownMenuSubContent>
      </GoopDropdownMenuSub>
      <GoopDropdownMenuItem>Export</GoopDropdownMenuItem>
    </GoopDropdownMenuContent>
  </GoopDropdownMenu>

  <template v-else>
    <GoopDropdownMenu>
      <GoopDropdownMenuTrigger as-child>
        <GoopButton variant="secondary">No highlight blob</GoopButton>
      </GoopDropdownMenuTrigger>
      <GoopDropdownMenuContent class="w-48" :highlight="false" :open-drips="false">
        <GoopDropdownMenuItem>Profile</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Settings</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Log out</GoopDropdownMenuItem>
      </GoopDropdownMenuContent>
    </GoopDropdownMenu>
    <GoopDropdownMenu>
      <GoopDropdownMenuTrigger as-child>
        <GoopButton variant="secondary">Popover tokens</GoopButton>
      </GoopDropdownMenuTrigger>
      <GoopDropdownMenuContent class="w-48" surface="popover">
        <GoopDropdownMenuItem>Profile</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Settings</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Log out</GoopDropdownMenuItem>
      </GoopDropdownMenuContent>
    </GoopDropdownMenu>
    <GoopDropdownMenu>
      <GoopDropdownMenuTrigger as-child>
        <GoopButton variant="outline">Plain shadcn</GoopButton>
      </GoopDropdownMenuTrigger>
      <GoopDropdownMenuContent class="w-48" :goo="false">
        <GoopDropdownMenuItem>Profile</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Settings</GoopDropdownMenuItem>
        <GoopDropdownMenuItem>Log out</GoopDropdownMenuItem>
      </GoopDropdownMenuContent>
    </GoopDropdownMenu>
  </template>
  </div>
</template>
