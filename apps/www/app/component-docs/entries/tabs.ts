import { choice, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'tabs',
  title: 'Tabs',
  category: 'Navigation',
  component: 'GoopTabs',
  code: `<GoopTabs default-value="account">
  <GoopTabsList{{list}}>
    <GoopTabsTrigger value="account">Account</GoopTabsTrigger>
    <GoopTabsTrigger value="password">Password</GoopTabsTrigger>
    <GoopTabsTrigger value="billing">Billing</GoopTabsTrigger>
  </GoopTabsList>
  <GoopTabsContent value="account">Make changes to your account here.</GoopTabsContent>
</GoopTabs>`,
  reactCode: `<GoopTabs defaultValue="account">
  <GoopTabsList{{list}}>
    <GoopTabsTrigger value="account">Account</GoopTabsTrigger>
    <GoopTabsTrigger value="password">Password</GoopTabsTrigger>
    <GoopTabsTrigger value="billing">Billing</GoopTabsTrigger>
  </GoopTabsList>
  <GoopTabsContent value="account">Make changes to your account here.</GoopTabsContent>
</GoopTabs>`,
  controls: [
    preset({ part: 'list' }),
    speed({ part: 'list' }),
    choice('variant', ['default', 'line'], 'default', { part: 'list' }),
    effect('indicator', { part: 'list', type: 'boolean' }),
    effect('wobble', { part: 'list', type: 'boolean' }),
    effect('momentum', { part: 'list', type: 'boolean' }),
  ],
  tables: {
    list: {
      caption: 'GoopTabsList props',
      rows: [
        { prop: 'variant', type: `'default' | 'line'`, def: `'default'`, note: `Same as shadcn. 'line' keeps shadcn's underline and has no goo.` },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn TabsList.' },
        { prop: 'indicator', type: 'boolean', def: 'true', note: `The active tab's background is a goo blob that slides between triggers. false gives shadcn's flat background.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot when the blob lands.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches and necks to a trailing tail while it travels.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})
