/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the forms batch (Input / Textarea, Radio Group, Slider, Progress, Toggle /
// Toggle Group) and their tiles on /react/docs/components. Each set mirrors its Vue twin
// (components/content/DemoInput.vue, DemoRadioGroup.vue, DemoSlider.vue, DemoProgress.vue,
// DemoToggle.vue, components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them in
// sync.
import {
  GoopButton,
  GoopInput,
  GoopProgress,
  GoopRadioGroup,
  GoopRadioGroupItem,
  GoopSlider,
  GoopTextarea,
  GoopToggle,
  GoopToggleGroup,
  GoopToggleGroupItem,
} from '@goopui/react'
import { useEffect, useState } from 'react'

type Pg = Record<string, Record<string, unknown>>

// ---- Input / Textarea (DemoInput.vue) ---------------------------------------------------------

export function InputDemo({ set, pg }: { set: string; pg: Pg }) {
  const [email, setEmail] = useState('')
  const [invalidEmail, setInvalidEmail] = useState('not-an-email')
  const [bio, setBio] = useState('')
  switch (set) {
    case 'basic':
      return (
        <div className="grid w-full max-w-sm gap-2">
          <label htmlFor="demo-input-email" className="text-sm font-medium">Email</label>
          <GoopInput id="demo-input-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" {...pg.main} />
        </div>
      )
    case 'invalid':
      return (
        <div className="grid w-full max-w-sm gap-2">
          <label htmlFor="demo-input-invalid" className="text-sm font-medium">Email</label>
          <GoopInput
            id="demo-input-invalid"
            value={invalidEmail}
            onChange={(e) => setInvalidEmail(e.target.value)}
            type="email"
            aria-invalid="true"
            aria-describedby="demo-input-invalid-msg"
          />
          <p id="demo-input-invalid-msg" className="text-sm text-destructive">Enter a valid email address.</p>
        </div>
      )
    case 'effects':
      return (
        <div className="grid w-full max-w-sm gap-4">
          <GoopInput placeholder="Resting drips" drips aria-label="Resting drips" />
          <GoopInput placeholder={'preset="wild"'} preset="wild" aria-label="Wild preset" />
          <GoopInput placeholder={'preset="subtle"'} preset="subtle" aria-label="Subtle preset" />
          <GoopInput placeholder="No flow: the ring just appears" flow={false} aria-label="No flow" />
        </div>
      )
    case 'states':
      return (
        <div className="grid w-full max-w-sm gap-4">
          <GoopInput placeholder="Disabled" disabled aria-label="Disabled" />
          <GoopInput placeholder="Plain shadcn" goo={false} aria-label="Plain shadcn" />
        </div>
      )
    default:
      return (
        <div className="grid w-full max-w-sm gap-2">
          <label htmlFor="demo-textarea-bio" className="text-sm font-medium">Bio</label>
          <GoopTextarea id="demo-textarea-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself." />
        </div>
      )
  }
}

// ---- Radio Group (DemoRadioGroup.vue) ---------------------------------------------------------

const PLANS = ['free', 'pro', 'team']
const SIZES = ['s', 'm', 'l', 'xl']
const ABC = ['a', 'b', 'c']

export function RadioGroupDemo({ set, pg }: { set: string; pg: Pg }) {
  const [plan, setPlan] = useState('pro')
  const [size, setSize] = useState('m')
  switch (set) {
    case 'horizontal':
      return (
        <GoopRadioGroup value={size} onValueChange={setSize} orientation="horizontal" className="flex gap-6">
          {SIZES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm uppercase">
              <GoopRadioGroupItem id={`size-${s}`} value={s} /> {s}
            </label>
          ))}
        </GoopRadioGroup>
      )
    case 'features':
      return (
        <>
          <GoopRadioGroup defaultValue="a" orientation="horizontal" className="flex gap-6" bridge={false}>
            {ABC.map((o) => <GoopRadioGroupItem key={o} value={o} aria-label={o} />)}
          </GoopRadioGroup>
          <GoopRadioGroup defaultValue="a" orientation="horizontal" className="flex gap-6" preset="wild">
            {ABC.map((o) => <GoopRadioGroupItem key={o} value={o} aria-label={o} />)}
          </GoopRadioGroup>
          <GoopRadioGroup defaultValue="a" orientation="horizontal" className="flex gap-10">
            {ABC.map((o) => <GoopRadioGroupItem key={o} value={o} className="size-7" aria-label={o} />)}
          </GoopRadioGroup>
        </>
      )
    case 'states':
      return (
        <>
          <GoopRadioGroup defaultValue="one" className="w-40">
            <label className="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="one" /> One</label>
            <label className="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="two" /> Two</label>
            <label className="flex items-center gap-2 text-sm opacity-60"><GoopRadioGroupItem value="three" disabled /> Three (disabled)</label>
          </GoopRadioGroup>
          <GoopRadioGroup defaultValue="a" goo={false} className="w-40">
            <label className="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="a" /> Plain shadcn</label>
            <label className="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="b" /> (goo off)</label>
          </GoopRadioGroup>
        </>
      )
    default:
      return (
        <>
          <GoopRadioGroup value={plan} onValueChange={setPlan} className="w-40" {...pg.main}>
            {PLANS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm capitalize">
                <GoopRadioGroupItem id={`plan-${p}`} value={p} /> {p}
              </label>
            ))}
          </GoopRadioGroup>
          <p className="m-0 font-mono text-xs text-muted-foreground">value: {plan}</p>
        </>
      )
  }
}

// ---- Slider (DemoSlider.vue) ------------------------------------------------------------------

export function SliderDemo({ set, pg }: { set: string; pg: Pg }) {
  const [single, setSingle] = useState([50])
  const [range, setRange] = useState([25, 75])
  const [vertical, setVertical] = useState([40])
  const [steps, setSteps] = useState([30])
  switch (set) {
    case 'basic':
      return (
        <div className="grid w-full max-w-sm gap-3">
          <GoopSlider value={single} onValueChange={setSingle} max={100} step={1} aria-label="Volume" {...pg.main} />
          <span className="font-mono text-xs text-muted-foreground">{single[0]}</span>
        </div>
      )
    case 'range':
      return (
        <div className="grid w-full max-w-sm gap-3">
          <GoopSlider value={range} onValueChange={setRange} max={100} step={1} aria-label="Price range" />
          <span className="font-mono text-xs text-muted-foreground">
            {range[0]} to {range[1]}
          </span>
        </div>
      )
    case 'vertical':
      return (
        <div className="h-44">
          <GoopSlider value={vertical} onValueChange={setVertical} orientation="vertical" max={100} step={1} aria-label="Level" />
        </div>
      )
    case 'steps':
      return (
        <div className="grid w-full max-w-sm gap-3">
          <GoopSlider value={steps} onValueChange={setSteps} max={100} step={10} aria-label="Quality" />
          <span className="font-mono text-xs text-muted-foreground">{steps[0]}</span>
        </div>
      )
    case 'effects':
      return (
        <div className="grid w-full max-w-sm gap-6">
          <GoopSlider defaultValue={[40]} jelly={false} stretch={false} aria-label="Slosh and splat only" />
          <GoopSlider defaultValue={[60]} preset="wild" aria-label="Wild" />
          <GoopSlider defaultValue={[60]} preset="subtle" aria-label="Subtle" />
        </div>
      )
    default:
      return (
        <div className="w-full max-w-sm">
          <GoopSlider defaultValue={[40]} disabled aria-label="Disabled" />
        </div>
      )
  }
}

// ---- Progress (DemoProgress.vue) --------------------------------------------------------------

/** Fills in uneven bursts, holds at 100, then starts over. */
function useAutoProgress(on: boolean): number {
  const [auto, setAuto] = useState(0)
  useEffect(() => {
    if (!on) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let v = 0
    const tick = () => {
      if (v >= 100) {
        timer = setTimeout(() => {
          v = 0
          setAuto(0)
          tick()
        }, 1600)
        return
      }
      v = Math.min(100, v + 4 + Math.round(Math.random() * 18))
      setAuto(v)
      timer = setTimeout(tick, 450 + Math.random() * 700)
    }
    tick()
    return () => clearTimeout(timer)
  }, [on])
  return auto
}

export function ProgressDemo({ set, pg }: { set: string; pg: Pg }) {
  const [value, setValue] = useState(35)
  const auto = useAutoProgress(set === 'auto')
  const step = (d: number) => setValue((v) => Math.max(0, Math.min(100, v + d)))
  switch (set) {
    case 'basic':
      return (
        <div className="grid w-full max-w-sm gap-4">
          <GoopProgress value={value} aria-label="Upload" {...pg.main} />
          <div className="flex flex-wrap items-center gap-2">
            {[-25, -5, 5, 25].map((d) => (
              <GoopButton key={d} size="sm" variant="outline" onClick={() => step(d)}>
                {d > 0 ? `+${d}` : d}
              </GoopButton>
            ))}
            <span className="font-mono text-xs text-muted-foreground">{value}%</span>
          </div>
        </div>
      )
    case 'auto':
      return (
        <div className="grid w-full max-w-sm gap-3">
          <GoopProgress value={auto} aria-label="Installing" />
          <span className="font-mono text-xs text-muted-foreground">{auto}%</span>
        </div>
      )
    case 'tall':
      return (
        <div className="w-full max-w-sm">
          <GoopProgress value={65} className="h-3" aria-label="Storage used" />
        </div>
      )
    default:
      return (
        <div className="grid w-full max-w-sm gap-5">
          <GoopProgress value={null} aria-label="Loading" />
          <GoopProgress value={null} className="h-3" aria-label="Loading, tall" />
        </div>
      )
  }
}

// ---- Toggle / Toggle Group (DemoToggle.vue) ---------------------------------------------------

export function ToggleDemo({ set, pg }: { set: string; pg: Pg }) {
  const [bold, setBold] = useState(false)
  const [align, setAlign] = useState('left')
  const [marks, setMarks] = useState<string[]>(['bold', 'italic'])
  const body = (() => {
    switch (set) {
      case 'basic':
        return (
          <GoopToggle pressed={bold} onPressedChange={setBold} {...pg.main}>
            <span className="font-bold" aria-hidden="true">B</span> Bold
          </GoopToggle>
        )
      case 'variants':
        return (
          <>
            <GoopToggle defaultPressed>Default</GoopToggle>
            <GoopToggle variant="outline" defaultPressed>Outline</GoopToggle>
            <GoopToggle size="sm">sm</GoopToggle>
            <GoopToggle size="lg">lg</GoopToggle>
          </>
        )
      case 'single':
        return (
          <GoopToggleGroup type="single" value={align} onValueChange={setAlign} variant="outline" aria-label="Text alignment">
            <GoopToggleGroupItem value="left" aria-label="Align left">Left</GoopToggleGroupItem>
            <GoopToggleGroupItem value="center" aria-label="Align center">Center</GoopToggleGroupItem>
            <GoopToggleGroupItem value="right" aria-label="Align right">Right</GoopToggleGroupItem>
            <GoopToggleGroupItem value="justify" aria-label="Justify">Justify</GoopToggleGroupItem>
          </GoopToggleGroup>
        )
      case 'multiple':
        return (
          <GoopToggleGroup type="multiple" value={marks} onValueChange={setMarks} aria-label="Text style">
            <GoopToggleGroupItem value="bold" aria-label="Bold"><span className="font-bold">B</span></GoopToggleGroupItem>
            <GoopToggleGroupItem value="italic" aria-label="Italic"><span className="italic">I</span></GoopToggleGroupItem>
            <GoopToggleGroupItem value="underline" aria-label="Underline"><span className="underline">U</span></GoopToggleGroupItem>
            <GoopToggleGroupItem value="strike" aria-label="Strikethrough"><span className="line-through">S</span></GoopToggleGroupItem>
          </GoopToggleGroup>
        )
      default:
        return (
          <>
            <GoopToggle disabled>Disabled</GoopToggle>
            <GoopToggle droplets={false} wobble={false}>Flood only</GoopToggle>
            <GoopToggle preset="wild">Wild</GoopToggle>
            <GoopToggle goo={false}>Plain</GoopToggle>
          </>
        )
    }
  })()
  // Pressed toggles are Slime: the site sets --goop-toggle-on (assets/css/main.css).
  return <div className="contents">{body}</div>
}

// ---- Tiles on /react/docs/components (ComponentTile.vue) --------------------------------------

/** Slugs whose index tile is drawn here (see react-demos/tiles.ts REACT_FORMS_TILES). */
export function FormsTile({ slug }: { slug: string }) {
  switch (slug) {
    case 'toggle':
      return (
        <GoopToggle defaultPressed aria-label="Bold">
          <span className="font-bold">B</span>
        </GoopToggle>
      )
    case 'radio-group':
      // shadcn's root is w-full: w-auto keeps the tile centred (as on the Vue tile).
      return (
        <GoopRadioGroup defaultValue="a" className="flex w-auto gap-3" aria-label="Choice">
          {ABC.map((o) => <GoopRadioGroupItem key={o} value={o} aria-label={o.toUpperCase()} />)}
        </GoopRadioGroup>
      )
    case 'input':
      return <GoopInput containerClassName="w-auto" className="h-8 w-36 text-xs" placeholder="you@example.com" aria-label="Email" />
    case 'slider':
      return <GoopSlider defaultValue={[62]} className="w-32" aria-label="Volume" />
    case 'progress':
      return <GoopProgress value={64} className="w-32" aria-label="Progress" />
    default:
      return null
  }
}
