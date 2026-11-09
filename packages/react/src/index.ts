// @goopui/react: shadcn/ui-style React components (Radix UI) with the goopUI engine attached.
// Import the styles once: `@import "@goopui/react/goop.css";` in your Tailwind entry CSS.
//
// Every component module starts with 'use client' (Next.js App Router: they server-render
// shadcn's markup, and the goo attaches after hydration). This barrel has no directive, so the
// server-safe exports (variants, prop helpers, manifest) stay usable from Server Components.

export * from './components/button'
export * from './components/switch'
export * from './components/checkbox'
export * from './components/tabs'
export * from './components/dialog'
export * from './components/skeleton'
export * from './components/badge'
export * from './components/card'
export * from './components/avatar'
export * from './components/separator'
export * from './components/label'
export * from './components/spinner'
export * from './components/dropdown-menu'
export * from './components/context-menu'
export * from './components/menubar'
export * from './components/navigation-menu'
export { GoopConfigContext, GoopProvider, useGoopConfig, type GoopConfig, type GoopProviderProps } from './config'
export { GoopCueClaim, GoopSoundContext, GoopSoundScope, useGoopCue, useGoopSound } from './sound'
export {
  AVATAR_PROP_KEYS,
  BADGE_PROP_KEYS,
  CARD_PROP_KEYS,
  CHECKBOX_PROP_KEYS,
  CSS_VAR_KEYS,
  DIALOG_PROP_KEYS,
  EMERGE_DRIP_KEYS,
  ENGINE_OPTION_KEYS,
  FEATURE_KEYS,
  GOOP_PROP_KEYS,
  GOOP_TUNING_KEYS,
  SKELETON_PROP_KEYS,
  SKELETON_REVEAL_PROP_KEYS,
  SPINNER_PROP_KEYS,
  SWITCH_PROP_KEYS,
  TABS_PROP_KEYS,
  diffOptions,
  goopPropMeta,
  isGoopFeature,
  sameValue,
  splitProps,
  toAvatarOptions,
  toBackdropOptions,
  toBadgeOptions,
  toCardOptions,
  toCheckboxOptions,
  toDialogOptions,
  toGoopOptions,
  toGoopStyle,
  toSkeletonOptions,
  toSkeletonRevealOptions,
  toSpinnerOptions,
  toSwitchOptions,
  toTabsOptions,
  type GoopAvatarEngineProps,
  type GoopBadgeEngineProps,
  type GoopCardEngineProps,
  type GoopCheckboxEngineKey,
  type GoopCheckboxEngineProps,
  type GoopCssVarKey,
  type GoopDialogKind,
  type GoopDialogProps,
  type GoopEffectProps,
  type GoopEngineKey,
  type GoopEngineProps,
  type GoopFeatureKey,
  type GoopPropValue,
  type GoopSkeletonEngineProps,
  type GoopSkeletonRevealEngineProps,
  type GoopSpinnerEngineProps,
  type GoopStaticEffectProps,
  type GoopSoundProps,
  type GoopSwitchEngineKey,
  type GoopSwitchEngineProps,
  type GoopTabsProps,
} from './goop-props'
export {
  CONTEXT_MENU_PROP_KEYS,
  EMERGE_EFFECT_KEYS,
  MENU_PROP_KEYS,
  MENUBAR_MENU_PROP_KEYS,
  MENUBAR_PROP_KEYS,
  NAVIGATION_MENU_PROP_KEYS,
  resolveContextMenuProps,
  resolveMenubarMenuProps,
  resolveMenuProps,
  toContextMenuOptions,
  toMenubarMenuOptions,
  toMenubarOptions,
  toMenuOptions,
  toNavigationMenuOptions,
  type GoopContextMenuProps,
  type GoopMenubarMenuEngineProps,
  type GoopMenubarProps,
  type GoopMenuProps,
  type GoopNavigationMenuProps,
  type ResolvedContextMenuProps,
  type ResolvedMenuProps,
  type ResolvedNavigationMenuGoo,
} from './goop-props'
export { goopComponents, type GoopComponentName } from './manifest'
export { seedFrom, useAttached, useGoop, type UseGoopReturn } from './use-goop'
export { cn } from 'cn'
// Engine types used in props and refs.
export type { NavigationMenuViewportHandle } from '@goopui/core'
export type { BackdropHandle, CardHandle, CheckboxHandle, CheckboxState, EmergeHandle, GoopHandle, GoopOptions, GoopPreset, MenuHighlightHandle, SkeletonRevealHandle, SpinnerHandle, SpinnerVariant, SwitchHandle } from '@goopui/core'
// Select.
export * from './components/select'
export { SELECT_PROP_KEYS, toSelectOptions, type GoopSelectProps } from './goop-props'
export type { SelectBloomFrom, SelectPlopOptions } from '@goopui/core'
export * from './components/drawer'
export { DRAWER_PROP_KEYS, toDrawerOptions, type GoopDrawerProps } from './goop-props'
export type { DrawerController, DrawerDirection, DrawerSnapPoint } from '@goopui/core'
// Forms batch: Input, Textarea, RadioGroup, Slider, Progress, Toggle, ToggleGroup.
export * from './components/input'
export * from './components/textarea'
export * from './components/radio-group'
export * from './components/slider'
export * from './components/progress'
export * from './components/toggle'
export * from './components/toggle-group'
export {
  INPUT_PROP_KEYS,
  PROGRESS_PROP_KEYS,
  RADIO_PROP_KEYS,
  SLIDER_PROP_KEYS,
  TOGGLE_GROUP_PROP_KEYS,
  TOGGLE_PROP_KEYS,
  toInputOptions,
  toProgressOptions,
  toRadioOptions,
  toSliderOptions,
  toToggleGroupOptions,
  toToggleOptions,
  type GoopInputEngineProps,
  type GoopProgressEngineProps,
  type GoopRadioEngineProps,
  type GoopSliderEngineProps,
  type GoopToggleEngineProps,
  type GoopToggleGroupEngineProps,
} from './goop-props'
export type { InputHandle, ProgressHandle, RadioGroupHandle, SliderHandle, ToggleHandle } from '@goopui/core'
// Bloom overlays: Popover, Tooltip, HoverCard, AlertDialog, Sheet.
export * from './components/popover'
export * from './components/tooltip'
export * from './components/hover-card'
export * from './components/alert-dialog'
export * from './components/sheet'
export {
  HOVER_CARD_PROP_KEYS,
  POPOVER_PROP_KEYS,
  SHEET_PROP_KEYS,
  TOOLTIP_PROP_KEYS,
  toHoverCardOptions,
  toPopoverOptions,
  toSheetOptions,
  toTooltipOptions,
  type GoopHoverCardProps,
  type GoopPopoverProps,
  type GoopSheetProps,
  type GoopTooltipProps,
} from './goop-props'
export type { HoverCardBloomFrom, SheetHandle, SheetOptions } from '@goopui/core'
// Simple batch: Alert, Kbd, Breadcrumb, Empty, ButtonGroup, Pagination, Accordion, Collapsible.
export * from './components/alert'
export * from './components/kbd'
export * from './components/breadcrumb'
export * from './components/empty'
export * from './components/button-group'
export * from './components/pagination'
export * from './components/accordion'
export * from './components/collapsible'
export {
  ACCORDION_PROP_KEYS,
  ALERT_PROP_KEYS,
  BREADCRUMB_PROP_KEYS,
  BUTTON_GROUP_PROP_KEYS,
  EMPTY_PROP_KEYS,
  KBD_PROP_KEYS,
  PAGINATION_BUTTON_PROP_KEYS,
  PAGINATION_PROP_KEYS,
  resolveBreadcrumbProps,
  resolveEmptyProps,
  resolvePaginationProps,
  toAccordionOptions,
  toAlertOptions,
  toBreadcrumbOptions,
  toButtonGroupOptions,
  toEmptyOptions,
  toKbdOptions,
  toPaginationButtonProps,
  toPaginationOptions,
  type GoopAccordionProps,
  type GoopAlertEngineProps,
  type GoopBreadcrumbProps,
  type GoopButtonGroupEngineProps,
  type GoopEmptyProps,
  type GoopKbdEngineProps,
  type GoopPaginationButtonProps,
  type GoopPaginationProps,
} from './goop-props'
export type { AccordionHandle, AlertHandle, ButtonGroupHandle, EmptyPuddleHandle, KbdHandle } from '@goopui/core'
// Bespoke batch 1: Toaster (sonner), Command (cmdk), Combobox (cmdk + Popover), NumberField, InputOTP (input-otp).
export * from './components/sonner'
export * from './components/command'
export * from './components/combobox'
export * from './components/number-field'
export * from './components/input-otp'
export {
  COMBOBOX_PROP_KEYS,
  COMMAND_DIALOG_PROP_KEYS,
  COMMAND_INPUT_PROP_KEYS,
  COMMAND_PROP_KEYS,
  INPUT_OTP_PROP_KEYS,
  NUMBER_FIELD_PROP_KEYS,
  TOASTER_PROP_KEYS,
  resolveComboboxProps,
  resolveCommandProps,
  toComboboxOptions,
  toCommandInputOptions,
  toCommandOptions,
  toInputOTPOptions,
  toNumberFieldOptions,
  toToasterOptions,
  type GoopComboboxProps,
  type GoopCommandDialogProps,
  type GoopCommandInputEngineProps,
  type GoopCommandProps,
  type GoopInputOTPEngineProps,
  type GoopNumberFieldEngineProps,
  type GoopToasterProps,
  type ResolvedComboboxProps,
  type ResolvedCommandProps,
} from './goop-props'
export type { InputOTPHandle, NumberFieldHandle, ToasterHandle } from '@goopui/core'
// Sidebar, Carousel, PageTransition.
export * from './components/sidebar'
export { SIDEBAR_PROP_KEYS, toSidebarOptions, type GoopSidebarProps, type ResolvedSidebarGoo } from './goop-props'
export type { SidebarEdgeHandle, SidebarSide } from '@goopui/core'
export * from './components/carousel'
export { CAROUSEL_PROP_KEYS, toCarouselOptions, type GoopCarouselProps, type ResolvedCarouselGoo } from './goop-props'
export type { CarouselHandle } from '@goopui/core'
export * from './components/page-transition'
export { PAGE_TRANSITION_PROP_KEYS, toPageTransitionOptions, type GoopPageTransitionProps } from './goop-props'
export type { PageTransitionDirection, PageTransitionHandle } from '@goopui/core'
// Tags Input (goopUI's own: shadcn/ui has none) and Field.
export * from './components/tags-input'
export { TAGS_INPUT_PROP_KEYS, toTagsInputOptions, type GoopTagsInputEngineProps } from './goop-props'
export type { TagsInputHandle } from '@goopui/core'
export * from './components/field'
export { FIELD_PROP_KEYS, resolveFieldProps, toFieldErrorOptions, type GoopFieldProps } from './goop-props'
export type { FieldErrorHandle } from '@goopui/core'
// Table, Item, Input Group.
export * from './components/table'
export { TABLE_PROP_KEYS, toTableOptions, type GoopTableProps } from './goop-props'
export type { TableHighlightHandle } from '@goopui/core'
export * from './components/item'
export {
  ITEM_GROUP_PROP_KEYS,
  ITEM_PROP_KEYS,
  resolveItemProps,
  toItemGroupOptions,
  toItemPressOptions,
  type GoopItemGroupProps,
  type GoopItemProps,
} from './goop-props'
export type { ItemPressHandle } from '@goopui/core'
export * from './components/input-group'
export { INPUT_GROUP_PROP_KEYS, toInputGroupOptions, type GoopInputGroupProps } from './goop-props'
