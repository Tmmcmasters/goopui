import { effect, num, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'page-transition',
  title: 'Page transition',
  category: 'Navigation',
  component: 'GoopPageTransition',
  replay: { action: 'click', label: 'Pour again' },
  code: `<!-- app.vue (with @goopui/nuxt, the module's pageTransition option does this) -->
<template>
  <GoopPageTransition{{main}} />
  <NuxtPage />
</template>`,
  controls: [
    preset(),
    speed(),
    strength('bubbles'),
    strength('bulge'),
    effect('band', { type: 'boolean | number' }),
    effect('wobble'),
    effect('lag'),
    num('duration', 400, 3000, 50, 1150, { unit: 'ms', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'Page transition options',
      rows: [
        { prop: 'direction', type: `'down' | 'up' | 'left' | 'right'`, def: `'down'`, note: 'Which way the goo travels.' },
        { prop: 'duration', type: 'number', def: '1150', note: `Total cover and reveal time in ms ('subtle' is a little quicker, 'wild' a little slower). The hold in between lasts until the page is ready.` },
        { prop: 'coverDuration, revealDuration', type: 'number', def: '', note: 'Set each part separately (ms).' },
        { prop: 'split', type: 'boolean', def: 'true', note: 'The band is the seam between the old page and the new one. false swaps the page while the band is over the middle and fades the new page in. Only with the band, and never under reduced motion.' },
        { prop: 'band', type: fx, def: 'true', note: `A band that sweeps through. false gives a full-screen wall that covers, then drains; a number from 0.2 to 1 sets the band's thickness as a share of the screen.` },
        { prop: 'bubbles', type: fx, def: 'true', note: 'See-through bubbles rising through the goo. false turns them off, and a number from 0 to 2 scales how many.' },
        { prop: 'bulge', type: fx, def: 'true', note: 'Mounds on the front. false gives a flat front, and a number from 0 to 2 scales them.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The mounds and bubbles wobble and drift as they move.' },
        { prop: 'lag', type: fx, def: 'true', note: 'The trailing edge stretches back as it moves.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: `'playful'`, note: 'The overall feel.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'color, accent, highlight', type: 'string | false', def: 'CSS variables', note: 'Wall, lip and glow colours. See Colors.' },
        { prop: 'zIndex', type: 'number', def: '2147483000', note: `The overlay's z-index.` },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Vue only: false turns it off (core: enabled: false).' },
      ],
    },
  },
  reactCode: `'use client'
// app/page-transition.tsx, around {children} in app/layout.tsx
<GoopPageTransition routeKey={usePathname()}{{main}}>
  {children}
</GoopPageTransition>`,
  reactTables: {
    main: {
      caption: 'GoopPageTransition props',
      rows: [
        { prop: 'routeKey', type: 'string', def: '', note: `Changes once the new page has rendered: pass Next.js's usePathname(). Without it, the reveal waits for the URL to change.` },
        { prop: 'links', type: 'boolean', def: 'true', note: 'Run on in-app link clicks: a plain left click on a same-origin link to another path, with no target or download. The click is held until the page is covered, then let through to your router.' },
        { prop: 'revealTimeout', type: 'number', def: '4000', note: 'Reveal anyway this long (ms) after a navigation that never lands.' },
        { prop: 'fade', type: 'string | false', def: 'false', note: 'With split off: a selector for the element to fade in as the new page swaps in behind the band.' },
        { prop: 'fadeDuration', type: 'number', def: '200', note: 'Fade length (ms).' },
        { prop: 'goopRef', type: 'Ref<GoopPageTransitionApi>', def: '', note: 'cover(), reveal(), navigate(go), splits() and the live core handle. useGoopPageTransition() returns the same inside it.' },
        { prop: 'direction', type: `'down' | 'up' | 'left' | 'right'`, def: `'down'`, note: 'Which way the goo travels.' },
        { prop: 'duration', type: 'number', def: '1150', note: `Total cover and reveal time in ms ('subtle' is a little quicker, 'wild' a little slower). The hold in between lasts until the page is ready.` },
        { prop: 'coverDuration, revealDuration', type: 'number', def: '', note: 'Set each part separately (ms).' },
        { prop: 'split', type: 'boolean', def: 'true', note: 'The band is the seam between the old page and the new one. false swaps the page while the band is over the middle. Only with the band, and never under reduced motion.' },
        { prop: 'band', type: fx, def: 'true', note: `A band that sweeps through. false gives a full-screen wall that covers, then drains; a number from 0.2 to 1 sets the band's thickness as a share of the screen.` },
        { prop: 'bubbles', type: fx, def: 'true', note: 'See-through bubbles rising through the goo. false turns them off, and a number from 0 to 2 scales how many.' },
        { prop: 'bulge', type: fx, def: 'true', note: 'Mounds on the front. false gives a flat front, and a number from 0 to 2 scales them.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The mounds and bubbles wobble and drift as they move.' },
        { prop: 'lag', type: fx, def: 'true', note: 'The trailing edge stretches back as it moves.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'color, accent, highlight', type: 'string | false', def: 'CSS variables', note: 'Wall, lip and glow colours. See Colors.' },
        { prop: 'zIndex', type: 'number', def: '2147483000', note: `The overlay's z-index.` },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false: no overlay, links pass straight through, cover() and reveal() resolve at once.' },
      ],
    },
  },
})
