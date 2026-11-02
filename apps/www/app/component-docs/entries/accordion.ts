import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'accordion',
  title: 'Accordion',
  category: 'Layout',
  component: 'GoopAccordion',
  code: `<GoopAccordion type="single" collapsible default-value="what"{{main}}>
  <GoopAccordionItem value="what">
    <GoopAccordionTrigger>What is goopUI?</GoopAccordionTrigger>
    <GoopAccordionContent>shadcn-vue components with gooey, dripping motion.</GoopAccordionContent>
  </GoopAccordionItem>
  <GoopAccordionItem value="motion">
    <GoopAccordionTrigger>Does it respect reduced motion?</GoopAccordionTrigger>
    <GoopAccordionContent>Yes. The open row becomes a still fill.</GoopAccordionContent>
  </GoopAccordionItem>
</GoopAccordion>`,
  controls: [
    preset(),
    speed(),
    strength('flood'),
    strength('droplets'),
    effect('wobble'),
    effect('jelly'),
    effect('goo', { type: 'boolean', label: 'Goo', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopAccordion and GoopCollapsible goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Accordion / Collapsible.' },
        { prop: 'flood', type: fx, def: 'true', note: 'The trigger row floods with goo from the click point on open and drains back into it on close. Off, the fill snaps.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The crest of the flood front, and a jelly wobble of the row once it is full.' },
        { prop: 'droplets', type: fx, def: 'true', note: `A few droplets splash off the row's top edge as it floods.` },
        { prop: 'jelly', type: fx, def: 'true', note: 'The content opens on a jelly spring: overshoot, then settle.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})
