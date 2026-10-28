<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

/** Stepped value shared by both columns of the first row. */
const value = ref(35)
const step = (d: number): void => {
  value.value = Math.max(0, Math.min(100, value.value + d))
}

/** Auto demo: fills in uneven bursts, holds at 100, then drains and starts over. */
const auto = ref(0)
const running = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
const tickAuto = (): void => {
  if (!running.value) return
  if (auto.value >= 100) {
    timer = setTimeout(() => {
      auto.value = 0
      tickAuto()
    }, 1600)
    return
  }
  auto.value = Math.min(100, auto.value + 4 + Math.round(Math.random() * 18))
  timer = setTimeout(tickAuto, 450 + Math.random() * 700)
}
watch(running, (on) => {
  clearTimeout(timer)
  if (on) tickAuto()
})
onMounted(() => tickAuto())
onBeforeUnmount(() => clearTimeout(timer))

/** Progress props from the panel, applied to every GoopProgress on the page. */
const speed = ref(1)
/** Effect toggles (core PROGRESS_EFFECTS). */
const fx = reactive({ slosh: true, drips: true, wobble: true })
const goo = ref(true)
const seed = ref(0)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  speed: speed.value,
  ...fx,
  seed: seed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/progress">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Progress props">
        <label class="flex items-center gap-2 pb-1">
          <input v-model="goo" type="checkbox">
          <span class="text-xs text-muted-foreground">goo</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label v-for="(_, name) in fx" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="fx[name]" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">seed: {{ seed }}</span>
          <input v-model.number="seed" type="range" min="0" max="20" step="1" class="w-24">
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
      </section>
    </template>

    <CompareRow label="stepped" note="buttons step the value">
      <template #shadcn>
        <Progress :model-value="value" class="w-full" />
      </template>
      <template #goop>
        <div class="grid w-full gap-3">
          <GoopProgress :model-value="value" class="w-full" v-bind="engine" />
          <div class="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" @click="step(-25)">
              −25
            </Button>
            <Button size="sm" variant="outline" @click="step(-5)">
              −5
            </Button>
            <Button size="sm" variant="outline" @click="step(5)">
              +5
            </Button>
            <Button size="sm" variant="outline" @click="step(25)">
              +25
            </Button>
            <Button size="sm" variant="ghost" @click="value = 0">
              0
            </Button>
            <Button size="sm" variant="ghost" @click="value = 100">
              100
            </Button>
            <span class="font-mono text-xs text-muted-foreground">{{ value }}%</span>
          </div>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="auto" note="bursts to 100, holds, restarts">
      <template #shadcn>
        <Progress :model-value="auto" class="w-full" />
      </template>
      <template #goop>
        <div class="grid w-full gap-3">
          <GoopProgress :model-value="auto" class="w-full" v-bind="engine" />
          <div class="flex items-center gap-2">
            <Button size="sm" variant="outline" @click="running = !running">
              {{ running ? 'Pause' : 'Run' }}
            </Button>
            <span class="font-mono text-xs text-muted-foreground">{{ auto }}%</span>
          </div>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="tall" note="h-3: more room for the goo">
      <template #shadcn>
        <Progress :model-value="value" class="h-3 w-full" />
      </template>
      <template #goop>
        <GoopProgress :model-value="value" class="h-3 w-full" v-bind="engine" />
      </template>
    </CompareRow>

    <CompareRow label="indeterminate" note="model-value null: a slug with the spinner's surge">
      <template #shadcn>
        <Progress :model-value="null" class="w-full" />
      </template>
      <template #goop>
        <div class="grid w-full gap-4">
          <GoopProgress :model-value="null" class="w-full" v-bind="engine" />
          <GoopProgress :model-value="null" class="h-3 w-full" v-bind="engine" />
        </div>
      </template>
    </CompareRow>
  </ComparePage>
</template>
