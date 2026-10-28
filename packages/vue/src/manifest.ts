// Component manifest. Plain data with no .vue imports, so build tools running in Node
// (the @goopui/nuxt module) can read it without a Vue compiler.

/** Every component's export name, e.g. `GoopButton`. Nuxt registers `${prefix}${base}`. */
export const goopComponents = [
  'GoopButton',
  'GoopSpinner',
  'GoopSwitch',
  'GoopCheckbox',
  'GoopRadioGroup',
  'GoopRadioGroupItem',
  'GoopPopover',
  'GoopPopoverAnchor',
  'GoopPopoverContent',
  'GoopPopoverDescription',
  'GoopPopoverHeader',
  'GoopPopoverTitle',
  'GoopPopoverTrigger',
  'GoopDropdownMenu',
  'GoopDropdownMenuCheckboxItem',
  'GoopDropdownMenuContent',
  'GoopDropdownMenuGroup',
  'GoopDropdownMenuItem',
  'GoopDropdownMenuLabel',
  'GoopDropdownMenuPortal',
  'GoopDropdownMenuRadioGroup',
  'GoopDropdownMenuRadioItem',
  'GoopDropdownMenuSeparator',
  'GoopDropdownMenuShortcut',
  'GoopDropdownMenuSub',
  'GoopDropdownMenuSubContent',
  'GoopDropdownMenuSubTrigger',
  'GoopDropdownMenuTrigger',
] as const

export type GoopComponentName = (typeof goopComponents)[number]

/** Export name without the `Goop` prefix (`GoopButton` -> `Button`). */
export const componentBaseName = (name: string): string => name.replace(/^Goop/, '')
