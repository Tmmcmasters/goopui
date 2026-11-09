import { choice, color, effect, num, preset, speed } from '../controls'
import { defineComponentDoc, type PropRow } from '../types'

const contentRows: PropRow[] = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn ContextMenu parts.' },
  { prop: 'bloomFrom', type: `'pointer' | 'center'`, def: `'pointer'`, note: `Where the bloom starts. 'pointer': the right-click or long-press point (a submenu: its parent item). 'center': the panel's own center. Close shrinks back to the same spot.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `'single': one droplet swells. 'merge': a few drops fuse.` },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot: the open overshoot and settle, and the highlight overshoot.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: `The highlight's stretch and neck while it travels.` },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, every edge overshoots, rebounds, and wobbles.' },
  { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, drops splash off all around.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges, 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the menu pulls in and wobbles before it shrinks back.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that glides between items and follows the keyboard. false gives shadcn's flat background.` },
  { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is selected, before the menu closes.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell follows the pointer with a little lag. Off, or from the keyboard, it stays centred.` },
  { prop: 'submenus', type: 'boolean', def: 'true', note: 'Submenus bloom out of their item. false gives plain shadcn submenus.' },
  { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The menu's color. 'popover' uses shadcn's popover tokens. 'trigger' takes the trigger area's colors. Any CSS color works. Submenus reuse their parent's.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

export default defineComponentDoc({
  slug: 'context-menu',
  title: 'Context Menu',
  category: 'Overlays',
  component: 'GoopContextMenu',
  code: `<GoopContextMenu>
  <GoopContextMenuTrigger class="flex h-44 w-full max-w-sm items-center justify-center rounded-lg border border-dashed text-sm">
    Right-click here (or long-press)
  </GoopContextMenuTrigger>
  <GoopContextMenuContent class="w-52"{{content}}>
    <GoopContextMenuItem inset>Back <GoopContextMenuShortcut>⌘[</GoopContextMenuShortcut></GoopContextMenuItem>
    <GoopContextMenuItem inset>Reload <GoopContextMenuShortcut>⌘R</GoopContextMenuShortcut></GoopContextMenuItem>
    <GoopContextMenuSub>
      <GoopContextMenuSubTrigger inset>More tools</GoopContextMenuSubTrigger>
      <GoopContextMenuSubContent class="w-44">
        <GoopContextMenuItem>Save page…</GoopContextMenuItem>
        <GoopContextMenuItem>Developer tools</GoopContextMenuItem>
      </GoopContextMenuSubContent>
    </GoopContextMenuSub>
    <GoopContextMenuSeparator />
    <GoopContextMenuCheckboxItem v-model="bookmarks">Show bookmarks</GoopContextMenuCheckboxItem>
  </GoopContextMenuContent>
</GoopContextMenu>`,
  reactCode: `<GoopContextMenu>
  <GoopContextMenuTrigger className="flex h-44 w-full max-w-sm items-center justify-center rounded-lg border border-dashed text-sm">
    Right-click here (or long-press)
  </GoopContextMenuTrigger>
  <GoopContextMenuContent className="w-52"{{content}}>
    <GoopContextMenuItem inset>Back <GoopContextMenuShortcut>⌘[</GoopContextMenuShortcut></GoopContextMenuItem>
    <GoopContextMenuItem inset>Reload <GoopContextMenuShortcut>⌘R</GoopContextMenuShortcut></GoopContextMenuItem>
    <GoopContextMenuSub>
      <GoopContextMenuSubTrigger inset>More tools</GoopContextMenuSubTrigger>
      <GoopContextMenuSubContent className="w-44">
        <GoopContextMenuItem>Save page…</GoopContextMenuItem>
        <GoopContextMenuItem>Developer tools</GoopContextMenuItem>
      </GoopContextMenuSubContent>
    </GoopContextMenuSub>
    <GoopContextMenuSeparator />
    <GoopContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>Show bookmarks</GoopContextMenuCheckboxItem>
  </GoopContextMenuContent>
</GoopContextMenu>`,
  controls: [
    preset({ part: 'content' }),
    speed({ part: 'content' }),
    color({ part: 'content', cssVar: '--accent', description: 'Sets --accent, the colour of the highlight blob.' }),
    effect('highlight', { part: 'content', type: 'boolean' }),
    effect('pop', { part: 'content', type: 'boolean' }),
    effect('followPointer', { part: 'content', type: 'boolean' }),
    effect('submenus', { part: 'content', type: 'boolean' }),
    effect('openSlosh', { part: 'content', type: 'boolean' }),
    effect('openDrips', { part: 'content', type: 'boolean' }),
    choice('bloomFrom', ['pointer', 'center'], 'pointer', { part: 'content', advanced: true }),
    choice('surface', ['popover', 'trigger'], 'popover', { part: 'content', type: `'popover' | 'trigger' | string`, advanced: true }),
    effect('closeSlosh', { part: 'content', type: 'boolean', advanced: true }),
    effect('wobble', { part: 'content', type: 'boolean', advanced: true }),
    num('openDripAmount', 0, 3, 0.05, 1, { part: 'content', unit: '×', advanced: true }),
  ],
  tables: {
    content: { caption: 'GoopContextMenuContent goo props', rows: contentRows },
  },
  reactTables: {
    content: {
      caption: 'GoopContextMenuContent goo props',
      rows: [
        ...contentRows,
        { prop: 'goopRef', type: 'Ref<EmergeHandle>', def: '', note: `The menu's live engine handle (null before mount, or with goo off). ref is the content element.` },
        { prop: 'highlightRef', type: 'Ref<MenuHighlightHandle>', def: '', note: `The highlight blob's handle (null before mount, or with highlight off).` },
      ],
    },
  },
})
