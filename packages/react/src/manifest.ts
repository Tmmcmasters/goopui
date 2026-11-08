// Component manifest: every component's export name, e.g. `GoopButton`. Plain data with no
// React imports, so build tools and docs sites can read it in Node. The docs site uses it to
// tell which components already have a React version.
export const goopComponents = [
  'GoopButton',
  'GoopSwitch',
  'GoopCheckbox',
  'GoopTabs',
  'GoopTabsContent',
  'GoopTabsList',
  'GoopTabsTrigger',
  'GoopDialog',
  'GoopDialogClose',
  'GoopDialogContent',
  'GoopDialogDescription',
  'GoopDialogFooter',
  'GoopDialogHeader',
  'GoopDialogOverlay',
  'GoopDialogPortal',
  'GoopDialogTitle',
  'GoopDialogTrigger',
] as const

export type GoopComponentName = (typeof goopComponents)[number]
