import { color, effect, num, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'menubar',
  title: 'Menubar',
  category: 'Navigation',
  component: 'GoopMenubar',
  code: `<GoopMenubar{{main}}>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>File</GoopMenubarTrigger>
    <GoopMenubarContent{{content}}>
      <GoopMenubarItem>New Tab <GoopMenubarShortcut>⌘T</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarItem>New Window <GoopMenubarShortcut>⌘N</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarSeparator />
      <GoopMenubarSub>
        <GoopMenubarSubTrigger>Share</GoopMenubarSubTrigger>
        <GoopMenubarSubContent>
          <GoopMenubarItem>Email link</GoopMenubarItem>
          <GoopMenubarItem>Messages</GoopMenubarItem>
        </GoopMenubarSubContent>
      </GoopMenubarSub>
    </GoopMenubarContent>
  </GoopMenubarMenu>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>Edit</GoopMenubarTrigger>
    <GoopMenubarContent{{content}}>
      <GoopMenubarItem>Undo <GoopMenubarShortcut>⌘Z</GoopMenubarShortcut></GoopMenubarItem>
      <GoopMenubarItem>Redo <GoopMenubarShortcut>⇧⌘Z</GoopMenubarShortcut></GoopMenubarItem>
    </GoopMenubarContent>
  </GoopMenubarMenu>
  <GoopMenubarMenu>
    <GoopMenubarTrigger>View</GoopMenubarTrigger>
    <GoopMenubarContent{{content}}>
      <GoopMenubarCheckboxItem v-model="bookmarks">Always Show Bookmarks Bar</GoopMenubarCheckboxItem>
    </GoopMenubarContent>
  </GoopMenubarMenu>
</GoopMenubar>`,
  controls: [
    preset(),
    speed(),
    effect('highlight', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    effect('momentum', { type: 'boolean' }),
    color({ part: 'content', cssVar: '--accent', description: 'Sets --accent, the colour of the item highlight blob.' }),
    effect('highlight', { part: 'content', type: 'boolean' }),
    effect('pop', { part: 'content', type: 'boolean' }),
    effect('submenus', { part: 'content', type: 'boolean', advanced: true }),
    effect('openSlosh', { part: 'content', type: 'boolean', advanced: true }),
    effect('openDrips', { part: 'content', type: 'boolean', advanced: true }),
    effect('followPointer', { part: 'content', type: 'boolean', advanced: true }),
    effect('closeSlosh', { part: 'content', type: 'boolean', advanced: true }),
    num('openDripAmount', 0, 3, 0.05, 1, { part: 'content', unit: '×', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopMenubar goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Menubar parts, menus included (unless a menu sets its own goo).' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The trigger highlight is one goo body that flows between triggers as you hover or arrow across, and sits on the open trigger. false gives shadcn's flat hover background.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot when the body lands. Menus inherit it.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The body stretches and necks to a trailing tail while it travels. Menus inherit it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier. Menus inherit it.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel. Menus inherit it.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn. Menus inherit it.' },
      ],
    },
    content: {
      caption: 'GoopMenubarContent goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: `the bar's, then true`, note: `Master switch for this menu. false renders shadcn's MenubarContent.` },
        { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom': the menu pools from its center, spreads, overshoots, and splashes. 'neck': it flows out of the trigger through a thick neck.` },
        { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `'single': one droplet swells. 'merge': a few drops fuse.` },
        { prop: 'wobble', type: 'boolean', def: `the bar's, then true`, note: 'Jelly overshoot: the open overshoot and settle, and the item highlight overshoot.' },
        { prop: 'momentum', type: 'boolean', def: `the bar's, then true`, note: `The item highlight's stretch and neck while it travels.` },
        { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
        { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, every edge overshoots, rebounds, and wobbles.' },
        { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, drops splash off all around, kept off the bar.' },
        { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
        { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the menu pulls in and wobbles before it shrinks back.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that glides between items and follows the keyboard. false gives shadcn's flat background.` },
        { prop: 'pop', type: 'boolean', def: 'true', note: 'The item highlight squishes when an item is selected, before the menu closes.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: `The item highlight's swell follows the pointer with a little lag.` },
        { prop: 'submenus', type: 'boolean', def: 'true', note: 'Submenus emerge from their row. false gives plain shadcn submenus.' },
        { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The menu's color. 'popover' uses shadcn's popover tokens. Any CSS color works. Submenus reuse their parent's.` },
        { prop: 'speed', type: 'number', def: `the bar's, then 1`, note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: `the bar's, then app config`, note: 'The overall feel.' },
      ],
    },
  },
})
