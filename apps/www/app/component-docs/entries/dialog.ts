import { choice, effect, flag, num, preset, speed, strength } from '../controls'
import { dialogRows } from '../dialog-rows'
import { defineComponentDoc } from '../types'

const content = { part: 'content' } as const

export default defineComponentDoc({
  slug: 'dialog',
  title: 'Dialog',
  category: 'Overlays',
  component: 'GoopDialog',
  replay: { action: 'click', label: 'Open again' },
  code: `<GoopDialog>
  <GoopDialogTrigger as-child>
    <GoopButton variant="outline">Edit profile</GoopButton>
  </GoopDialogTrigger>
  <GoopDialogContent class="sm:max-w-md"{{content}}>
    <GoopDialogHeader>
      <GoopDialogTitle>Edit profile</GoopDialogTitle>
      <GoopDialogDescription>Make changes to your profile here.</GoopDialogDescription>
    </GoopDialogHeader>
    <GoopDialogFooter>
      <GoopDialogClose as-child>
        <GoopButton>Save changes</GoopButton>
      </GoopDialogClose>
    </GoopDialogFooter>
  </GoopDialogContent>
</GoopDialog>`,
  reactCode: `<GoopDialog>
  <GoopDialogTrigger asChild>
    <GoopButton variant="outline">Edit profile</GoopButton>
  </GoopDialogTrigger>
  <GoopDialogContent className="sm:max-w-md"{{content}}>
    <GoopDialogHeader>
      <GoopDialogTitle>Edit profile</GoopDialogTitle>
      <GoopDialogDescription>Make changes to your profile here.</GoopDialogDescription>
    </GoopDialogHeader>
    <GoopDialogFooter>
      <GoopDialogClose asChild>
        <GoopButton>Save changes</GoopButton>
      </GoopDialogClose>
    </GoopDialogFooter>
  </GoopDialogContent>
</GoopDialog>`,
  controls: [
    preset(content),
    speed(content),
    strength('openSlosh', content),
    strength('openDrips', content),
    strength('closeSlosh', content),
    choice('bloomStart', ['single', 'merge'], 'single', content),
    flag('overlay', content),
    num('openDripAmount', 0, 3, 0.05, 1, { ...content, unit: '×', advanced: true }),
    num('openDripSize', 0.3, 2.5, 0.05, 1, { ...content, unit: '×', advanced: true }),
    num('openDripFling', 0, 3, 0.05, 1, { ...content, unit: '×', advanced: true }),
    num('sloshVariety', 0, 1, 0.05, 1, { ...content, advanced: true }),
    effect('wobble', { ...content, type: 'boolean', advanced: true }),
    effect('fade', { ...content, type: 'boolean', advanced: true }),
  ],
  tables: { content: { caption: 'GoopDialogContent goo props', rows: dialogRows(false) } },
})
