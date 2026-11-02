<script setup lang="ts">
// Goo props of GoopContextMenuContent / SubContent. Everything else is reka-ui's. Unset
// toggles default to on (submenus inherit them). See GoopContextMenuProps in
// packages/vue/src/goop-props.ts.
const rows = [
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
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopContextMenuContent goo props" />
</template>
