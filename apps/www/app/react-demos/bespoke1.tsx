/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for bespoke batch 1 (Toaster, Command, Combobox, NumberField, InputOTP) and
// their /react/docs/components tiles. Each set mirrors its Vue twin
// (components/content/DemoToaster.vue, DemoCommand.vue, DemoNumberField.vue, DemoInputOtp.vue,
// components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them in sync.
import {
  GoopButton,
  GoopCombobox,
  GoopComboboxAnchor,
  GoopComboboxEmpty,
  GoopComboboxGroup,
  GoopComboboxInput,
  GoopComboboxItem,
  GoopComboboxItemIndicator,
  GoopComboboxList,
  GoopComboboxTrigger,
  GoopCommand,
  GoopCommandDialog,
  GoopCommandEmpty,
  GoopCommandGroup,
  GoopCommandInput,
  GoopCommandItem,
  GoopCommandList,
  GoopCommandSeparator,
  GoopCommandShortcut,
  GoopInputOTP,
  GoopInputOTPGroup,
  GoopInputOTPSeparator,
  GoopInputOTPSlot,
  GoopNumberField,
  GoopNumberFieldContent,
  GoopNumberFieldDecrement,
  GoopNumberFieldIncrement,
  GoopNumberFieldInput,
  GoopToaster,
  REGEXP_ONLY_DIGITS,
} from '@goopui/react'
import { useState } from 'react'
import { toast } from 'sonner'

type Pg = Record<string, Record<string, unknown>>

/** Slugs with a live React tile here (the others keep ComponentTile.vue's sketch). */
export const BESPOKE_TILES: ReadonlySet<string> = new Set(['number-field', 'input-otp'])

// ---- Toaster (DemoToaster.vue) ------------------------------------------------------------------

export function ToasterDemo({ pg }: { pg: Pg }) {
  const showDefault = () => toast('Event has been created', { description: 'Sunday, December 03, 2023 at 9:00 AM' })
  const showSuccess = () => toast.success('Changes saved')
  const showError = () => toast.error('Could not reach the server')
  const showAction = () => toast('Message archived', { action: { label: 'Undo', onClick: () => toast('Restored') } })
  const showPromise = () =>
    toast.promise(new Promise<{ name: string }>((resolve) => setTimeout(() => resolve({ name: 'goopUI' }), 1600)), {
      loading: 'Loading...',
      success: (data: { name: string }) => `${data.name} has been added`,
      error: 'Error',
    })
  const showFive = () => [showDefault, showSuccess, showError, showAction, showPromise].forEach((fire, i) => setTimeout(fire, i * 180))
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <GoopButton variant="outline" onClick={showDefault}>Default</GoopButton>
      <GoopButton variant="outline" onClick={showSuccess}>Success</GoopButton>
      <GoopButton variant="outline" onClick={showError}>Error</GoopButton>
      <GoopButton variant="outline" onClick={showAction}>Action</GoopButton>
      <GoopButton variant="outline" onClick={showPromise}>Promise</GoopButton>
      <GoopButton onClick={showFive}>Show five</GoopButton>
      <GoopToaster {...pg.main} />
    </div>
  )
}

// ---- Command / Combobox (DemoCommand.vue) --------------------------------------------------------

const suggestions = ['Calendar', 'Search Emoji', 'Calculator']
const settings = [
  ['Profile', '⌘P'],
  ['Billing', '⌘B'],
  ['Settings', '⌘S'],
] as const
const frameworks = [
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'next', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]
const frameworkLabel = (v: string) => frameworks.find((f) => f.value === v)?.label ?? ''

function CommandItems({ onSelect }: { onSelect?: () => void }) {
  return (
    <GoopCommandList>
      <GoopCommandEmpty>No results found.</GoopCommandEmpty>
      <GoopCommandGroup heading="Suggestions">
        {suggestions.map((s) => (
          <GoopCommandItem key={s} value={s} onSelect={onSelect}>
            {s}
          </GoopCommandItem>
        ))}
      </GoopCommandGroup>
      <GoopCommandSeparator />
      <GoopCommandGroup heading="Settings">
        {settings.map(([s, k]) => (
          <GoopCommandItem key={s} value={s} onSelect={onSelect}>
            {s}
            <GoopCommandShortcut>{k}</GoopCommandShortcut>
          </GoopCommandItem>
        ))}
      </GoopCommandGroup>
    </GoopCommandList>
  )
}

export function CommandDemo({ set, pg }: { set: string; pg: Pg }) {
  const [open, setOpen] = useState(false)
  const [framework, setFramework] = useState('')
  if (set === 'dialog')
    return (
      <>
        <GoopButton variant="outline" onClick={() => setOpen(true)}>
          Open the palette
        </GoopButton>
        <GoopCommandDialog open={open} onOpenChange={setOpen}>
          <GoopCommandInput placeholder="Type a command or search..." autoFocus />
          <CommandItems onSelect={() => setOpen(false)} />
        </GoopCommandDialog>
      </>
    )
  if (set === 'combobox')
    return (
      <GoopCombobox value={framework} onValueChange={setFramework}>
        <GoopComboboxAnchor className="relative w-full max-w-56">
          <GoopComboboxInput className="pr-8" placeholder="Select framework..." displayValue={frameworkLabel} />
          <GoopComboboxTrigger data-replay className="absolute inset-y-0 right-0" aria-label="Show frameworks" />
        </GoopComboboxAnchor>
        <GoopComboboxList className="w-(--radix-popover-trigger-width)" {...pg.list}>
          <GoopComboboxEmpty>No framework found.</GoopComboboxEmpty>
          <GoopComboboxGroup>
            {frameworks.map((f) => (
              <GoopComboboxItem key={f.value} value={f.value} keywords={[f.label]}>
                {f.label}
                <GoopComboboxItemIndicator />
              </GoopComboboxItem>
            ))}
          </GoopComboboxGroup>
        </GoopComboboxList>
      </GoopCombobox>
    )
  return (
    <GoopCommand className="w-full max-w-sm rounded-lg border shadow-md" {...pg.main}>
      <GoopCommandInput placeholder="Type a command or search..." />
      <CommandItems />
    </GoopCommand>
  )
}

// ---- NumberField (DemoNumberField.vue) -----------------------------------------------------------

const Steppers = ({ label }: { label?: string }) => (
  <GoopNumberFieldContent>
    <GoopNumberFieldDecrement />
    <GoopNumberFieldInput aria-label={label} />
    <GoopNumberFieldIncrement />
  </GoopNumberFieldContent>
)

export function NumberFieldDemo({ set, pg }: { set: string; pg: Pg }) {
  const [qty, setQty] = useState<number | undefined>(3)
  const [price, setPrice] = useState<number | undefined>(24.5)
  switch (set) {
    case 'currency':
      return (
        <div className="grid w-full max-w-48 gap-2">
          <label htmlFor="demo-nf-price" className="text-sm font-medium">Price</label>
          <GoopNumberField id="demo-nf-price" value={price ?? null} onValueChange={setPrice} step={0.5} formatOptions={{ style: 'currency', currency: 'USD' }}>
            <Steppers />
          </GoopNumberField>
        </div>
      )
    case 'effects':
      return (
        <div className="grid w-full max-w-40 gap-4">
          <GoopNumberField defaultValue={1} preset="wild">
            <Steppers label="Wild preset" />
          </GoopNumberField>
          <GoopNumberField defaultValue={1} squish={false} nudge={false}>
            <Steppers label="Ring only" />
          </GoopNumberField>
        </div>
      )
    case 'states':
      return (
        <div className="grid w-full max-w-40 gap-4">
          <GoopNumberField defaultValue={4} disabled>
            <Steppers label="Disabled" />
          </GoopNumberField>
          <GoopNumberField defaultValue={2} goo={false}>
            <Steppers label="Plain shadcn" />
          </GoopNumberField>
        </div>
      )
    default:
      return (
        <div className="grid w-full max-w-40 gap-2">
          <label htmlFor="demo-nf-qty" className="text-sm font-medium">Quantity</label>
          <GoopNumberField id="demo-nf-qty" value={qty ?? null} onValueChange={setQty} min={0} max={20} {...pg.main}>
            <Steppers />
          </GoopNumberField>
        </div>
      )
  }
}

// ---- InputOTP (DemoInputOtp.vue) -----------------------------------------------------------------

const slots = (from: number, n: number) => Array.from({ length: n }, (_, i) => <GoopInputOTPSlot key={from + i} index={from + i} />)

export function InputOTPDemo({ set, pg }: { set: string; pg: Pg }) {
  const [code, setCode] = useState('')
  switch (set) {
    case 'effects':
      return (
        <div className="grid gap-4">
          <GoopInputOTP maxLength={4} preset="wild" aria-label="Wild code" pattern={REGEXP_ONLY_DIGITS} inputMode="numeric">
            <GoopInputOTPGroup>{slots(0, 4)}</GoopInputOTPGroup>
          </GoopInputOTP>
          <GoopInputOTP maxLength={4} flow={false} pulse={false} aria-label="Code without flow or pulse" pattern={REGEXP_ONLY_DIGITS} inputMode="numeric">
            <GoopInputOTPGroup>{slots(0, 4)}</GoopInputOTPGroup>
          </GoopInputOTP>
        </div>
      )
    case 'states':
      return (
        <div className="grid gap-4">
          <GoopInputOTP maxLength={4} disabled defaultValue="1234" aria-label="Disabled code">
            <GoopInputOTPGroup>{slots(0, 4)}</GoopInputOTPGroup>
          </GoopInputOTP>
          <GoopInputOTP maxLength={4} goo={false} aria-label="Code without goo">
            <GoopInputOTPGroup>{slots(0, 4)}</GoopInputOTPGroup>
          </GoopInputOTP>
        </div>
      )
    default:
      return (
        <div className="grid gap-2">
          <GoopInputOTP maxLength={6} value={code} onChange={setCode} aria-label="Verification code" {...pg.main}>
            <GoopInputOTPGroup>{slots(0, 3)}</GoopInputOTPGroup>
            <GoopInputOTPSeparator />
            <GoopInputOTPGroup>{slots(3, 3)}</GoopInputOTPGroup>
          </GoopInputOTP>
        </div>
      )
  }
}

// ---- tiles (ComponentTile.vue) -------------------------------------------------------------------

export function BespokeTile({ slug }: { slug: string }) {
  switch (slug) {
    case 'number-field':
      return (
        <GoopNumberField defaultValue={3} className="w-28">
          <GoopNumberFieldContent className="[&_input]:h-8 [&_input]:text-xs">
            <GoopNumberFieldDecrement />
            <GoopNumberFieldInput aria-label="Quantity" />
            <GoopNumberFieldIncrement />
          </GoopNumberFieldContent>
        </GoopNumberField>
      )
    case 'input-otp':
      return (
        <GoopInputOTP maxLength={4} defaultValue="42" aria-label="Code">
          <GoopInputOTPGroup className="[&>*]:size-8 [&>*]:text-xs">{slots(0, 4)}</GoopInputOTPGroup>
        </GoopInputOTP>
      )
    default:
      return null
  }
}
