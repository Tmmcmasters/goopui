<script setup lang="ts">
// Live engine controls for a compare page. Everything is generated from @goopui/vue's prop
// lists and core's GOOP_VAR_META, so new engine options show up here on their own.
import { GOOP_VAR_META, type GoopVarGroup } from '@goopui/core'
import { FEATURE_KEYS, GOOP_TUNING_KEYS, type GoopPropsInput } from '@goopui/vue'

const model = defineModel<GoopPropsInput>({ required: true })

type Tri = 'auto' | 'on' | 'off'
const triOf = (v: unknown): Tri => (v === undefined ? 'auto' : v === false || v === 0 || v === 'off' ? 'off' : 'on')
const set = (key: string, value: unknown) => {
  const next = { ...model.value } as Record<string, unknown>
  if (value === undefined || value === '') delete next[key]
  else next[key] = value
  model.value = next as GoopPropsInput
}
const setTri = (key: string, tri: Tri) => set(key, tri === 'auto' ? undefined : tri === 'on')

/** Features: the boolean toggles plus drips / splash / tilt. */
const features = ['drips', 'splash', ...FEATURE_KEYS.filter(k => k !== 'pointerReaction'), 'tilt']
const label = (key: string) => GOOP_VAR_META[key]?.label ?? key.replace(/[A-Z]/g, c => ` ${c.toLowerCase()}`)
const describe = (key: string) => GOOP_VAR_META[key]?.description ?? ''

const groups = computed(() => {
  const out = new Map<GoopVarGroup, string[]>()
  for (const key of GOOP_TUNING_KEYS) {
    const meta = GOOP_VAR_META[key]
    if (!meta || meta.unit === 'on/off') continue
    out.set(meta.group, [...(out.get(meta.group) ?? []), key])
  }
  return [...out]
})
const num = (key: string): number => {
  const v = (model.value as Record<string, unknown>)[key]
  return typeof v === 'number' ? v : Number(GOOP_VAR_META[key]?.default ?? 0)
}
const isSet = (key: string) => typeof (model.value as Record<string, unknown>)[key] === 'number'
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <section class="mb-6 rounded-xl border p-4 text-sm" aria-label="Engine props">
    <div class="flex flex-wrap items-end gap-4">
      <label class="grid gap-1">
        <span class="text-xs text-muted-foreground">preset</span>
        <select :class="selectClass" :value="model.preset ?? ''" @change="set('preset', ($event.target as HTMLSelectElement).value)">
          <option value="">auto (playful)</option>
          <option v-for="p in GOOP_VAR_META.preset?.values" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label class="grid gap-1">
        <span class="text-xs text-muted-foreground">renderer</span>
        <select :class="selectClass" :value="model.renderer ?? ''" @change="set('renderer', ($event.target as HTMLSelectElement).value)">
          <option value="">auto (svg)</option>
          <option value="svg">svg</option>
          <option value="canvas">canvas</option>
        </select>
      </label>
      <label class="grid gap-1">
        <span class="text-xs text-muted-foreground">finish</span>
        <select :class="selectClass" :value="model.finish ?? ''" @change="set('finish', ($event.target as HTMLSelectElement).value)">
          <option value="">auto (solid)</option>
          <option v-for="f in GOOP_VAR_META.finish?.values" :key="f" :value="f">{{ f }}</option>
        </select>
      </label>
      <Button variant="outline" size="sm" class="ml-auto" @click="model = {}">
        Reset
      </Button>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
      <label v-for="key in features" :key="key" class="flex items-center justify-between gap-2" :title="describe(key)">
        <span class="truncate">{{ label(key) }}</span>
        <select
          :class="selectClass"
          :value="triOf((model as Record<string, unknown>)[key])"
          :aria-label="`${label(key)}: auto, on or off`"
          @change="setTri(key, ($event.target as HTMLSelectElement).value as Tri)"
        >
          <option value="auto">auto</option>
          <option value="on">on</option>
          <option value="off">off</option>
        </select>
      </label>
    </div>

    <details class="mt-4">
      <summary class="cursor-pointer text-xs text-muted-foreground">
        Tuning (from GOOP_VAR_META)
      </summary>
      <div v-for="[group, keys] in groups" :key="group" class="mt-3">
        <h3 class="mb-1 text-xs font-medium text-muted-foreground">
          {{ group }}
        </h3>
        <div class="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <label v-for="key in keys" :key="key" class="grid grid-cols-[8rem_1fr_3rem] items-center gap-2" :title="describe(key)">
            <span class="truncate text-xs" :class="isSet(key) ? 'text-foreground' : 'text-muted-foreground'">{{ label(key) }}</span>
            <input
              type="range"
              :min="GOOP_VAR_META[key]?.min"
              :max="GOOP_VAR_META[key]?.max"
              :step="GOOP_VAR_META[key]?.step"
              :value="num(key)"
              @input="set(key, Number(($event.target as HTMLInputElement).value))"
            >
            <button type="button" class="text-right font-mono text-xs tabular-nums" :title="isSet(key) ? 'Reset to auto' : 'auto'" @click="set(key, undefined)">
              {{ isSet(key) ? num(key) : 'auto' }}
            </button>
          </label>
        </div>
      </div>
    </details>
  </section>
</template>
