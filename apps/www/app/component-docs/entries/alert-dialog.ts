import { choice, effect, flag, num, preset, speed, strength } from '../controls'
import { dialogRows } from '../dialog-rows'
import { defineComponentDoc } from '../types'

const content = { part: 'content' } as const

// Defaults are the alert dialog's lighter ones (core ALERT_DIALOG_MOMENTUM / ALERT_DIALOG_SPLASH).
export default defineComponentDoc({
  slug: 'alert-dialog',
  title: 'Alert Dialog',
  category: 'Overlays',
  component: 'GoopAlertDialog',
  replay: { action: 'click', label: 'Open again' },
  code: `<GoopAlertDialog>
  <GoopAlertDialogTrigger as-child>
    <GoopButton variant="outline">Delete account</GoopButton>
  </GoopAlertDialogTrigger>
  <GoopAlertDialogContent{{content}}>
    <GoopAlertDialogHeader>
      <GoopAlertDialogTitle>Are you absolutely sure?</GoopAlertDialogTitle>
      <GoopAlertDialogDescription>This action cannot be undone.</GoopAlertDialogDescription>
    </GoopAlertDialogHeader>
    <GoopAlertDialogFooter>
      <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
      <GoopAlertDialogAction>Continue</GoopAlertDialogAction>
    </GoopAlertDialogFooter>
  </GoopAlertDialogContent>
</GoopAlertDialog>`,
  reactCode: `<GoopAlertDialog>
  <GoopAlertDialogTrigger asChild>
    <GoopButton variant="outline">Delete account</GoopButton>
  </GoopAlertDialogTrigger>
  <GoopAlertDialogContent{{content}}>
    <GoopAlertDialogHeader>
      <GoopAlertDialogTitle>Are you absolutely sure?</GoopAlertDialogTitle>
      <GoopAlertDialogDescription>This action cannot be undone.</GoopAlertDialogDescription>
    </GoopAlertDialogHeader>
    <GoopAlertDialogFooter>
      <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
      <GoopAlertDialogAction>Continue</GoopAlertDialogAction>
    </GoopAlertDialogFooter>
  </GoopAlertDialogContent>
</GoopAlertDialog>`,
  controls: [
    preset(content),
    speed(content),
    strength('openSlosh', { ...content, default: 0.6 }),
    strength('closeSlosh', { ...content, default: 0.7 }),
    num('openDripAmount', 0, 3, 0.05, 0.35, { ...content, unit: '×' }),
    choice('bloomStart', ['single', 'merge'], 'single', content),
    flag('overlay', content),
    num('openDripSize', 0.3, 2.5, 0.05, 0.75, { ...content, unit: '×', advanced: true }),
    num('openDripFling', 0, 3, 0.05, 0.6, { ...content, unit: '×', advanced: true }),
    effect('openDrips', { ...content, advanced: true }),
    effect('wobble', { ...content, type: 'boolean', advanced: true }),
    effect('fade', { ...content, type: 'boolean', advanced: true }),
  ],
  tables: { content: { caption: 'GoopAlertDialogContent goo props', rows: dialogRows(true) } },
  reactTables: {
    content: {
      caption: 'GoopAlertDialogContent props',
      rows: [
        { prop: 'size', type: `'default' | 'sm'`, def: `'default'`, note: "Same as shadcn/ui: 'sm' is narrower, with a two-column footer." },
        { prop: 'goopRef', type: 'Ref<EmergeHandle>', def: '', note: 'Receives the live engine handle (null before it mounts, or when goo is off). ref is the panel element.' },
        ...dialogRows(true),
      ],
    },
  },
})
