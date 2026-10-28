<script setup lang="ts">
// Goo props of GoopDropdownMenuContent / GoopDropdownMenuSubContent. Everything else is
// reka-ui's DropdownMenuContent. Unset toggles inherit from the parent menu (submenus), then
// default to on. See GoopMenuProps in packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn DropdownMenu parts.' },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the trigger (or submenu row) and the panel.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot: panel wobble, highlight overshoot, grow-in.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: `The panel's launch, and the highlight's stretch and neck while it travels.` },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, the far edge overshoots, rebounds, and wobbles.' },
  { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, the far edge bursts: globs, drops, and specks fling off and fall away.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Burst drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Burst drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the goo lags and the near edge sloshes against the trigger.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that slides between items and follows the keyboard. false gives shadcn's flat background.` },
  { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is selected, before the menu closes.' },
  { prop: 'submenus', type: 'boolean', def: 'true', note: 'Submenus emerge from their row. false gives plain shadcn submenus.' },
  { prop: 'surface', type: `'trigger' | 'popover' | string`, def: `'trigger'`, note: `The panel's color. 'trigger' takes the trigger's background and text color, falling back to the theme's primary. 'popover' uses shadcn's popover tokens. Any CSS color works. Submenus reuse their parent's resolved colors.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <div class="not-prose my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="props w-full min-w-[40rem] table-fixed text-sm">
      <caption class="sr-only">GoopDropdownMenuContent goo props</caption>
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
