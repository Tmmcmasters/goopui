<script setup lang="ts">
import { EMERGE_DRIP_KNOBS, type EmergeDripOptions, type GoopPreset, type GoopRendererName } from '@goopui/core'

const triggers = ['default', 'secondary', 'outline'] as const

/** GoopDialogContent / GoopAlertDialogContent props from the panel, applied to every goop
 *  dialog on the page. The shadcn column is the same components with `:goo="false"`. */
const goo = ref(true)
const bloomStart = ref<'single' | 'merge'>('single')
const wobble = ref(true)
const fade = ref(true)
const openSlosh = ref(true)
const openDrips = ref(true)
const closeSlosh = ref(true)
const overlay = ref(true)
const overlayDrips = ref(true)
/** Strengths (0..2) while the toggles are on; 'auto' leaves the kind's default (alert: light). */
const auto = ref(true)
const dripStrength = ref(1)
const overlayDripStrength = ref(1)
const dripKnobs = reactive(
  Object.fromEntries(Object.entries(EMERGE_DRIP_KNOBS).map(([k, m]) => [k, m.default])) as Required<EmergeDripOptions>,
)
const knobList = Object.entries(EMERGE_DRIP_KNOBS) as [keyof EmergeDripOptions, (typeof EMERGE_DRIP_KNOBS)[keyof EmergeDripOptions]][]
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const surface = ref('popover')
const surfaces = [
  ['popover', 'background (default)'],
  ['trigger', 'trigger'],
  ['oklch(0.62 0.19 150)', 'green'],
  ['oklch(0.9 0.15 95)', 'yellow'],
] as const
const engine = computed(() => ({
  goo: goo.value,
  bloomStart: bloomStart.value,
  wobble: wobble.value,
  fade: fade.value,
  openSlosh: openSlosh.value,
  closeSlosh: closeSlosh.value,
  openDrips: openDrips.value ? (auto.value ? undefined : dripStrength.value) : false,
  ...(auto.value ? {} : dripKnobs),
  overlay: overlay.value,
  overlayDrips: overlayDrips.value ? overlayDripStrength.value : false,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
  surface: surface.value,
}))
const toggles = { goo, wobble, fade, openSlosh, openDrips, closeSlosh, overlay, overlayDrips }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/dialog">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Dialog props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="flex items-center gap-2 pb-1" title="Leave splash strength and knobs at each kind's default (AlertDialog: light)">
          <input v-model="auto" type="checkbox">
          <span class="text-xs text-muted-foreground">default splash</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">drip strength: {{ dripStrength.toFixed(2) }}</span>
          <input v-model.number="dripStrength" type="range" min="0" max="2" step="0.05" class="w-28" :disabled="!openDrips || auto">
        </label>
        <label v-for="[key, m] in knobList" :key="key" class="grid gap-1" :title="m.description">
          <span class="text-xs text-muted-foreground">{{ key }}: {{ dripKnobs[key].toFixed(2) }}</span>
          <input v-model.number="dripKnobs[key]" type="range" :min="m.min" :max="m.max" :step="m.step" class="w-28" :disabled="!openDrips || auto">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">overlay drips: {{ overlayDripStrength.toFixed(2) }}</span>
          <input v-model.number="overlayDripStrength" type="range" min="0" max="2" step="0.05" class="w-28" :disabled="!overlay || !overlayDrips">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">bloomStart</span>
          <select v-model="bloomStart" :class="selectClass">
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

    <CompareRow v-for="variant in triggers" :key="variant" :label="variant" note="shadcn column: the same component with :goo=&quot;false&quot;">
      <template #shadcn>
        <GoopDialog>
          <GoopDialogTrigger as-child>
            <Button :variant="variant">
              Edit profile
            </Button>
          </GoopDialogTrigger>
          <GoopDialogContent :goo="false" class="sm:max-w-[425px]">
            <GoopDialogHeader>
              <GoopDialogTitle>Edit profile</GoopDialogTitle>
              <GoopDialogDescription>Make changes to your profile here. Click save when you're done.</GoopDialogDescription>
            </GoopDialogHeader>
            <div class="grid gap-3 py-2 text-sm">
              <label class="grid gap-1">Name <input class="h-9 rounded-md border bg-transparent px-3" value="Pedro Duarte"></label>
              <label class="grid gap-1">Username <input class="h-9 rounded-md border bg-transparent px-3" value="@peduarte"></label>
            </div>
            <GoopDialogFooter>
              <GoopDialogClose as-child>
                <Button variant="outline">
                  Cancel
                </Button>
              </GoopDialogClose>
              <Button>Save changes</Button>
            </GoopDialogFooter>
          </GoopDialogContent>
        </GoopDialog>
      </template>
      <template #goop>
        <GoopDialog>
          <GoopDialogTrigger as-child>
            <GoopButton :variant="variant">
              Edit profile
            </GoopButton>
          </GoopDialogTrigger>
          <GoopDialogContent class="sm:max-w-[425px]" v-bind="engine">
            <GoopDialogHeader>
              <GoopDialogTitle>Edit profile</GoopDialogTitle>
              <GoopDialogDescription>Make changes to your profile here. Click save when you're done.</GoopDialogDescription>
            </GoopDialogHeader>
            <div class="grid gap-3 py-2 text-sm">
              <label class="grid gap-1">Name <input class="h-9 rounded-md border bg-transparent px-3" value="Pedro Duarte"></label>
              <label class="grid gap-1">Username <input class="h-9 rounded-md border bg-transparent px-3" value="@peduarte"></label>
            </div>
            <GoopDialogFooter>
              <GoopDialogClose as-child>
                <GoopButton variant="outline">
                  Cancel
                </GoopButton>
              </GoopDialogClose>
              <GoopButton>Save changes</GoopButton>
            </GoopDialogFooter>
          </GoopDialogContent>
        </GoopDialog>
      </template>
    </CompareRow>

    <CompareRow label="alert" note="lighter splash and slosh">
      <template #shadcn>
        <GoopAlertDialog>
          <GoopAlertDialogTrigger as-child>
            <Button variant="destructive">
              Delete account
            </Button>
          </GoopAlertDialogTrigger>
          <GoopAlertDialogContent :goo="false">
            <GoopAlertDialogHeader>
              <GoopAlertDialogTitle>Are you absolutely sure?</GoopAlertDialogTitle>
              <GoopAlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </GoopAlertDialogDescription>
            </GoopAlertDialogHeader>
            <GoopAlertDialogFooter>
              <GoopAlertDialogCancel :goo="false">
                Cancel
              </GoopAlertDialogCancel>
              <GoopAlertDialogAction :goo="false">
                Continue
              </GoopAlertDialogAction>
            </GoopAlertDialogFooter>
          </GoopAlertDialogContent>
        </GoopAlertDialog>
      </template>
      <template #goop>
        <GoopAlertDialog>
          <GoopAlertDialogTrigger as-child>
            <GoopButton variant="destructive">
              Delete account
            </GoopButton>
          </GoopAlertDialogTrigger>
          <GoopAlertDialogContent v-bind="engine">
            <GoopAlertDialogHeader>
              <GoopAlertDialogTitle>Are you absolutely sure?</GoopAlertDialogTitle>
              <GoopAlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
              </GoopAlertDialogDescription>
            </GoopAlertDialogHeader>
            <GoopAlertDialogFooter>
              <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
              <GoopAlertDialogAction>Continue</GoopAlertDialogAction>
            </GoopAlertDialogFooter>
          </GoopAlertDialogContent>
        </GoopAlertDialog>
      </template>
    </CompareRow>
  </ComparePage>
</template>
