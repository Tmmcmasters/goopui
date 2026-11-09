/** @jsxRuntime automatic */
/** @jsxImportSource react */
// The React docs' live previews: real @goopui/react components, mounted by
// components/ReactIsland.vue with react-dom's createRoot (client only). Each demo mirrors its
// Vue twin in components/content/Demo*.vue set by set, so the two pages compare 1:1; keep them
// (and the code samples in the markdown) in sync.
import {
  GoopButton,
  GoopCheckbox,
  GoopDialog,
  GoopDialogClose,
  GoopDialogContent,
  GoopDialogDescription,
  GoopDialogFooter,
  GoopDialogHeader,
  GoopDialogTitle,
  GoopDialogTrigger,
  GoopProvider,
  GoopSwitch,
  GoopTabs,
  GoopTabsContent,
  GoopTabsList,
  GoopTabsTrigger,
  type GoopButtonApi,
} from '@goopui/react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import type { CheckboxState } from '@goopui/core'
import { SkeletonRevealDemo, SpinnerDemo, StaticSet, Tile } from './batch1'
import { BESPOKE_TILES, BespokeTile, CommandDemo, InputOTPDemo, NumberFieldDemo, ToasterDemo } from './bespoke1'

/** What a Vue demo hands its island. */
export interface ReactDemoProps {
  /** Which demo: 'button' | 'switch' | 'checkbox' | 'tabs' | 'dialog' | 'static-set' |
   *  'skeleton-reveal' | 'spinner' | 'tile' (an index tile; `set` is the slug). */
  demo: string
  /** The demo's set (as on the Vue side). */
  set: string
  /** The playground's Customize choices per part ('main', 'list', 'content'). */
  pg: Record<string, Record<string, unknown>>
  /** The Preview frame's stage (Drip / Slow-mo / Let it fly) for buttons. */
  stage?: { props: { timeScale: number; splash: 'escape' | undefined }; register: (b: GoopButtonApi | null) => void }
  /** Docs link in the current framework (`/docs/x` -> `/react/docs/x`). */
  to: (path: string) => string
  /** Client-side navigation (Nuxt's router). */
  navigate: (path: string) => void
}

export function ReactDemo(props: ReactDemoProps) {
  const body = (() => {
    switch (props.demo) {
      case 'button':
        return <Buttons {...props} />
      case 'switch':
        return <Switches {...props} />
      case 'checkbox':
        return <Checkboxes {...props} />
      case 'tabs':
        return <TabsDemo {...props} />
      case 'dialog':
        return <DialogDemo {...props} />
      case 'static-set':
        return <StaticSet set={props.set} pg={props.pg} />
      case 'skeleton-reveal':
        return <SkeletonRevealDemo pg={props.pg} />
      case 'spinner':
        return <SpinnerDemo set={props.set} pg={props.pg} />
      case 'tile':
        return BESPOKE_TILES.has(props.set) ? <BespokeTile slug={props.set} /> : <Tile slug={props.set} />
      case 'toaster':
        return <ToasterDemo pg={props.pg} />
      case 'command':
        return <CommandDemo set={props.set} pg={props.pg} />
      case 'number-field':
        return <NumberFieldDemo set={props.set} pg={props.pg} />
      case 'input-otp':
        return <InputOTPDemo set={props.set} pg={props.pg} />
      default:
        return null
    }
  })()
  // The site turns interaction sounds on for every goop component (nuxt.config `goop.sound`).
  return <GoopProvider sound>{body}</GoopProvider>
}

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

// ---- Button -----------------------------------------------------------------------------------

function Buttons({ set, pg, stage, to, navigate }: ReactDemoProps) {
  const s = { ...(stage?.props ?? {}), goopRef: stage?.register }
  const link = (path: string, label: string, variant?: 'outline') => {
    const href = to(path)
    const go = (e: MouseEvent) => {
      e.preventDefault()
      navigate(href)
    }
    return (
      <GoopButton {...s} asChild variant={variant}>
        <a href={href} onClick={go}>
          {label}
        </a>
      </GoopButton>
    )
  }
  switch (set) {
    case 'playground':
      return (
        <GoopButton {...s} {...pg.main} size="lg">
          Save changes
        </GoopButton>
      )
    case 'variants':
      return (
        <>
          <GoopButton {...s}>Default</GoopButton>
          <GoopButton {...s} variant="secondary">Secondary</GoopButton>
          <GoopButton {...s} variant="destructive">Destructive</GoopButton>
          <GoopButton {...s} variant="outline">Outline</GoopButton>
          <GoopButton {...s} variant="ghost">Ghost</GoopButton>
          <GoopButton {...s} variant="link">Link</GoopButton>
        </>
      )
    case 'sizes':
      return (
        <>
          <GoopButton {...s} size="xs">Extra small</GoopButton>
          <GoopButton {...s} size="sm">Small</GoopButton>
          <GoopButton {...s}>Default</GoopButton>
          <GoopButton {...s} size="lg">Large</GoopButton>
          <GoopButton {...s} size="icon" aria-label="Next">
            <ArrowRight />
          </GoopButton>
          <GoopButton {...s} className="rounded-full">Pill</GoopButton>
        </>
      )
    case 'resting':
      return (
        <>
          <GoopButton {...s} restingDrips={1}>One drip</GoopButton>
          <GoopButton {...s} variant="destructive" restingDrips={2}>Two drips</GoopButton>
          <GoopButton {...s} className="rounded-full" restingDrips={[0.2, 0.32, 0.8]} dripLength={20}>
            Placed: 0.2, 0.32, 0.8
          </GoopButton>
        </>
      )
    case 'oil':
      return (
        <>
          <GoopButton {...s} size="lg" finish="oil" className="bg-oil text-oil-foreground [--goop-color:var(--oil)]">
            Crude oil
          </GoopButton>
          <GoopButton {...s} size="lg" variant="destructive" finish="oil">Oil on red</GoopButton>
          <GoopButton {...s} size="lg" variant="secondary" finish="oil">Oil on light</GoopButton>
        </>
      )
    case 'features':
      return (
        <>
          <GoopButton {...s} shockwave={false} taffy>Taffy, no shockwave</GoopButton>
          <GoopButton {...s} gloss reach>Gloss and reach</GoopButton>
          <GoopButton {...s} preset="wild" variant="secondary">Wild</GoopButton>
          <GoopButton {...s} preset="subtle" variant="outline">Subtle</GoopButton>
        </>
      )
    case 'link':
      return (
        <>
          {link('/docs/getting-started/installation', 'Installation guide')}
          {link('/docs/getting-started/theming', 'Theming', 'outline')}
        </>
      )
    default:
      return (
        <>
          <GoopButton {...s} disabled>Disabled</GoopButton>
          <GoopButton {...s} drips={false}>No drips, squish only</GoopButton>
          <GoopButton {...s} goo={false} variant="outline">Plain shadcn (goo off)</GoopButton>
        </>
      )
  }
}

// ---- Switch / Checkbox ------------------------------------------------------------------------

const Row = ({ children }: { children: ReactNode }) => <label className="flex items-center gap-2 text-sm">{children}</label>

function Switches({ set, pg }: ReactDemoProps) {
  const [airplane, setAirplane] = useState(true)
  const [wifi, setWifi] = useState(false)
  switch (set) {
    case 'sizes':
      return (
        <>
          <Row><GoopSwitch size="sm" defaultChecked /> Small</Row>
          <Row><GoopSwitch defaultChecked /> Default</Row>
        </>
      )
    case 'features':
      return (
        <>
          <Row><GoopSwitch defaultChecked splat={false} droplets={false} /> No splat, no droplets</Row>
          <Row><GoopSwitch fill={false} defaultChecked /> No fill</Row>
          <Row><GoopSwitch preset="wild" /> Wild</Row>
          <Row><GoopSwitch preset="subtle" /> Subtle</Row>
          <Row><GoopSwitch speed={0.5} /> Half speed</Row>
        </>
      )
    case 'states':
      return (
        <>
          <Row><GoopSwitch disabled /> Disabled</Row>
          <Row><GoopSwitch disabled defaultChecked /> Disabled, on</Row>
          <Row><GoopSwitch goo={false} /> Plain shadcn (goo off)</Row>
        </>
      )
    default:
      return (
        <>
          <Row><GoopSwitch checked={airplane} onCheckedChange={setAirplane} {...pg.main} /> Airplane mode</Row>
          <Row><GoopSwitch checked={wifi} onCheckedChange={setWifi} {...pg.main} /> Wi-Fi</Row>
        </>
      )
  }
}

function Checkboxes({ set, pg }: ReactDemoProps) {
  const [terms, setTerms] = useState<CheckboxState>(false)
  const [marketing, setMarketing] = useState<CheckboxState>(true)
  const [all, setAll] = useState<CheckboxState>('indeterminate')
  switch (set) {
    case 'indeterminate':
      return <Row><GoopCheckbox checked={all} onCheckedChange={setAll} /> Select all ({String(all)})</Row>
    case 'features':
      return (
        <>
          <Row><GoopCheckbox splat={false} /> No splat</Row>
          <Row><GoopCheckbox droplets={false} /> No droplets</Row>
          <Row><GoopCheckbox preset="wild" /> Wild</Row>
          <Row><GoopCheckbox speed={0.5} /> Half speed</Row>
        </>
      )
    case 'states':
      return (
        <>
          <Row><GoopCheckbox disabled /> Disabled</Row>
          <Row><GoopCheckbox disabled defaultChecked /> Disabled, checked</Row>
          <Row><GoopCheckbox goo={false} /> Plain shadcn (goo off)</Row>
        </>
      )
    default:
      return (
        <>
          <Row><GoopCheckbox checked={terms} onCheckedChange={setTerms} {...pg.main} /> Accept terms and conditions</Row>
          <Row><GoopCheckbox checked={marketing} onCheckedChange={setMarketing} {...pg.main} /> Send me product news</Row>
        </>
      )
  }
}

// ---- Tabs -------------------------------------------------------------------------------------

const TABS = [
  { value: 'account', label: 'Account', text: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', text: 'Change your password here.' },
  { value: 'billing', label: 'Billing', text: 'Manage your plan and invoices.' },
] as const

const triggers = TABS.map((t) => (
  <GoopTabsTrigger key={t.value} value={t.value}>
    {t.label}
  </GoopTabsTrigger>
))

function TabsDemo({ set, pg }: ReactDemoProps) {
  switch (set) {
    case 'vertical':
      return (
        <GoopTabs defaultValue="account" orientation="vertical">
          <GoopTabsList className="h-fit flex-col">{triggers}</GoopTabsList>
        </GoopTabs>
      )
    case 'line':
      return (
        <GoopTabs defaultValue="account">
          <GoopTabsList variant="line">{triggers}</GoopTabsList>
        </GoopTabs>
      )
    case 'plain':
      return (
        <>
          <GoopTabs defaultValue="account">
            <GoopTabsList preset="wild">{triggers}</GoopTabsList>
          </GoopTabs>
          <GoopTabs defaultValue="account">
            <GoopTabsList wobble={false} momentum={false}>{triggers}</GoopTabsList>
          </GoopTabs>
          <GoopTabs defaultValue="account">
            <GoopTabsList goo={false}>{triggers}</GoopTabsList>
          </GoopTabs>
        </>
      )
    default:
      return (
        <GoopTabs defaultValue="account" className="w-full max-w-sm flex-col">
          <GoopTabsList {...pg.list}>{triggers}</GoopTabsList>
          {TABS.map((t) => (
            <GoopTabsContent key={t.value} value={t.value} className="text-muted-foreground">
              {t.text}
            </GoopTabsContent>
          ))}
        </GoopTabs>
      )
  }
}

// ---- Dialog -----------------------------------------------------------------------------------

function DialogDemo({ set, pg }: ReactDemoProps) {
  const one = (label: string, variant: 'outline' | 'default' | 'secondary', content: Record<string, unknown>, title: string, text: string) => (
    <GoopDialog key={label}>
      <GoopDialogTrigger asChild>
        <GoopButton variant={variant}>{label}</GoopButton>
      </GoopDialogTrigger>
      <GoopDialogContent className="sm:max-w-md" {...content}>
        <GoopDialogHeader>
          <GoopDialogTitle>{title}</GoopDialogTitle>
          <GoopDialogDescription>{text}</GoopDialogDescription>
        </GoopDialogHeader>
      </GoopDialogContent>
    </GoopDialog>
  )
  switch (set) {
    case 'overlay':
      return (
        <>
          {one('Goo overlay', 'outline', { overlay: true, overlayDrips: true }, 'Goo overlay', 'The backdrop pours down over the page with a drippy edge, and drains off the bottom on close.')}
          {one('Straight edge', 'outline', { overlay: true, overlayDrips: false }, 'Straight edge', 'The backdrop pours down over the page, and drains off the bottom on close.')}
        </>
      )
    case 'surface':
      return (
        <>
          {one('popover (default)', 'outline', { surface: 'popover' }, 'surface', 'popover')}
          {one('trigger', 'default', { surface: 'trigger' }, 'surface', 'trigger')}
          {one('a CSS color', 'secondary', { surface: 'oklch(0.62 0.19 150)' }, 'surface', 'oklch(0.62 0.19 150)')}
        </>
      )
    case 'splash':
      return (
        <>
          {one('Default splash', 'secondary', {}, 'Default', 'Drops fling off every side.')}
          {one('Merge start', 'secondary', { bloomStart: 'merge', openDripAmount: 2, openDripSize: 1.4 }, 'Merge, bigger splash', 'A few drops fuse into the panel, then more, larger drops fly.')}
          {one('No splash', 'secondary', { openDrips: false }, 'No splash', 'Bloom and slosh only, nothing flies off.')}
        </>
      )
    default:
      return (
        <GoopDialog>
          <GoopDialogTrigger asChild>
            <GoopButton variant="outline">Edit profile</GoopButton>
          </GoopDialogTrigger>
          <GoopDialogContent className="sm:max-w-md" {...pg.content}>
            <GoopDialogHeader>
              <GoopDialogTitle>Edit profile</GoopDialogTitle>
              <GoopDialogDescription>Make changes to your profile here. Click save when you're done.</GoopDialogDescription>
            </GoopDialogHeader>
            <GoopDialogFooter>
              <GoopDialogClose asChild>
                <GoopButton variant="outline">Cancel</GoopButton>
              </GoopDialogClose>
              <GoopDialogClose asChild>
                <GoopButton>Save changes</GoopButton>
              </GoopDialogClose>
            </GoopDialogFooter>
          </GoopDialogContent>
        </GoopDialog>
      )
  }
}
