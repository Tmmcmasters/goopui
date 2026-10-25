<script setup lang="ts">
import { LogOutIcon, SettingsIcon, UserIcon } from '@lucide/vue'

const triggers = ['default', 'secondary', 'outline', 'ghost'] as const
const showStatusBar = ref(true)
const showPanel = ref(false)
const position = ref('bottom')
</script>

<template>
  <ComparePage path="/dropdown">
    <CompareRow v-for="variant in triggers" :key="variant" :label="variant">
      <template #shadcn>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button :variant="variant">
              Open menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48" align="start">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserIcon /> Profile <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SettingsIcon /> Settings <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOutIcon /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </CompareRow>

    <CompareRow label="checkbox + radio">
      <template #shadcn>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48" align="start">
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuCheckboxItem v-model="showStatusBar">
              Status bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem v-model="showPanel">
              Panel
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Panel position</DropdownMenuLabel>
            <DropdownMenuRadioGroup v-model="position">
              <DropdownMenuRadioItem value="top">
                Top
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right">
                Right
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
    </CompareRow>
  </ComparePage>
</template>
