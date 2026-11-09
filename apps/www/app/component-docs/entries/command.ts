import { color, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'command',
  title: 'Command',
  category: 'Navigation',
  component: 'GoopCommand',
  code: `<GoopCommand class="max-w-sm rounded-lg border shadow-md"{{main}}>
  <GoopCommandInput placeholder="Type a command or search..." />
  <GoopCommandList>
    <GoopCommandEmpty>No results found.</GoopCommandEmpty>
    <GoopCommandGroup heading="Suggestions">
      <GoopCommandItem value="Calendar">Calendar</GoopCommandItem>
      <GoopCommandItem value="Search Emoji">Search Emoji</GoopCommandItem>
      <GoopCommandItem value="Calculator">Calculator</GoopCommandItem>
    </GoopCommandGroup>
    <GoopCommandSeparator />
    <GoopCommandGroup heading="Settings">
      <GoopCommandItem value="Profile">
        Profile
        <GoopCommandShortcut>⌘P</GoopCommandShortcut>
      </GoopCommandItem>
    </GoopCommandGroup>
  </GoopCommandList>
</GoopCommand>`,
  reactCode: `<GoopCommand className="max-w-sm rounded-lg border shadow-md"{{main}}>
  <GoopCommandInput placeholder="Type a command or search..." />
  <GoopCommandList>
    <GoopCommandEmpty>No results found.</GoopCommandEmpty>
    <GoopCommandGroup heading="Suggestions">
      <GoopCommandItem value="Calendar">Calendar</GoopCommandItem>
      <GoopCommandItem value="Search Emoji">Search Emoji</GoopCommandItem>
      <GoopCommandItem value="Calculator">Calculator</GoopCommandItem>
    </GoopCommandGroup>
    <GoopCommandSeparator />
    <GoopCommandGroup heading="Settings">
      <GoopCommandItem value="Profile">
        Profile
        <GoopCommandShortcut>⌘P</GoopCommandShortcut>
      </GoopCommandItem>
    </GoopCommandGroup>
  </GoopCommandList>
</GoopCommand>`,
  controls: [
    preset(),
    speed(),
    color({ cssVar: '--accent', description: 'Sets --accent, the token the highlight blob is drawn with.' }),
    effect('highlight', { type: 'boolean' }),
    effect('pop', { type: 'boolean' }),
    effect('ring', { type: 'boolean' }),
    effect('wobble', { type: 'boolean', advanced: true }),
    effect('momentum', { type: 'boolean', advanced: true }),
    effect('followPointer', { type: 'boolean', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopCommand props',
      rows: [
        { prop: 'ignoreFilter', type: 'boolean', def: 'false', note: `Turns off the built-in filter: every item and group renders as given, so you can filter and order them yourself (fuzzy ranking, async results). GoopCommandEmpty then shows when there are no items. Also on GoopCommandDialog.` },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Command parts.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The active item is a goo blob that glides between items, following the arrow keys and the pointer. false gives shadcn's flat background.` },
        { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is chosen.' },
        { prop: 'ring', type: 'boolean', def: 'true', note: `The search input gets GoopInput's goo focus ring. A GoopCommandInput's own goo prop overrides it.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: `Jelly overshoot: the highlight's overshoot and grow-in, and the ring's idle wobble.` },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The highlight stretches and necks toward where it came from as it travels.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell follows the pointer with a little lag. From the keyboard it stays centred.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})
