import { choice, effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'drawer',
  title: 'Drawer',
  category: 'Overlays',
  component: 'GoopDrawer',
  replay: { action: 'click', label: 'Open again' },
  code: `<GoopDrawer{{root}}>
  <GoopDrawerTrigger as-child>
    <GoopButton variant="outline">Open drawer</GoopButton>
  </GoopDrawerTrigger>
  <GoopDrawerContent{{content}}>
    <GoopDrawerHeader>
      <GoopDrawerTitle>Move goal</GoopDrawerTitle>
      <GoopDrawerDescription>Set your daily activity goal.</GoopDrawerDescription>
    </GoopDrawerHeader>
    <GoopDrawerFooter>
      <GoopButton>Submit</GoopButton>
    </GoopDrawerFooter>
  </GoopDrawerContent>
</GoopDrawer>`,
  controls: [
    choice('direction', ['bottom', 'top', 'left', 'right'], 'bottom', { part: 'root' }),
    preset({ part: 'content' }),
    speed({ part: 'content' }),
    strength('lag', { part: 'content' }),
    strength('slosh', { part: 'content' }),
    effect('rise', { part: 'content' }),
    effect('stretch', { part: 'content' }),
    effect('handle', { part: 'content' }),
    effect('splash', { part: 'content' }),
    effect('dismissible', { part: 'root', type: 'boolean', advanced: true }),
  ],
  tables: {
    root: {
      caption: 'GoopDrawer props',
      rows: [
        { prop: 'open', type: 'boolean', def: '', note: 'Controlled open state (v-model:open).' },
        { prop: 'defaultOpen', type: 'boolean', def: '', note: 'Open by default when uncontrolled. Skips the first enter animation.' },
        { prop: 'direction', type: `'top' | 'right' | 'bottom' | 'left'`, def: `'bottom'`, note: 'The screen edge the drawer is attached to.' },
        { prop: 'snapPoints', type: '(number | string)[]', def: '', note: `Viewport fractions (0 to 1) or px strings ('300px'), least visible first.` },
        { prop: 'activeSnapPoint', type: 'number | string | null', def: 'the first', note: 'The current snap point (v-model:activeSnapPoint).' },
        { prop: 'fadeFromIndex', type: 'number', def: 'the last', note: 'Snap index from which the overlay is fully shown. Below it the overlay stays clear.' },
        { prop: 'closeThreshold', type: 'number', def: '0.25', note: 'Share of the panel (0 to 1) that has to be dragged off before a release closes it.' },
        { prop: 'shouldScaleBackground', type: 'boolean', def: 'true', note: 'Scale the page wrapper back while open. See Background scale.' },
        { prop: 'setBackgroundColorOnScale', type: 'boolean', def: 'true', note: 'With shouldScaleBackground: paint <body> black behind the scaled page.' },
        { prop: 'dismissible', type: 'boolean', def: 'true', note: `false: dragging, clicking outside, and Escape don't close it.` },
        { prop: 'modal', type: 'boolean', def: 'true', note: `false: the page stays interactive and outside clicks don't close it.` },
        { prop: 'nested', type: 'boolean', def: 'false', note: 'Opened on top of another GoopDrawer. The parent recedes while this one is open.' },
        { prop: 'handleOnly', type: 'boolean', def: 'false', note: 'Only the handle starts a drag.' },
        { prop: 'noBodyStyles', type: 'boolean', def: 'false', note: '<body> gets no styles, so no black background on scale.' },
        { prop: 'scrollLockTimeout', type: 'number', def: '500', note: `Accepted for vaul compatibility. Scroll locking is reka-ui's.` },
        { prop: 'fixed', type: 'boolean', def: '', note: 'Accepted for vaul compatibility. No keyboard repositioning yet.' },
        { prop: 'preventScrollRestoration', type: 'boolean', def: '', note: 'Accepted for vaul compatibility.' },
      ],
    },
    content: {
      caption: 'GoopDrawerContent goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders shadcn's DrawerContent look. The drag engine still drives it.` },
        { prop: 'lag', type: 'boolean | number', def: 'true', note: 'The leading edge trails behind fast motion. A fast pull stretches it out behind the panel.' },
        { prop: 'slosh', type: 'boolean | number', def: 'true', note: 'The edge overshoots and wobbles when motion stops: on release, at snap points, and on landing.' },
        { prop: 'rise', type: 'boolean | number', def: 'true', note: 'Opening lands with an extra jelly overshoot of the edge.' },
        { prop: 'stretch', type: 'boolean | number', def: 'true', note: 'Dragging past full open pulls a globby bump toward the finger.' },
        { prop: 'handle', type: 'boolean | number', def: 'true', note: 'The drag handle is a goo blob: it swells, stretches along the drag, and trails a droplet.' },
        { prop: 'splash', type: 'boolean | number', def: 'true', note: 'Fling-dismiss: a splash of drops tears off the leading edge, flies, falls, and fades.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `app config, then 'canvas'`, note: 'How the goo is drawn. A drawer is a big surface, so it uses canvas unless you or the app config say otherwise.' },
      ],
    },
  },
})
