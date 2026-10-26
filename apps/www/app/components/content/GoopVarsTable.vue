<script setup lang="ts">
// Every --goop-* var, straight from GOOP_VAR_META in @goopui/core: name, JS option,
// default, range/unit, description, cost and what reduced motion does. Grouped as the
// engine groups them, so new vars appear without touching this file.
//   :goop-vars-table                 -> every group
//   :goop-vars-table{group="Splash"} -> one group (Shape, Drips, Motion, Touch, Splash, Finish, Features)
const props = defineProps<{ group?: string }>()
const sections = computed(() => varGroups().filter((g) => !props.group || g.group.toLowerCase() === props.group.toLowerCase()))
</script>

<template>
  <div class="vars-table my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="!my-0 w-full min-w-[38rem] table-fixed">
      <colgroup>
        <col class="w-[28%]" />
        <col class="w-[9%]" />
        <col class="w-[14%]" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th class="!pl-4">Variable</th>
          <th>Default</th>
          <th>Range</th>
          <th>What it does</th>
        </tr>
      </thead>
      <tbody v-for="s in sections" :key="s.group">
        <tr v-if="!group" class="group-row">
          <th colspan="4" class="!pl-4">{{ s.group }}</th>
        </tr>
        <tr v-for="m in s.vars" :key="m.name">
          <td class="!pl-4">
            <code class="break-all">{{ m.name }}</code>
            <div class="mt-1 font-mono text-[11px] text-subtle">{{ m.option }}</div>
          </td>
          <td class="font-mono text-[13px] tabular-nums">{{ m.default }}</td>
          <td class="font-mono text-[12px] tabular-nums text-muted-foreground">
            {{ rangeText(m) }}
            <div v-if="!m.values && m.unit" class="text-subtle">{{ m.unit }}</div>
          </td>
          <td class="!pr-4 text-muted-foreground">
            <span class="text-foreground/85">{{ m.label }}.</span> {{ m.description }}
            <div class="mt-1 text-[12px] text-subtle">
              Cost: {{ m.cost }} · Reduced motion: {{ m.reducedMotion }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.vars-table tbody:last-child tr:last-child td {
  border-bottom: 0;
}
.vars-table thead th {
  background: var(--card);
  padding-top: 0.65rem;
}
.group-row th {
  padding-top: 1.1rem;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--subtle);
}
</style>
