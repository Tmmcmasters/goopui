/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the bloom overlays (Popover, Tooltip, Hover Card, Alert Dialog, Sheet).
// Each mirrors its Vue twin in components/content/Demo*.vue set by set; keep them in sync.
import {
  GoopAlertDialog,
  GoopAlertDialogAction,
  GoopAlertDialogCancel,
  GoopAlertDialogContent,
  GoopAlertDialogDescription,
  GoopAlertDialogFooter,
  GoopAlertDialogHeader,
  GoopAlertDialogTitle,
  GoopAlertDialogTrigger,
  GoopButton,
  GoopHoverCard,
  GoopHoverCardContent,
  GoopHoverCardTrigger,
  GoopPopover,
  GoopPopoverContent,
  GoopPopoverDescription,
  GoopPopoverHeader,
  GoopPopoverTitle,
  GoopPopoverTrigger,
  GoopSheet,
  GoopSheetClose,
  GoopSheetContent,
  GoopSheetDescription,
  GoopSheetFooter,
  GoopSheetHeader,
  GoopSheetTitle,
  GoopSheetTrigger,
  GoopTooltip,
  GoopTooltipContent,
  GoopTooltipProvider,
  GoopTooltipTrigger,
} from '@goopui/react'

type Pg = Record<string, Record<string, unknown>>
const SIDES = ['top', 'right', 'bottom', 'left'] as const

// ---- Popover ----------------------------------------------------------------------------------

export function PopoverDemo({ set, pg }: { set: string; pg: Pg }) {
  const one = (key: string, label: string, variant: 'outline' | 'default' | 'secondary', content: Record<string, unknown>, title: string, text: string, size?: 'sm') => (
    <GoopPopover key={key}>
      <GoopPopoverTrigger asChild>
        <GoopButton variant={variant} size={size}>
          {label}
        </GoopButton>
      </GoopPopoverTrigger>
      <GoopPopoverContent className="w-56" {...content}>
        <GoopPopoverHeader>
          <GoopPopoverTitle>{title}</GoopPopoverTitle>
          <GoopPopoverDescription>{text}</GoopPopoverDescription>
        </GoopPopoverHeader>
      </GoopPopoverContent>
    </GoopPopover>
  )
  switch (set) {
    case 'sides':
      return <>{SIDES.map((side) => one(side, side, 'outline', { side }, `Side: ${side}`, 'The bridge follows this edge.', 'sm'))}</>
    case 'surface':
      return (
        <>
          {one('trigger', 'trigger (default)', 'default', { surface: 'trigger' }, 'surface', 'trigger')}
          {one('popover', 'popover', 'outline', { surface: 'popover' }, 'surface', 'popover')}
          {one('css', 'a CSS color', 'default', { surface: 'oklch(0.62 0.19 150)' }, 'surface', 'oklch(0.62 0.19 150)')}
        </>
      )
    case 'burst':
      return (
        <>
          {one('default', 'Default burst', 'secondary', {}, 'Default', 'Drops fling off the far edge.')}
          {one('big', 'Big and far', 'secondary', { openDripAmount: 2, openDripSize: 1.6, openDripFling: 2, openDripVariety: 1 }, 'Big and far', 'More, larger drops, flung further.')}
          {one('none', 'No burst', 'secondary', { openDrips: false }, 'No burst', 'Slosh only, nothing flies off.')}
        </>
      )
    default:
      return (
        <GoopPopover>
          <GoopPopoverTrigger asChild>
            <GoopButton variant="outline">Open popover</GoopButton>
          </GoopPopoverTrigger>
          <GoopPopoverContent {...pg.content}>
            <GoopPopoverHeader>
              <GoopPopoverTitle>Dimensions</GoopPopoverTitle>
              <GoopPopoverDescription>Set the dimensions for the layer.</GoopPopoverDescription>
            </GoopPopoverHeader>
          </GoopPopoverContent>
        </GoopPopover>
      )
  }
}

// ---- Tooltip ----------------------------------------------------------------------------------

export function TooltipDemo({ set, pg }: { set: string; pg: Pg }) {
  const one = (key: string, label: string, variant: 'outline' | 'default' | 'secondary', content: Record<string, unknown>, text: string, size?: 'sm') => (
    <GoopTooltip key={key}>
      <GoopTooltipTrigger asChild>
        <GoopButton variant={variant} size={size}>
          {label}
        </GoopButton>
      </GoopTooltipTrigger>
      <GoopTooltipContent {...content}>{text}</GoopTooltipContent>
    </GoopTooltip>
  )
  const body = (() => {
    switch (set) {
      case 'sides':
        return SIDES.map((side) => one(side, side, 'outline', { side }, `Tooltip on the ${side}`, 'sm'))
      case 'surface':
        return [
          one('trigger', 'Trigger color', 'default', { surface: 'trigger' }, "Takes the trigger's color"),
          one('css', 'CSS color', 'outline', { surface: 'oklch(0.62 0.19 150)' }, 'Any CSS color'),
          one('splash', 'Bigger splash', 'secondary', { openDrips: 1.5 }, 'A bigger splash'),
        ]
      default:
        return one('basic', 'Hover me', 'outline', pg.content ?? {}, 'Add to library')
    }
  })()
  return <GoopTooltipProvider>{body}</GoopTooltipProvider>
}

// ---- Hover Card -------------------------------------------------------------------------------

export function HoverCardDemo({ set, pg }: { set: string; pg: Pg }) {
  return (
    <div className="flex flex-wrap items-start justify-center gap-10 pb-40">
      {set === 'from' ? (
        (['trigger', 'center'] as const).map((from) => (
          <GoopHoverCard key={from} openDelay={200}>
            <GoopHoverCardTrigger href="#" className="text-sm font-medium underline underline-offset-4" onClick={(e) => e.preventDefault()}>
              bloomFrom="{from}"
            </GoopHoverCardTrigger>
            <GoopHoverCardContent bloomFrom={from} className="w-56">
              <p className="text-sm">This card blooms from {from === 'trigger' ? 'the edge facing its link' : 'its own center'}.</p>
            </GoopHoverCardContent>
          </GoopHoverCard>
        ))
      ) : (
        <GoopHoverCard openDelay={200}>
          <GoopHoverCardTrigger href="https://nextjs.org" target="_blank" rel="noreferrer" className="text-sm font-medium underline underline-offset-4">
            @nextjs
          </GoopHoverCardTrigger>
          <GoopHoverCardContent {...pg.content}>
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">N</div>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">@nextjs</p>
                <p className="text-sm">The React Framework, created and maintained by @vercel.</p>
                <span className="text-xs text-muted-foreground">Joined December 2021</span>
              </div>
            </div>
          </GoopHoverCardContent>
        </GoopHoverCard>
      )}
    </div>
  )
}

// ---- Alert Dialog -----------------------------------------------------------------------------

export function AlertDialogDemo({ set, pg }: { set: string; pg: Pg }) {
  const one = (key: string, label: string, variant: 'outline' | 'secondary', content: Record<string, unknown>, title: string, text: string, action: string) => (
    <GoopAlertDialog key={key}>
      <GoopAlertDialogTrigger asChild>
        <GoopButton variant={variant}>{label}</GoopButton>
      </GoopAlertDialogTrigger>
      <GoopAlertDialogContent {...content}>
        <GoopAlertDialogHeader>
          <GoopAlertDialogTitle>{title}</GoopAlertDialogTitle>
          <GoopAlertDialogDescription>{text}</GoopAlertDialogDescription>
        </GoopAlertDialogHeader>
        <GoopAlertDialogFooter>
          <GoopAlertDialogCancel>Cancel</GoopAlertDialogCancel>
          <GoopAlertDialogAction>{action}</GoopAlertDialogAction>
        </GoopAlertDialogFooter>
      </GoopAlertDialogContent>
    </GoopAlertDialog>
  )
  if (set === 'louder')
    return (
      <>
        {one('light', 'Default (light)', 'secondary', {}, 'Discard draft?', 'A light slosh and a few small drops.', 'Discard')}
        {one(
          'full',
          'Full splash + overlay',
          'secondary',
          { openSlosh: 1, closeSlosh: 1, openDripAmount: 1, openDripSize: 1, openDripFling: 1, overlay: true },
          'Discard draft?',
          "The dialog's full slosh and splash, over a goo overlay.",
          'Discard',
        )}
      </>
    )
  return one(
    'basic',
    'Delete account',
    'outline',
    pg.content ?? {},
    'Are you absolutely sure?',
    'This action cannot be undone. This will permanently delete your account and remove your data from our servers.',
    'Continue',
  )
}

// ---- Sheet ------------------------------------------------------------------------------------

export function SheetDemo({ set, pg }: { set: string; pg: Pg }) {
  const one = (key: string, label: string, variant: 'outline' | 'secondary', content: Record<string, unknown>, title: string, text: string, size?: 'sm') => (
    <GoopSheet key={key}>
      <GoopSheetTrigger asChild>
        <GoopButton variant={variant} size={size}>
          {label}
        </GoopButton>
      </GoopSheetTrigger>
      <GoopSheetContent {...content}>
        <GoopSheetHeader>
          <GoopSheetTitle>{title}</GoopSheetTitle>
          <GoopSheetDescription>{text}</GoopSheetDescription>
        </GoopSheetHeader>
      </GoopSheetContent>
    </GoopSheet>
  )
  switch (set) {
    case 'sides':
      return <>{SIDES.map((side) => one(side, side, 'outline', { side }, `Side: ${side}`, 'The goo pools at the middle of this edge and spreads to fill the sheet.', 'sm'))}</>
    case 'splash':
      return (
        <>
          {one('default', 'Default splash', 'secondary', {}, 'Default', 'Drops fling off the inner edge and sides.')}
          {one('merge', 'Merge, big splash', 'secondary', { bloomStart: 'merge', openDripAmount: 2, openDripSize: 1.6, openDripFling: 2 }, 'Merge, big splash', 'A few drops fuse at the edge, then more, larger drops fly further.')}
          {one('none', 'No splash', 'secondary', { openDrips: false }, 'No splash', 'The bloom and the wobble only.')}
        </>
      )
    default:
      return (
        <GoopSheet>
          <GoopSheetTrigger asChild>
            <GoopButton variant="outline">Open sheet</GoopButton>
          </GoopSheetTrigger>
          <GoopSheetContent {...pg.content}>
            <GoopSheetHeader>
              <GoopSheetTitle>Edit profile</GoopSheetTitle>
              <GoopSheetDescription>Make changes to your profile here. Click save when you're done.</GoopSheetDescription>
            </GoopSheetHeader>
            <div className="grid gap-3 px-4 text-sm">
              <p className="text-muted-foreground">The panel blooms in from its edge and splashes off its inner edge.</p>
            </div>
            <GoopSheetFooter>
              <GoopSheetClose asChild>
                <GoopButton>Save changes</GoopButton>
              </GoopSheetClose>
            </GoopSheetFooter>
          </GoopSheetContent>
        </GoopSheet>
      )
  }
}
