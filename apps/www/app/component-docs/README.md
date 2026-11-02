# Component docs metadata

Every component page gets a live demo with Preview / Code tabs, a Customize panel, a props
table, a sidebar category and an index tile from one file: `entries/<slug>.ts`. The panel and
the Code tab are generated from it. Don't write per-page UI.

## Adding a component page (3 steps)

1. **Entry** `entries/<slug>.ts` (picked up automatically):

   ```ts
   import { choice, color, effect, preset, speed, strength } from '../controls'
   import { defineComponentDoc } from '../types'

   export default defineComponentDoc({
     slug: 'combobox',              // /docs/components/combobox
     title: 'Combobox',
     category: 'Forms',             // Actions | Forms | Overlays | Navigation | Feedback | Layout
     component: 'GoopCombobox',     // must be in packages/vue/src/manifest.ts
     replay: { action: 'click', label: 'Open again' }, // one-shot effects only (overlays: 'click'; 'toggle' clicks [data-replay] without remounting, e.g. Sidebar)
     code: `<GoopCombobox{{main}}>...</GoopCombobox>`, // {{part}} = the props the reader changed
     controls: [preset(), speed(), effect('pop'), strength('openSlosh'), choice('side', ['top', 'bottom'], 'bottom')],
     tables: { main: { caption: 'GoopCombobox props', rows: [{ prop, type, def, note }] } },
   })
   ```

   Controls: `preset()`, `speed()`, `effect(prop)` (on-by-default switch), `flag(prop)`
   (opt-in switch), `strength(prop)` (0-2 slider), `num(prop, min, max, step, default)`,
   `choice(prop, options, default)`, `color()` (writes `--primary` as `style`), and
   `engine(option)` for GoopButton-style engine knobs (label, range and preset default from
   core's `GOOP_VAR_META`). Keep about eight visible; pass `{ advanced: true }` for the rest
   (behind "More"). Props of another part take `{ part: 'content' }` and expand at
   `{{content}}` in `code`. Control descriptions default to the props-table row's note.

2. **Demo**: bind the choices in the main demo set:

   ```vue
   const pg = usePlayground()
   <GoopCombobox v-bind="pg.props" />           <!-- or pg.part('content') -->
   ```

   Outside a playground `pg.props` is `{}`, so the demo component works in other previews.

3. **Markdown**: make the first preview a playground and use the generated props table:

   ```md
   ::playground{name="combobox" caption="Open it and type."}
   :demo-combobox{set="basic"}
   ::

   ::component-props{name="combobox"}
   ::
   ```

Without an entry the page still works and lands in its sidebar group via `FALLBACK` in
`registry.ts`. The index tile (`components/docs/ComponentTile.vue`) shows a monogram until
a case is added for the slug.

The landing's component count is `rootComponents` in `registry.ts`: manifest exports that
aren't parts of another export. If a new root's name extends another root's name (like
`GoopToggleGroup`), add it to `STANDALONE` there.
