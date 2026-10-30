<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

// The shadcn column uses GoopDrawer with `:goo="false"`, which renders exactly shadcn-vue's
// Drawer (vaul-vue + shadcn classes); the playground has no separate shadcn drawer copy.
const directions = ['top', 'right', 'left'] as const

/** GoopDrawerContent props from the panel, applied to every goop drawer on the page. */
const goo = ref(true)
const lag = ref(true)
const slosh = ref(true)
const rise = ref(true)
const stretch = ref(true)
const handle = ref(true)
const drips = ref(true)
/** Strength (0..2) applied to every effect that's on. */
const strength = ref(1)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const on = (r: Ref<boolean>) => (r.value ? strength.value : false)
const engine = computed(() => ({
  goo: goo.value,
  lag: on(lag),
  slosh: on(slosh),
  rise: on(rise),
  stretch: on(stretch),
  handle: handle.value,
  drips: on(drips),
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, lag, slosh, rise, stretch, handle, drips }

const snapPoints = [0.35, 0.65, 1]
const snapShadcn = ref<number | string | null>(snapPoints[0]!)
const snapGoop = ref<number | string | null>(snapPoints[0]!)

const goal = ref(350)
const bump = (d: number) => (goal.value = Math.min(400, Math.max(200, goal.value + d)))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/drawer">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Drawer props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">strength: {{ strength.toFixed(2) }}</span>
          <input v-model.number="strength" type="range" min="0" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
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
            <option value="">auto (canvas)</option>
            <option value="canvas">canvas</option>
            <option value="svg">svg</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="bottom" note="drag it, flick it down, pull it up past the top">
      <template v-for="side in (['shadcn', 'goop'] as const)" :key="side" #[side]>
        <GoopDrawer>
          <GoopDrawerTrigger as-child>
            <GoopButton variant="outline" :goo="side === 'goop'">
              Open drawer
            </GoopButton>
          </GoopDrawerTrigger>
          <GoopDrawerContent v-bind="side === 'goop' ? engine : { goo: false }">
            <div class="mx-auto w-full max-w-sm">
              <GoopDrawerHeader>
                <GoopDrawerTitle>Move goal</GoopDrawerTitle>
                <GoopDrawerDescription>Set your daily activity goal.</GoopDrawerDescription>
              </GoopDrawerHeader>
              <div class="flex items-center justify-center gap-4 p-4 pb-0">
                <GoopButton variant="outline" size="icon" class="rounded-full" :goo="side === 'goop'" :disabled="goal <= 200" @click="bump(-10)">
                  -
                </GoopButton>
                <div class="text-center">
                  <div class="text-7xl font-bold tracking-tighter">
                    {{ goal }}
                  </div>
                  <div class="text-[0.70rem] uppercase text-muted-foreground">
                    Calories/day
                  </div>
                </div>
                <GoopButton variant="outline" size="icon" class="rounded-full" :goo="side === 'goop'" :disabled="goal >= 400" @click="bump(10)">
                  +
                </GoopButton>
              </div>
              <GoopDrawerFooter>
                <GoopButton :goo="side === 'goop'">
                  Submit
                </GoopButton>
                <GoopDrawerClose as-child>
                  <GoopButton variant="outline" :goo="side === 'goop'">
                    Cancel
                  </GoopButton>
                </GoopDrawerClose>
              </GoopDrawerFooter>
            </div>
          </GoopDrawerContent>
        </GoopDrawer>
      </template>
    </CompareRow>

    <CompareRow label="snap points" note="0.35 / 0.65 / 1: the edge sloshes on every snap">
      <template #shadcn>
        <GoopDrawer v-model:active-snap-point="snapShadcn" :snap-points="snapPoints">
          <GoopDrawerTrigger as-child>
            <GoopButton variant="outline" :goo="false">
              Snap points ({{ snapShadcn }})
            </GoopButton>
          </GoopDrawerTrigger>
          <GoopDrawerContent :goo="false" class="h-full max-h-[97%]">
            <GoopDrawerHeader>
              <GoopDrawerTitle>Snap points</GoopDrawerTitle>
              <GoopDrawerDescription>Drag between 35%, 65% and full height.</GoopDrawerDescription>
            </GoopDrawerHeader>
          </GoopDrawerContent>
        </GoopDrawer>
      </template>
      <template #goop>
        <GoopDrawer v-model:active-snap-point="snapGoop" :snap-points="snapPoints">
          <GoopDrawerTrigger as-child>
            <GoopButton variant="outline">
              Snap points ({{ snapGoop }})
            </GoopButton>
          </GoopDrawerTrigger>
          <GoopDrawerContent v-bind="engine" class="h-full max-h-[97%]">
            <GoopDrawerHeader>
              <GoopDrawerTitle>Snap points</GoopDrawerTitle>
              <GoopDrawerDescription>Drag between 35%, 65% and full height.</GoopDrawerDescription>
            </GoopDrawerHeader>
            <div class="flex flex-wrap justify-center gap-2 p-4">
              <GoopButton v-for="p in snapPoints" :key="p" size="sm" variant="outline" @click="snapGoop = p">
                {{ p }}
              </GoopButton>
            </div>
          </GoopDrawerContent>
        </GoopDrawer>
      </template>
    </CompareRow>

    <CompareRow label="directions" note="top, right, left: the leading edge follows">
      <template v-for="side in (['shadcn', 'goop'] as const)" :key="side" #[side]>
        <GoopDrawer v-for="d in directions" :key="d" :direction="d">
          <GoopDrawerTrigger as-child>
            <GoopButton variant="outline" size="sm" :goo="side === 'goop'">
              {{ d }}
            </GoopButton>
          </GoopDrawerTrigger>
          <GoopDrawerContent v-bind="side === 'goop' ? engine : { goo: false }">
            <GoopDrawerHeader>
              <GoopDrawerTitle>Direction: {{ d }}</GoopDrawerTitle>
              <GoopDrawerDescription>Swipe it back toward the {{ d }} edge.</GoopDrawerDescription>
            </GoopDrawerHeader>
            <GoopDrawerFooter>
              <GoopDrawerClose as-child>
                <GoopButton variant="outline" :goo="side === 'goop'">
                  Close
                </GoopButton>
              </GoopDrawerClose>
            </GoopDrawerFooter>
          </GoopDrawerContent>
        </GoopDrawer>
      </template>
    </CompareRow>
  </ComparePage>
</template>
