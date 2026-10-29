<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'
import { LogOutIcon, MailIcon, MessageSquareIcon, SettingsIcon, UserIcon, UserPlusIcon } from '@lucide/vue'
import { DropdownMenuPortal } from 'reka-ui'

const triggers = ['default', 'secondary', 'outline', 'ghost'] as const
const showStatusBar = ref(true)
const showPanel = ref(false)
const position = ref('bottom')
const goopStatusBar = ref(true)
const goopPanel = ref(false)
const goopPosition = ref('bottom')

/** GoopDropdownMenuContent props from the panel, applied to every goop menu on the page
 *  (submenus inherit them). */
const goo = ref(true)
/** Flow out of the trigger (false: the original inflate-from-a-bulb emerge). */
const flow = ref(true)
/** Flow style: 'bloom' (pools from the panel's own center) or 'neck' (out of the trigger). */
const flowStyle = ref<'bloom' | 'neck'>('bloom')
/** Bloom start: one droplet, or a few drops that fuse. */
const bloomStart = ref<'single' | 'merge'>('single')
const highlight = ref(true)
const pop = ref(true)
const submenus = ref(true)
const bridge = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
/** Panel color: the trigger's (default), shadcn's popover tokens, or a fixed CSS color. */
const surface = ref('trigger')
const surfaces = [
  ['trigger', 'trigger (default)'],
  ['popover', 'popover tokens'],
  ['oklch(0.62 0.19 150)', 'green'],
  ['oklch(0.55 0.22 290)', 'purple'],
  ['oklch(0.9 0.15 95)', 'yellow'],
] as const
const engine = computed(() => ({
  goo: goo.value,
  highlight: highlight.value,
  pop: pop.value,
  submenus: submenus.value,
  flow: flow.value,
  flowStyle: flowStyle.value,
  bloomStart: bloomStart.value,
  bridge: bridge.value,
  wobble: wobble.value,
  momentum: momentum.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  openDrips: openDrips.value,
  closeSlosh: closeSlosh.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
  surface: surface.value,
}))
const toggles = { goo, flow, highlight, pop, submenus, bridge, wobble, momentum, fade, openSlosh, openDrips, closeSlosh }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/dropdown">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Dropdown props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">flowStyle</span>
          <select v-model="flowStyle" :class="selectClass" :disabled="!flow">
            <option value="bloom">bloom (default)</option>
            <option value="neck">neck</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomStart</span>
          <select v-model="bloomStart" :class="selectClass" :disabled="!flow || flowStyle !== 'bloom'">
            <option value="single">single (default)</option>
            <option value="merge">merge</option>
          </select>
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
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">renderer</span>
          <select v-model="renderer" :class="selectClass">
            <option value="">auto (svg)</option>
            <option value="svg">svg</option>
            <option value="canvas">canvas</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">surface</span>
          <select v-model="surface" :class="selectClass">
            <option v-for="[value, label] in surfaces" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>
      </section>
    </template>

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
      <template #goop>
        <GoopDropdownMenu>
          <GoopDropdownMenuTrigger as-child>
            <GoopButton :variant="variant">
              Open menu
            </GoopButton>
          </GoopDropdownMenuTrigger>
          <GoopDropdownMenuContent class="w-48" align="start" v-bind="engine">
            <GoopDropdownMenuLabel>My account</GoopDropdownMenuLabel>
            <GoopDropdownMenuGroup>
              <GoopDropdownMenuItem>
                <UserIcon /> Profile <GoopDropdownMenuShortcut>⇧⌘P</GoopDropdownMenuShortcut>
              </GoopDropdownMenuItem>
              <GoopDropdownMenuItem>
                <SettingsIcon /> Settings <GoopDropdownMenuShortcut>⌘,</GoopDropdownMenuShortcut>
              </GoopDropdownMenuItem>
            </GoopDropdownMenuGroup>
            <GoopDropdownMenuSeparator />
            <GoopDropdownMenuItem variant="destructive">
              <LogOutIcon /> Log out
            </GoopDropdownMenuItem>
          </GoopDropdownMenuContent>
        </GoopDropdownMenu>
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
      <template #goop>
        <GoopDropdownMenu>
          <GoopDropdownMenuTrigger as-child>
            <GoopButton variant="outline">
              View
            </GoopButton>
          </GoopDropdownMenuTrigger>
          <GoopDropdownMenuContent class="w-48" align="start" v-bind="engine">
            <GoopDropdownMenuLabel>Appearance</GoopDropdownMenuLabel>
            <GoopDropdownMenuCheckboxItem v-model="goopStatusBar">
              Status bar
            </GoopDropdownMenuCheckboxItem>
            <GoopDropdownMenuCheckboxItem v-model="goopPanel">
              Panel
            </GoopDropdownMenuCheckboxItem>
            <GoopDropdownMenuSeparator />
            <GoopDropdownMenuLabel>Panel position</GoopDropdownMenuLabel>
            <GoopDropdownMenuRadioGroup v-model="goopPosition">
              <GoopDropdownMenuRadioItem value="top">
                Top
              </GoopDropdownMenuRadioItem>
              <GoopDropdownMenuRadioItem value="bottom">
                Bottom
              </GoopDropdownMenuRadioItem>
              <GoopDropdownMenuRadioItem value="right">
                Right
              </GoopDropdownMenuRadioItem>
            </GoopDropdownMenuRadioGroup>
          </GoopDropdownMenuContent>
        </GoopDropdownMenu>
      </template>
    </CompareRow>

    <CompareRow label="submenu" note="the submenu oozes out of its row">
      <template #shadcn>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline">
              Team
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-48" align="start">
            <DropdownMenuItem>
              <UserIcon /> Members
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserPlusIcon /> Invite users
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    <MailIcon /> Email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageSquareIcon /> Message
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <SettingsIcon /> Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </template>
      <template #goop>
        <GoopDropdownMenu>
          <GoopDropdownMenuTrigger as-child>
            <GoopButton variant="outline">
              Team
            </GoopButton>
          </GoopDropdownMenuTrigger>
          <GoopDropdownMenuContent class="w-48" align="start" v-bind="engine">
            <GoopDropdownMenuItem>
              <UserIcon /> Members
            </GoopDropdownMenuItem>
            <GoopDropdownMenuSub>
              <GoopDropdownMenuSubTrigger>
                <UserPlusIcon /> Invite users
              </GoopDropdownMenuSubTrigger>
              <GoopDropdownMenuPortal>
                <GoopDropdownMenuSubContent>
                  <GoopDropdownMenuItem>
                    <MailIcon /> Email
                  </GoopDropdownMenuItem>
                  <GoopDropdownMenuItem>
                    <MessageSquareIcon /> Message
                  </GoopDropdownMenuItem>
                </GoopDropdownMenuSubContent>
              </GoopDropdownMenuPortal>
            </GoopDropdownMenuSub>
            <GoopDropdownMenuItem>
              <SettingsIcon /> Settings
            </GoopDropdownMenuItem>
          </GoopDropdownMenuContent>
        </GoopDropdownMenu>
      </template>
    </CompareRow>
  </ComparePage>
</template>
