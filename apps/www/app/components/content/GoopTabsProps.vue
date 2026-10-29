<script setup lang="ts">
// Props of GoopTabsList. Everything else is reka-ui's TabsList. See GoopTabsProps in
// packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'variant', type: `'default' | 'line'`, def: `'default'`, note: `Same as shadcn. 'line' keeps shadcn's underline and has no goo.` },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn TabsList.' },
  { prop: 'indicator', type: 'boolean', def: 'true', note: `The active tab's background is a goo blob that slides between triggers. false gives shadcn's flat background.` },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot when the blob lands.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches and necks to a trailing tail while it travels.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <div class="not-prose my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="props w-full min-w-[40rem] table-fixed text-sm">
      <caption class="sr-only">GoopTabsList props</caption>
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
