<script setup lang="ts">
// The props table used by the GoopXxxProps content components: prop / type / default / notes.
// Each GoopXxxProps.vue defines its rows (kept in sync with packages/vue/src/goop-props.ts and
// the component source) and renders <DocsPropsTable :rows caption>.
export interface PropRow {
  prop: string
  type: string
  def: string
  note: string
}
defineProps<{ rows: PropRow[]; caption: string }>()
</script>

<template>
  <div class="not-prose my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="props w-full min-w-[40rem] table-fixed text-sm">
      <caption class="sr-only">{{ caption }}</caption>
      <colgroup>
        <col class="w-[18%]" />
        <col class="w-[24%]" />
        <col class="w-[14%]" />
        <col />
      </colgroup>
      <thead>
        <tr><th>Prop</th><th>Type</th><th>Default</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in rows" :key="p.prop">
          <td><code>{{ p.prop }}</code></td>
          <td class="mono">{{ p.type }}</td>
          <td class="mono">{{ p.def }}</td>
          <td class="text-muted-foreground">{{ p.note }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.props th,
.props td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--border);
}
.props thead th {
  background: var(--card);
  font-weight: 500;
}
.props tbody tr:last-child td {
  border-bottom: 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>
