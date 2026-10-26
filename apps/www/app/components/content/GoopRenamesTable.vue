<script setup lang="ts">
// Old name -> new name, from GOOP_VAR_RENAMES and GOOP_OPTION_RENAMES in @goopui/core.
import { GOOP_OPTION_RENAMES, GOOP_VAR_RENAMES } from '@goopui/core'

const rows = computed(() => {
  const byNewVar = Object.entries(GOOP_VAR_RENAMES)
  return byNewVar.map(([oldVar, newVar]) => {
    const m = ALL_VARS.find((x) => x.name === newVar)
    const oldOpt = Object.entries(GOOP_OPTION_RENAMES).find(([, n]) => n === m?.option)?.[0]
    return { oldVar, newVar, oldOpt, newOpt: m?.option }
  })
})
</script>

<template>
  <div class="my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="!my-0 min-w-[34rem]">
      <thead>
        <tr>
          <th class="!pl-4">Old CSS var</th>
          <th>New CSS var</th>
          <th>Old option</th>
          <th>New option</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.oldVar">
          <td class="!pl-4 text-muted-foreground"><code>{{ r.oldVar }}</code></td>
          <td><code>{{ r.newVar }}</code></td>
          <td class="font-mono text-[13px] text-muted-foreground">{{ r.oldOpt ?? '' }}</td>
          <td class="font-mono text-[13px]">{{ r.oldOpt ? r.newOpt : '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
