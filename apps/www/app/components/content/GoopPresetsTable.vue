<script setup lang="ts">
// What each preset changes, from GOOP_PRESETS in @goopui/core. Only vars that differ
// between presets are listed; everything else stays at its default.
import { GOOP_PRESETS, type GoopPreset } from '@goopui/core'

const PRESETS = Object.keys(GOOP_PRESETS) as GoopPreset[]
const rows = computed(() =>
  ALL_VARS.filter((m) => {
    const vals = PRESETS.map((p) => presetDefault(m, p))
    return vals.some((v) => v !== vals[0])
  }).map((m) => ({ m, vals: PRESETS.map((p) => presetDefault(m, p)) })),
)
</script>

<template>
  <div class="my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="!my-0 min-w-[34rem]">
      <thead>
        <tr>
          <th class="!pl-4">Variable</th>
          <th v-for="p in PRESETS" :key="p" class="font-mono">{{ p }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.m.name">
          <td class="!pl-4">
            <span class="text-foreground">{{ r.m.label }}</span>
            <div class="font-mono text-[11px] text-subtle">{{ r.m.name }}</div>
          </td>
          <td v-for="(v, i) in r.vals" :key="i" class="font-mono text-[13px] tabular-nums">{{ v }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
