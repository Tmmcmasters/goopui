// attachGoop: turn any positioned-ish element into a goo body that drips, squishes,
// splashes, and carries the momentum of whatever moves it.
//
// Layering: the host gets `isolation: isolate` (and `position: relative` if it was static).
// An aria-hidden goo layer sits at z-index -1 inside it, so the host's real content (label,
// icon) paints ABOVE the goo, unfiltered and crisp. The layer is padded beyond the host so
// drips and 'near' splash particles stay inside the filter region. Nothing affects layout.
//
// Motion model (springs are closed-form, dt-based; see spring.ts):
//   press   : vertical squash spring (pointerdown / key), bouncy rebound on release
//   jelly   : translate, extra squash/stretch, and skew springs. Kicked by pointer entry/exit
//             velocity, clicks (shockwave pulse), keys; leans toward the pointer while hovered.
//   slosh   : the goo's center of mass (2D spring). Driven OPPOSITE to the pointer's
//             acceleration (jerked-cup inertia), by page scroll, and by device tilt. It swings
//             drips (pendulum), shifts and skews the body, stretches drips, and feeds the
//             leading side faster than the trailing side.
//   flow    : hanging drips creep along the edge toward the cursor with viscous lag.
//   swell   : spring toward click mass * massSwell (clicks add goop, decays over time)
//   drips   : DripField; continuous rhythm while hovered, splash drips on click.
//   fluid   : ParticleFluid; punch-through splashes on hard entries and click shockwave rings,
//             all launched along the pointer's velocity (faster = narrower spray). 'near' keeps
//             them in this element's layer; 'escape' hands them to one shared page overlay.
//   ripple  : click shockwave bump circles that travel along the body edge from the click.

import {
  GOOP_DEFAULTS,
  GOOP_PRESETS,
  type GoopPreset,
  GOOP_DEFAULT_SPLASH,
  GOOP_DEFAULT_HIT,
  GOOP_HIT_VAR,
  type GoopHitEffect,
  GOOP_PHYSICS,
  GOOP_SPLASH_VAR,
  type GoopSplashMode,
  type GoopTuning,
} from './constants'
import { DripField, type RestingDrip } from './drips'
import { gooVanishRadius } from './filter'
import { ParticleFluid, fluidParams, type ParticleSpawn } from './fluid'
import { removeTicker, wakeTicker } from './loop'
import { trackScroll, trackTilt, type ScrollTracker, type TiltTracker } from './motion'
import { acquireEscapeLayer, type EscapeLease } from './escape'
import { trackPointer, type PointerSample } from './pointer'
import { PuddleSet } from './puddles'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { readFinish as readFinishVars, type GoopFinishName, type GoopFinishRenderer } from './renderers/finish'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { clamp, isSpringSettled, smoothstep, springConfig, stepSpring, type SpringState } from './spring'
import { gooParamsOf, readPreset, readTuning, renameOptions } from './tuning'

const P = GOOP_PHYSICS

/** Features that take `true` / `false` / a number (strength) as an option. */
type ToggleKeys = 'restingDrips' | 'keyboard' | 'gloss' | 'taffy' | 'reach' | 'puddles' | 'labelRide' | 'idle'

export interface GoopOptions extends Partial<Omit<GoopTuning, ToggleKeys>> {
  /** @deprecated use `softness` */ blur?: number
  /** @deprecated use `edgeSharpness` */ contrast?: number
  /** @deprecated use `edge` */ threshold?: number
  /** @deprecated use `thickness` */ viscosity?: number
  /** @deprecated use `fallDistance` */ fall?: number
  /** @deprecated use `pointerReaction` */ reactivity?: number
  /** @deprecated use `clickGoop` */ clickMass?: number
  /** @deprecated use `clickGoopFade` */ massDecay?: number
  /** @deprecated use `splashMinSpeed` */ splashThreshold?: number
  /** @deprecated use `flowToCursor` */ flow?: number
  /** @deprecated use `strands` */ stringiness?: number
  /** Preset that sets defaults across features: 'subtle' | 'playful' (default) | 'wild'.
   *  Also `--goop-preset`. Explicit options and `--goop-*` vars override it. */
  preset?: GoopPreset
  /** Wet glossy look (specular + rim). `true` = preset strength, number = 0..1. `--goop-gloss`. */
  gloss?: boolean | number
  /** Press and drag off to pull a taffy string. `true` = preset strength, number = 0..2.
   *  `--goop-taffy` (strength), `--goop-taffy-length` (snap length px). */
  taffy?: boolean | number
  /** Edge bulges toward an approaching pointer. `true` = preset distance, number = px.
   *  `--goop-reach`. */
  reach?: boolean | number
  /** Drops pool on the floor and drain. `--goop-puddles` (0/1), `--goop-puddle-life` (s). */
  puddles?: boolean
  /** `[data-goop-label]` content follows the body's jelly. `true` = preset amount, number =
   *  0..1. `--goop-label-ride`. */
  labelRide?: boolean | number
  /** Static resting drips: a count (evenly spaced) or x positions as 0..1 fractions of the
   *  width. Also `--goop-resting-drips` (count only). */
  restingDrips?: number | (number | RestingDrip)[]
  /** Resting drips breathe with a very slow, tiny swell. Default on; `--goop-idle: 0`. */
  idle?: boolean
  /** Seed for deterministic resting-drip layout (and default `random`). Default: a stable
   *  hash of the element's id / class / text, so SSR and re-renders agree. */
  seed?: number
  /** Per-element time scale (multiplies the global setGoopTimeScale). Default 1. */
  timeScale?: number
  /** Spawn drips on hover / tap. Default true. `false` = static goo body only. */
  drips?: boolean
  /** Listen to pointer events on the host. Default true. Set false to drive it yourself
   *  via the handle's `press` / `release` / `drip` / `hover` / `addGoop` methods. */
  interactive?: boolean
  /** Ignore interaction (e.g. disabled button). Live drips finish; nothing new starts. */
  disabled?: boolean
  /** 'auto' (default) follows prefers-reduced-motion + <html data-reduced-motion="true">.
   *  `true`/`false` force it. */
  reducedMotion?: boolean | 'auto'
  /** Renderer: 'svg' (default, SVG filter), 'canvas' (shared WebGL2, 2D fallback), or a
   *  custom factory such as `createCanvasRenderer` / `makeCanvasRenderer({...})`.
   *  Unset + `finish: 'oil'` (or --goop-finish: oil at attach) picks 'canvas'. */
  renderer?: GoopRendererOption
  /** Surface finish: 'solid' (default) or 'oil' (thin-film iridescence). Falls back to the
   *  host's `--goop-finish`; `--goop-oil-intensity|scale|shift` tune it. Renderers that
   *  don't implement finishes ignore it. */
  finish?: GoopFinishName
  /** RNG for drip placement/jitter (inject a seeded one for tests). Default Math.random. */
  random?: () => number
  /** Where splash / shockwave particles go: 'near' (default; stay within ~70px, inside this
   *  element's layer), 'escape' (fly across the page in a shared overlay), or 'off'.
   *  Also settable from CSS: `--goop-splash: escape`. The option wins. */
  splash?: GoopSplashMode
  /** What a fast pointer hit (hard entry, fast swipe across or out) does: 'shockwave'
   *  (default: same family as a click, aimed along the motion), 'splash' (the punch-through
   *  glob), 'both', or 'none'. Also `--goop-hit-effect`. */
  hitEffect?: GoopHitEffect
  /** Renderer for the shared page overlay that 'escape' splashes fly in. Default 'canvas'
   *  (cheap full-viewport surface); 'svg' or a custom factory also work. */
  escapeRenderer?: GoopRendererOption
  /** Space/Enter on the focused host squishes from the top and adds goop. Default true.
   *  Also `--goop-keyboard: 0`. */
  keyboard?: boolean
  /** Device tilt shifts gravity sideways (opt-in, default false). Call
   *  `requestTiltPermission()` from a user gesture first on iOS. Scaled by --goop-tilt. */
  tilt?: boolean
  /** Write the body pose to the host as CSS vars every frame (`--goop-x`, `--goop-y` px,
   *  `--goop-skew` deg, `--goop-sx`, `--goop-sy`) so content can ride along with the goo.
   *  Default false. */
  cssVars?: boolean
}

/** Snapshot of what is driving the goo right now (for demos / devtools). */
export interface GoopDebugState {
  hovered: boolean
  pressed: boolean
  /** Pointer velocity px/s (smoothed, decays when the pointer rests). */
  vx: number
  vy: number
  /** Pointer speed normalized by GOOP_PHYSICS.speedRef, capped at 2. */
  speed: number
  /** Click-added goop (0..GOOP_PHYSICS.maxMass). */
  mass: number
  /** Live drips (attached + falling). */
  drips: number
  /** Seconds until the next rhythm drip (Infinity when not hovering). */
  nextDrip: number
  /** Goo center-of-mass offset (px): the inertia vector. */
  sloshX: number
  sloshY: number
  /** In-plane gravity direction from tilt (0,1 when tilt is off). */
  gravityX: number
  gravityY: number
  /** Page scroll velocity (px/s). */
  scrollVy: number
  /** Live splash/shockwave particles in this element's layer. */
  particles: number
  splash: GoopSplashMode
  /** Resolved preset. */
  preset: GoopPreset
  /** Live puddles. */
  puddles: number
  /** A taffy string exists ('pulling' while held, 'retracting' after release or snap). */
  taffy: 'none' | 'pulling' | 'retracting'
  /** Current reach bulge strength (0 = none). */
  reach: number
}

export interface GoopHandle {
  /** Merge new options and re-read `--goop-*` CSS vars from the host. */
  update(opts?: GoopOptions): void
  /** Tear everything down: listeners, observers, rAF ticker, DOM, filter ref. Idempotent. */
  destroy(): void
  /** Squish the body (like pointerdown). */
  press(): void
  /** Release the squish with a spring rebound (like pointerup). */
  release(): void
  /** Start hover drips (`true`) or retract un-detached ones (`false`). */
  hover(on: boolean, x?: number): void
  /** Spawn one drip that swells and detaches on its own (like a tap). x in host px. */
  drip(x?: number): void
  /** Add goop like a click does: swell the body and throw a splash drip at x (host px).
   *  `amount` defaults to --goop-click-mass. */
  addGoop(amount?: number, x?: number): void
  /** Click shockwave at (x, y) host px (default center): particle ring + edge ripple.
   *  `aim.vx/vy` (px/s) override the tracked pointer velocity for the directional bias,
   *  e.g. on `interactive: false` hosts that never see the pointer. */
  shockwave(x?: number, y?: number, strength?: number, aim?: { vx?: number; vy?: number }): void
  /** Drive the pointer from outside (non-interactive hosts): feeds the shared velocity
   *  tracker with a client-space position and, while `hover(true)` is on, steers lean,
   *  inertia, flow and drip placement. */
  feedPointer(p: { clientX: number; clientY: number }): void
  /** Punch-through splash as if the pointer entered at (x, y) host px moving at (vx, vy) px/s. */
  splashThrough(x: number, y: number, vx: number, vy: number): void
  /** What is driving the goo right now (pointer velocity, mass, slosh, ...). */
  inspect(): GoopDebugState
  /** The aria-hidden goo layer element. */
  readonly layer: HTMLElement
  /** Whether the instance is currently in reduced-motion (static) mode. */
  readonly reducedMotion: boolean
  /** Resolved tuning currently in use. */
  readonly tuning: Readonly<GoopTuning>
}

const filterParams = (t: GoopTuning) => gooParamsOf(t)

function layerPadding(t: GoopTuning, splash: GoopSplashMode): { side: number; bottom: number } {
  const maxSize = t.dripSize * (1 + P.sizeJitter) * (1 + P.burstSize * 2 + P.splashSizePerMass * P.maxMass)
  let side = Math.ceil(t.softness * 3 + maxSize * 2 + P.maxOffset + 4)
  const reach = t.dripLength + maxSize * 2 + P.maxSlosh
  const fall = t.fallDistance * (1 + P.fallJitter) * (1 + P.dropMaxStretch)
  let bottom = Math.ceil(side + reach + fall)
  if (splash === 'near' && (t.splashAmount > 0 || t.shockwave > 0)) {
    // Room for particles to fly ~nearReach px past any edge, then drip.
    side = Math.max(side, Math.ceil(P.nearReach + t.softness * 3 + t.dripSize * 2))
    bottom = Math.max(bottom, Math.ceil(side + t.fallDistance))
  }
  // Taffy strings and reach bulges extend past the edges.
  if (t.taffy > 0) side = Math.max(side, Math.ceil(t.taffyLength + t.dripSize * 5 + t.softness * 3))
  if (t.reach > 0)
    side = Math.max(side, Math.ceil(P.reachBulge + t.dripSize * t.reachSize * 4.2 + t.softness * 3))
  bottom = Math.max(bottom, side + 8)
  return { side, bottom }
}

const spring = (x = 0): SpringState => ({ x, v: 0 })

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable per-element seed: same markup -> same layout (SSR / hydration / re-render safe). */
function stableSeed(el: Element): number {
  const key = (el.id || '') + '|' + (el.getAttribute('class') || '') + '|' + (el.textContent || '').trim().slice(0, 64)
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return h >>> 0
}
const DEG = Math.PI / 180

const TOGGLES = ['gloss', 'taffy', 'reach', 'puddles', 'labelRide', 'keyboard', 'idle'] as const

/** Strength a `true` toggle gets when its default is off (gloss is opt-in). */
const TOGGLE_ON_STRENGTH: Partial<Record<(typeof TOGGLES)[number], number>> = { gloss: 0.6, puddles: 1 }

/** Numeric tuning overrides from options. Toggles: `false` -> 0, number -> itself, `true` ->
 *  left to CSS / preset (then bumped to the default strength if that resolved to 0). */
const tuningOverrides = (raw: GoopOptions): Partial<GoopTuning> => {
  const o = renameOptions(raw)
  const { restingDrips, ...rest } = o
  const out = { ...rest, restingDrips: Array.isArray(restingDrips) ? undefined : restingDrips } as Record<string, unknown>
  for (const k of TOGGLES) {
    const v = o[k]
    out[k] = v === false ? 0 : typeof v === 'number' ? v : undefined
  }
  return out as Partial<GoopTuning>
}

/** Option > CSS var > preset > defaults, with `true` toggles forced on. */
function resolveTuning(host: Element, o: GoopOptions): { tuning: GoopTuning; preset: GoopPreset } {
  const preset = readPreset(host, o.preset)
  const tuning = readTuning(host, tuningOverrides(o), preset)
  for (const k of TOGGLES) if (o[k] === true && tuning[k] <= 0) tuning[k] = GOOP_DEFAULTS[k] || TOGGLE_ON_STRENGTH[k] || 1
  return { tuning, preset }
}

function readHitEffect(host: Element, opt: GoopHitEffect | undefined, preset: GoopPreset): GoopHitEffect {
  if (opt) return opt
  const raw = host.ownerDocument?.defaultView?.getComputedStyle?.(host)?.getPropertyValue(GOOP_HIT_VAR)?.trim()
  return raw === 'shockwave' || raw === 'splash' || raw === 'both' || raw === 'none'
    ? raw
    : (GOOP_PRESETS[preset].hitEffect ?? GOOP_DEFAULT_HIT)
}

function readSplashMode(host: Element, opt: GoopSplashMode | undefined, preset: GoopPreset): GoopSplashMode {
  if (opt) return opt
  const raw = host.ownerDocument?.defaultView?.getComputedStyle?.(host)?.getPropertyValue(GOOP_SPLASH_VAR)?.trim()
  return raw === 'escape' || raw === 'off' || raw === 'near' ? raw : GOOP_PRESETS[preset].splash ?? GOOP_DEFAULT_SPLASH
}

interface Ripple {
  x: number
  y: number
  t: number
  life: number
  size: number
  slots: { blob: GoopBlob; r: number; x: number; y: number }[]
}

export function attachGoop(host: HTMLElement, options: GoopOptions = {}): GoopHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: GoopOptions = { ...options }
  let resolved = resolveTuning(host, opts)
  let tuning = resolved.tuning
  let splashMode = readSplashMode(host, opts.splash, resolved.preset)
  let hitEffect = readHitEffect(host, opts.hitEffect, resolved.preset)
  let lastHit = -Infinity
  let finish: GoopFinishName = 'solid'
  const random = (): number => (opts.random ?? Math.random)()

  // ---- host setup ----------------------------------------------------------
  const prevStyle = { position: host.style.position, isolation: host.style.isolation }
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  // Oil is nearly free on canvas but costs a filter re-raster on SVG: when oil is asked for
  // and no renderer was chosen explicitly, use canvas. `renderer: 'svg'` still gets the
  // (cheap, static) SVG film. The renderer is fixed at attach time.
  const rendererChoice = (): GoopRendererOption | undefined =>
    opts.renderer ?? (readFinishVars(host, { finish: opts.finish }).finish === 'oil' ? 'canvas' : undefined)
  let rendererKey = rendererChoice()
  let renderer: GoopRenderer = resolveRenderer(rendererKey)(host, filterParams(tuning))
  renderer.setPadding(layerPadding(tuning, splashMode))
  const field = new DripField(renderer)
  /** Finish goes to whichever renderer is in use; `finish` tracks it for the sheen flow. */
  let oilReact = 0
  const applyFinish = (): void => {
    const f = readFinishVars(host, { finish: opts.finish })
    finish = f.finish
    oilReact = f.oilFollowPointer
    ;(renderer as GoopFinishRenderer).setFinish?.({ finish: opts.finish })
  }
  applyFinish()
  /** Oil film flow state. */
  const sheen = { phase: 0, pos: 0, swirl: 0 }
  const fluid = new ParticleFluid(() => renderer.createBlob())
  const pointer = trackPointer(doc, () => onTrackerMove())
  const puddles = new PuddleSet(() => renderer.createBlob())
  let escape: EscapeLease | null = null
  let tiltTracker: TiltTracker | null = null

  // ---- state ---------------------------------------------------------------
  let width = host.offsetWidth
  let height = host.offsetHeight
  let cornerRadius = 0
  const body = spring(1) // press: vertical scale
  const jelly = { tx: spring(), ty: spring(), dsx: spring(), dsy: spring(), skew: spring(), swell: spring() }
  const slosh = { x: spring(), y: spring() }
  const ripples: Ripple[] = []
  let mass = 0
  let pressed = false
  let hovered = false
  let destroyed = false
  let visible = true
  let nextDrip = Number.POSITIVE_INFINITY
  /** Previous-frame pointer / scroll velocity, for acceleration. */
  let prevV: { vx: number; vy: number } | null = null
  let prevScrollVy = 0
  /** Last pointer position over the host, in host px. */
  const ptr = { x: 0, y: 0, has: false }
  let lastVars = ''

  let pressCfg = springConfig(P.pressSpring, tuning.thickness)
  let releaseCfg = springConfig(P.releaseSpring, tuning.thickness)
  let jellyCfg = springConfig(P.jellySpring, tuning.thickness)
  let sloshCfg = springConfig(P.sloshSpring, tuning.thickness)
  const syncSprings = (): void => {
    pressCfg = springConfig(P.pressSpring, tuning.thickness)
    releaseCfg = springConfig(P.releaseSpring, tuning.thickness)
    jellyCfg = springConfig(P.jellySpring, tuning.thickness)
    sloshCfg = springConfig(P.sloshSpring, tuning.thickness)
    taffyCfg = springConfig(P.taffySpring, tuning.thickness)
    reachCfg = springConfig(P.reachSpring, tuning.thickness)
    reachLumpCfg = springConfig(P.reachLumpSpring, tuning.thickness)
  }

  const readGeometry = (): void => {
    width = host.offsetWidth
    height = host.offsetHeight
    const r = win?.getComputedStyle(host).borderBottomLeftRadius ?? '0'
    const n = Number.parseFloat(r)
    // Percent radii: resolve against width (good enough for pills/circles).
    const px = Number.isFinite(n) ? (r.trim().endsWith('%') ? (n / 100) * width : n) : 0
    // A 9999px pill radius really means "half the height".
    cornerRadius = Math.min(px, height / 2, width / 2)
  }
  readGeometry()

  const clearRipples = (): void => {
    for (const rp of ripples) for (const s of rp.slots) s.blob.remove()
    ripples.length = 0
  }

  const resetMotion = (): void => {
    body.x = 1
    body.v = 0
    for (const s of [...Object.values(jelly), slosh.x, slosh.y]) {
      s.x = 0
      s.v = 0
    }
    mass = 0
    prevV = null
    renderer.setBodyTransform?.({ tx: 0, ty: 0, skew: 0, sx: 1, sy: 1 })
    renderer.setBodyScale(1, 1)
    writeVars(0, 0, 0, 1, 1)
  }

  function writeVars(tx: number, ty: number, skew: number, sx: number, sy: number): void {
    if (!opts.cssVars) return
    const v = `${tx.toFixed(1)}|${ty.toFixed(1)}|${skew.toFixed(1)}|${sx.toFixed(3)}|${sy.toFixed(3)}`
    if (v === lastVars) return
    lastVars = v
    host.style.setProperty('--goop-x', `${tx.toFixed(1)}px`)
    host.style.setProperty('--goop-y', `${ty.toFixed(1)}px`)
    host.style.setProperty('--goop-skew', `${skew.toFixed(1)}deg`)
    host.style.setProperty('--goop-sx', sx.toFixed(3))
    host.style.setProperty('--goop-sy', sy.toFixed(3))
  }

  // ---- reduced motion ------------------------------------------------------
  const computeReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = computeReduced()

  const enterReduced = (): void => {
    field.clear()
    fluid.clear()
    clearRipples()
    puddles.clear()
    endTaffy()
    for (const b of reachBlobs) b.remove()
    reachBlobs = []
    reachAmt.x = 0
    reachShown = 0
    reachAmt.v = 0
    rideLabels(0, 0, 0, 1, 1)
    pressed = false
    hovered = false
    nextDrip = Number.POSITIVE_INFINITY
    resetMotion()
    sheen.pos = 0
    sheen.swirl = 0
    if (finish === 'oil') renderer.setSheen?.({ phase: sheen.phase, swirl: P.oilSwirl, vx: 0, vy: 0 })
    renderer.flush()
    removeTicker(tick)
  }

  const unwatchReduced = watchReducedMotion(doc, () => {
    const next = computeReduced()
    if (next === reduced) return
    reduced = next
    if (reduced) enterReduced()
  })

  // ---- helpers ---------------------------------------------------------------
  const react = (): number => tuning.pointerReaction
  const speedOf = (s: { speed: number }): number => Math.min(2, s.speed / P.speedRef)
  const canInteract = (): boolean => !destroyed && !reduced && !opts.disabled
  const dripsOn = (): boolean => opts.drips !== false && tuning.dripCount > 0

  /** Usable x range along the bottom edge, clear of the rounded corners. */
  const edgeRange = (): [number, number] => {
    const inset = Math.max(cornerRadius, tuning.dripSize * 1.4) + tuning.dripSize * 1.2
    const lo = Math.min(inset, width / 2)
    return [lo, Math.max(lo, width - inset)]
  }

  /** Pick an anchor x with spacing from `taken`; tries near `near` (+/- spread) first. */
  const pickX = (taken: number[], near?: number, spread: number = P.pointerJitter): number | null => {
    const [lo, hi] = edgeRange()
    const gap = tuning.dripSize * P.minSpacing
    for (let tries = 0; tries < 16; tries++) {
      const x =
        near !== undefined && tries < 6
          ? clamp(near + (random() * 2 - 1) * spread * (1 + tries * 0.5), lo, hi)
          : lo + random() * (hi - lo)
      if (taken.every((t) => Math.abs(t - x) >= gap)) return x
    }
    return null
  }

  const takenXs = (): number[] => field.attached().map((d) => d.x)
  const hoverDrips = (): number => field.attached().filter((d) => d.fed && !d.forced).length

  const rhythmInterval = (): number => {
    const s = speedOf(pointer.sample()) * react()
    const j = 1 + (random() * 2 - 1) * P.rhythmJitter
    return (tuning.dripInterval * j) / (1 + s * P.rhythmSpeed + mass * P.rhythmMass)
  }

  /** Where new drips should go: ahead of the pointer and toward the side the goo sloshed to. */
  const leadX = (s: PointerSample): number | undefined => {
    if (!ptr.has) return undefined
    return ptr.x + s.vx * P.leadTime * Math.min(1, react()) + slosh.x.x * 2
  }

  const gravityX = (): number => (opts.tilt && tiltTracker ? tiltTracker.gravity().x * tuning.tiltStrength : 0)

  // ---- particles (splash + shockwave) -------------------------------------------
  let gooColor = ''
  const readColor = (): string => {
    const cs = win?.getComputedStyle(host)
    gooColor = cs?.getPropertyValue('--goop-color').trim() || cs?.color || 'currentColor'
    return gooColor
  }
  const toPage = (x: number, y: number): { x: number; y: number; k: number } => {
    const rect = host.getBoundingClientRect()
    const k = width ? rect.width / width : 1
    return { x: rect.left + (win?.scrollX ?? 0) + x * k, y: rect.top + (win?.scrollY ?? 0) + y * k, k }
  }
  const ensureEscape = (): EscapeLease => {
    if (!escape)
      escape = acquireEscapeLayer(doc, {
        renderer: opts.escapeRenderer,
        params: filterParams(tuning),
        puddleLife: tuning.puddles > 0 ? tuning.puddleLife : 0,
      })
    return escape
  }
  const particleRoom = (): number =>
    splashMode === 'escape' ? ensureEscape().room() : splashMode === 'near' ? fluid.room() : 0

  /** Launch one particle from host-space (x, y) along (dx, dy) at `speed` px/s. */
  const launch = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    speed: number,
    rand: number,
    bond = false,
  ): void => {
    const fp = fluidParams(tuning.oiliness, tuning.thickness)
    const r = tuning.dripSize * fp.size * (0.8 + 0.4 * rand)
    const base: Omit<ParticleSpawn, 'x' | 'y' | 'vx' | 'vy'> = {
      r,
      oiliness: tuning.oiliness,
      gravity: tuning.gravity,
      gravityX: gravityX() * tuning.gravity * P.tiltGravity,
      vanish: gooVanishRadius(gooParamsOf(tuning)),
      viscosity: tuning.thickness,
      rand,
      bond: bond && tuning.strands > 0,
      bondStiffness: P.bondStiffness * tuning.strands,
      bondBreak: 2 + P.bondBreak * tuning.strands,
    }
    const v = speed * fp.speed
    if (splashMode === 'escape') {
      const p = toPage(x, y)
      ensureEscape().spawn({
        ...base,
        r: r * p.k,
        x: p.x,
        y: p.y,
        vx: dx * v * P.escapeSpeed,
        vy: dy * v * P.escapeSpeed,
        dragScale: P.escapeDrag,
        color: gooColor || readColor(),
      })
    } else if (splashMode === 'near') {
      fluid.spawn({ ...base, x, y, vx: dx * v, vy: dy * v })
    }
  }

  /** Point where a ray from (x, y) along (dx, dy) leaves the host box. */
  const exitPoint = (x: number, y: number, dx: number, dy: number): { x: number; y: number } => {
    const px = clamp(x, 0, width)
    const py = clamp(y, 0, height)
    const tx = dx > 1e-6 ? (width - px) / dx : dx < -1e-6 ? -px / dx : Infinity
    const ty = dy > 1e-6 ? (height - py) / dy : dy < -1e-6 ? -py / dy : Infinity
    const t = Math.min(tx, ty)
    return Number.isFinite(t) ? { x: px + dx * t, y: py + dy * t } : { x: px, y: py }
  }

  const splashThrough = (x: number, y: number, vx: number, vy: number): void => {
    if (!canInteract() || splashMode === 'off' || tuning.splashAmount <= 0) return
    const speed = Math.hypot(vx, vy)
    if (speed < 1) return
    const n = speed / P.speedRef
    const over = Math.max(0, n - tuning.splashMinSpeed)
    const dx = vx / speed
    const dy = vy / speed
    const exit = exitPoint(x, y, dx, dy)
    readColor()
    const count = Math.min(
      P.splashMaxBurst,
      particleRoom(),
      Math.round(tuning.splashAmount * (P.splashCount + P.splashCountPerSpeed * over)),
    )
    // Faster = narrower, more directional spray.
    const cone = P.splashCone / (1 + over * 1.5)
    const base = Math.atan2(dy, dx)
    const sp = P.splashSpeed + P.splashSpeedPerSpeed * Math.min(2, over)
    // Oil launches with a wider speed spread so cohesion stretches it into strings. With
    // stringiness, particles go out fastest-first and each is chained to the previous one,
    // so the burst becomes a tendril strung along the ray that thins and snaps.
    const spread = 0.35 + 0.35 * tuning.oiliness
    const chain = tuning.strands > 0
    let a0 = base + (random() * 2 - 1) * cone * 0.5
    for (let i = 0; i < count; i++) {
      const order = chain ? 1 - i / Math.max(1, count - 1) : random()
      // Chained strands wander slowly; loose spray picks a fresh angle per particle.
      const a = chain ? (a0 += (random() * 2 - 1) * cone * 0.25) : base + (random() * 2 - 1) * cone
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const r = random()
      // Emerge just outside the far edge, slightly staggered along the ray (a stream, not a dot).
      const off = tuning.dripSize * (0.3 + 1.2 * (chain ? order : random()))
      launch(exit.x + ux * off, exit.y + uy * off, ux, uy, sp * (1 - spread + 2 * spread * order), r, chain && i > 0)
    }
    // The far side bulges out with the punch.
    jelly.tx.v += dx * P.shockPush * 1.5 * react()
    jelly.ty.v += dy * P.shockPush * 1.5 * react()
    wake()
  }

  const shockwave = (
    x = width / 2,
    y = height / 2,
    strength = tuning.shockwave,
    aim?: { vx?: number; vy?: number },
  ): void => {
    if (!canInteract() || strength <= 0) return
    const r = react()
    const tracked = pointer.sample()
    const s =
      aim && (aim.vx !== undefined || aim.vy !== undefined)
        ? (() => {
            const vx = aim.vx ?? 0
            const vy = aim.vy ?? 0
            return { ...tracked, vx, vy, speed: Math.hypot(vx, vy) }
          })()
        : tracked
    const n = speedOf(s)
    // Body pulse away from the click point.
    const ox = (x - width / 2) / (width / 2 || 1)
    const oy = (y - height / 2) / (height / 2 || 1)
    jelly.tx.v -= ox * P.shockPush * strength * r
    jelly.ty.v -= oy * P.shockPush * strength * r
    jelly.dsx.v += P.shockSquash * strength * r * 0.6
    jelly.dsy.v -= P.shockSquash * strength * r * 0.4
    // Edge ripple.
    if (ripples.length < P.maxRipples) {
      const corners = [Math.hypot(x, y), Math.hypot(width - x, y), Math.hypot(x, height - y), Math.hypot(width - x, height - y)]
      const slots = []
      for (let i = 0; i < 8; i++) slots.push({ blob: renderer.createBlob(), r: 0, x, y })
      ripples.push({
        x,
        y,
        t: 0,
        life: Math.max(...corners) / P.rippleSpeed + 0.05,
        size: Math.min(P.rippleMaxSize, (P.rippleSize + P.rippleSizePerMass * mass) * strength),
        slots,
      })
    }
    // Particle ring, pushed outward from the center and along the pointer's motion.
    if (splashMode !== 'off') {
      readColor()
      const count = Math.min(
        P.shockMaxBurst,
        particleRoom(),
        Math.round(strength * (P.shockCount + P.shockCountPerMass * mass)),
      )
      const ol = Math.hypot(ox, oy) || 1
      const outX = (ox / ol) * Math.min(1, Math.hypot(ox, oy) * 2)
      const outY = (oy / ol) * Math.min(1, Math.hypot(ox, oy) * 2)
      const vl = s.speed || 1
      const bias = P.sprayBias * Math.min(2, n) * r
      const sp = (P.shockSpeed + P.shockSpeedPerMass * mass) * Math.sqrt(strength)
      const phase = random() * Math.PI * 2
      for (let i = 0; i < count; i++) {
        const a = phase + (i / count) * Math.PI * 2 + (random() - 0.5) * 0.4
        let dx = Math.cos(a) + outX * P.shockOutwardBias + (s.vx / vl) * bias
        let dy = Math.sin(a) + outY * P.shockOutwardBias + (s.vy / vl) * bias
        const l = Math.hypot(dx, dy) || 1
        dx /= l
        dy /= l
        const rr = random()
        if (splashMode === 'escape') {
          // The page overlay paints above the label: start escaping goo at the body's edge.
          const e = exitPoint(x, y, dx, dy)
          launch(e.x + dx * 3, e.y + dy * 3, dx, dy, sp * (0.7 + 0.6 * rr), rr)
        } else launch(x + dx * 2, y + dy * 2, dx, dy, sp * (0.7 + 0.6 * rr), rr)
      }
    }
    wake()
  }

  /** Draw ripple bumps where a circle of radius R around the click crosses the body edge. */
  const stepRipples = (dt: number, map: (x: number, y: number) => { x: number; y: number }): boolean => {
    let active = false
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i]!
      rp.t += dt
      const R = rp.t * P.rippleSpeed
      const env = rp.t >= rp.life ? 0 : Math.min(1, rp.t / 0.04) * Math.pow(1 - rp.t / rp.life, 1.5)
      // Slots: [top-, top+, bottom-, bottom+, left-, left+, right-, right+]
      const hits: ({ x: number; y: number } | null)[] = []
      for (const Y of [0, height]) {
        const d2 = R * R - (Y - rp.y) * (Y - rp.y)
        for (const sgn of [-1, 1]) {
          const X = d2 >= 0 ? rp.x + sgn * Math.sqrt(d2) : NaN
          hits.push(Number.isFinite(X) && X >= 0 && X <= width ? { x: X, y: Y } : null)
        }
      }
      for (const X of [0, width]) {
        const d2 = R * R - (X - rp.x) * (X - rp.x)
        for (const sgn of [-1, 1]) {
          const Y = d2 >= 0 ? rp.y + sgn * Math.sqrt(d2) : NaN
          hits.push(Number.isFinite(Y) && Y >= 0 && Y <= height ? { x: X, y: Y } : null)
        }
      }
      const k = 1 - Math.exp(-dt / 0.025)
      let alive = false
      rp.slots.forEach((slot, j) => {
        const hit = hits[j]
        const target = hit ? rp.size * env : 0
        if (hit) {
          slot.x = hit.x
          slot.y = hit.y
        }
        slot.r += (target - slot.r) * k
        if (slot.r > 0.05 || target > 0) alive = true
        const p = map(slot.x, slot.y)
        slot.blob.set(p.x, p.y, slot.r)
      })
      if (!alive && rp.t >= rp.life) {
        for (const s of rp.slots) s.blob.remove()
        ripples.splice(i, 1)
      } else active = true
    }
    return active
  }

  // ---- labels ride along ------------------------------------------------------------
  /** Content marked `[data-goop-label]` follows the body (transform only: text stays crisp). */
  let labels: HTMLElement[] = []
  const findLabels = (): void => {
    labels = Array.from(host.querySelectorAll<HTMLElement>('[data-goop-label]')).filter(
      (l) => !renderer.layer.contains(l),
    )
  }
  findLabels()
  let lastLabel = ''
  const rideLabels = (tx: number, ty: number, skew: number, sx: number, sy: number): void => {
    if (!labels.length) return
    const k = reduced ? 0 : tuning.labelRide
    const parts: string[] = []
    if (k > 0) {
      const lx = tx * k
      const ly = ty * k
      const ks = skew * k * 0.6
      const lsx = 1 + (sx - 1) * k
      const lsy = 1 + (sy - 1) * k
      if (Math.abs(lx) > 0.05 || Math.abs(ly) > 0.05) parts.push(`translate(${lx.toFixed(2)}px,${ly.toFixed(2)}px)`)
      if (Math.abs(ks) > 0.05) parts.push(`skewX(${ks.toFixed(2)}deg)`)
      if (Math.abs(lsx - 1) > 0.001 || Math.abs(lsy - 1) > 0.001)
        parts.push(`scale(${lsx.toFixed(4)},${lsy.toFixed(4)})`)
    }
    const t = parts.join(' ')
    if (t === lastLabel) return
    lastLabel = t
    for (const l of labels) l.style.transform = t
  }

  // ---- puddles --------------------------------------------------------------------------
  const floorY = (): number => height + layerPadding(tuning, splashMode).bottom - 3
  const pool = (x: number, y: number, r: number, vx: number): void =>
    puddles.add({ x, floor: y, r, vx, vanish: gooVanishRadius(gooParamsOf(tuning)), life: tuning.puddleLife })

  // ---- taffy pull -------------------------------------------------------------------------
  interface Taffy {
    /** Anchor on the (unscaled) body edge, host px. */
    ax: number
    ay: number
    /** String end (host px), x/v each axis. */
    end: { x: SpringState; y: SpringState }
    target: { x: number; y: number }
    holding: boolean
    blobs: GoopBlob[]
    /** Secondary ropes from nearby edge points into the cursor blob. */
    extra: TaffyRope[]
  }
  interface TaffyRope {
    ax: number
    ay: number
    end: { x: SpringState; y: SpringState }
    /** Offset from the main end (the ropes meet the cursor blob a little apart). */
    ox: number
    oy: number
    /** Snaps at this fraction of the taffy length (staggered release). */
    snapAt: number
    /** Thickness relative to the main rope. */
    scale: number
    snapped: boolean
    blobs: GoopBlob[]
  }
  let taffy: Taffy | null = null
  let taffyArmed = false
  let taffyTimer: ReturnType<typeof setTimeout> | null = null
  let suppressClick = false
  let taffyCfg = springConfig(P.taffySpring, tuning.thickness)

  /** Closest point on the host's edge to (x, y), host px. */
  const edgePoint = (x: number, y: number): { x: number; y: number } => {
    const cx = clamp(x, 0, width)
    const cy = clamp(y, 0, height)
    if (cx !== x || cy !== y) return { x: cx, y: cy }
    const d = [cy, height - cy, cx, width - cx]
    const m = Math.min(...d)
    if (m === d[0]) return { x: cx, y: 0 }
    if (m === d[1]) return { x: cx, y: height }
    if (m === d[2]) return { x: 0, y: cy }
    return { x: width, y: cy }
  }

  const startTaffy = (x: number, y: number): void => {
    const e = edgePoint(x, y)
    const blobs: GoopBlob[] = []
    for (let i = 0; i < 24; i++) blobs.push(renderer.createBlob())
    // Secondary ropes: anchored a little to either side along the edge.
    const horizontal = e.y <= 0.01 || e.y >= height - 0.01
    const rng = seeded((opts.seed ?? stableSeed(host)) ^ Math.round(e.x * 31 + e.y * 17))
    const r0 = tuning.dripSize * (1 + 0.5 * tuning.globbiness)
    const extra: TaffyRope[] = []
    const count = Math.round(tuning.taffyStrands)
    for (let j = 0; j < count; j++) {
      const side = j % 2 === 0 ? -1 : 1
      const off = side * r0 * (2 + 1.4 * Math.floor(j / 2)) * (0.8 + 0.4 * rng())
      const ax = horizontal ? clamp(e.x + off, 0, width) : e.x
      const ay = horizontal ? e.y : clamp(e.y + off, 0, height)
      const rb: GoopBlob[] = []
      for (let i = 0; i < 12; i++) rb.push(renderer.createBlob())
      extra.push({
        ax,
        ay,
        end: { x: { x: ax, v: 0 }, y: { x: ay, v: 0 } },
        ox: (horizontal ? off * 0.25 : 0) + (rng() - 0.5) * r0,
        oy: (horizontal ? 0 : off * 0.25) + (rng() - 0.5) * r0,
        snapAt: 0.62 + 0.3 * rng(),
        scale: 0.55 + 0.25 * rng(),
        snapped: false,
        blobs: rb,
      })
    }
    taffy = {
      ax: e.x,
      ay: e.y,
      end: { x: { x: e.x, v: 0 }, y: { x: e.y, v: 0 } },
      target: { x, y },
      holding: true,
      blobs,
      extra,
    }
    wake()
  }

  const endTaffy = (): void => {
    if (!taffy) return
    for (const b of taffy.blobs) b.remove()
    for (const r of taffy.extra) for (const b of r.blobs) b.remove()
    taffy = null
  }

  /** Globby taffy geometry for the current pull. Volume flows into the cursor blob as the
   *  pull grows; the neck stays fat and lumpy and only thins late, near the snap length. */
  const taffyShape = (len: number) => {
    const g = tuning.globbiness
    const maxLen = tuning.taffyLength
    const p = Math.min(1, len / maxLen)
    const r0 = tuning.dripSize * (0.9 + 0.25 * Math.min(2, tuning.taffy)) * (1 + 0.5 * g)
    const rEnd = r0 * (1.05 + (0.35 + 0.45 * g) * p)
    const late = smoothstep(0.72, 1, p) // necking only near the snap
    const rNeck = r0 * (0.5 + 0.45 * g) * (1 - 0.55 * late)
    return { r0, rEnd, rNeck, g, p }
  }

  /** Snap: a big fat glob falls; the stub recoils into the body with a fat wobble. */
  const snapTaffy = (): void => {
    if (!taffy) return
    const t = taffy
    t.holding = false
    suppressClick = true
    const ex = t.end.x.x
    const ey = t.end.y.x
    const shape = taffyShape(Math.hypot(ex - t.ax, ey - t.ay))
    const vanish = gooVanishRadius(gooParamsOf(tuning))
    const drop = (x: number, y: number, r: number, k: number): void => {
      fluid.spawn({
        x,
        y,
        vx: t.end.x.v * 0.4 * k,
        vy: Math.max(0, t.end.y.v * 0.4 * k),
        r,
        oiliness: Math.max(tuning.oiliness, 0.8),
        gravity: tuning.gravity,
        vanish,
        viscosity: tuning.thickness,
      })
    }
    // The cursor glob, plus a couple of satellite lumps so it falls as one fat, wobbly mass.
    drop(ex, ey, shape.rEnd, 1)
    if (shape.g > 0.3) {
      drop(ex - shape.rEnd * 0.6, ey - shape.rEnd * 0.4, shape.rEnd * 0.6, 0.9)
      drop(ex + shape.rEnd * 0.5, ey - shape.rEnd * 0.5, shape.rEnd * 0.55, 0.95)
    }
    // Recoil from where it broke: the stub starts ~45% of the way back, moving fast.
    const dx = t.ax - ex
    const dy = t.ay - ey
    t.end.x.x = ex + dx * 0.45
    t.end.y.x = ey + dy * 0.45
    t.end.x.v = dx * 9
    t.end.y.v = dy * 9
    const n = Math.hypot(dx, dy) || 1
    const kick = react() * (1 + shape.g)
    jelly.tx.v -= (dx / n) * P.shockPush * kick * 0.8
    jelly.ty.v -= (dy / n) * P.shockPush * kick * 0.8
    jelly.dsx.v += 0.5 * kick
    jelly.dsy.v -= 0.35 * kick
    wake()
  }

  const stepTaffy = (dt: number, map: (x: number, y: number) => { x: number; y: number }): boolean => {
    const t = taffy
    if (!t) return false
    const maxLen = tuning.taffyLength
    if (t.holding) {
      // The end chases the pointer with a little viscous lag.
      const k = 1 - Math.exp(-dt / (P.taffyFollow * tuning.thickness))
      const nx = t.end.x.x + (t.target.x - t.end.x.x) * k
      const ny = t.end.y.x + (t.target.y - t.end.y.x) * k
      t.end.x.v = dt > 0 ? (nx - t.end.x.x) / dt : 0
      t.end.y.v = dt > 0 ? (ny - t.end.y.x) / dt : 0
      t.end.x.x = nx
      t.end.y.x = ny
      if (Math.hypot(nx - t.ax, ny - t.ay) > maxLen) snapTaffy()
    } else {
      stepSpring(t.end.x, t.ax, taffyCfg, dt)
      stepSpring(t.end.y, t.ay, taffyCfg, dt)
    }
    const ex = t.end.x.x
    const ey = t.end.y.x
    const len = Math.hypot(ex - t.ax, ey - t.ay)
    const ropesHome = t.extra.every(
      (r) => Math.hypot(r.end.x.x - r.ax, r.end.y.x - r.ay) < 0.6 && Math.hypot(r.end.x.v, r.end.y.v) < 20,
    )
    if (!t.holding && len < 0.6 && Math.hypot(t.end.x.v, t.end.y.v) < 20 && ropesHome) {
      endTaffy()
      return false
    }
    const vanish = gooVanishRadius(gooParamsOf(tuning))
    const { r0, rEnd, rNeck, g, p } = taffyShape(len)
    const grow = Math.min(1, len / (r0 * 0.8)) // fades in from the edge: no pop
    const neck = Math.max(vanish * 1.08, rNeck)
    // Fat rope: circles overlap generously so the filter melts them into one mass.
    const n = clamp(Math.ceil(len / (neck * 1.1)) + 2, 3, t.blobs.length)
    // Heavy goo sags more; it also wobbles a bit while held.
    const sag = P.taffySag * (1 + g) * p * (t.holding ? 1 : 0.4)
    // Clumps: a few bulbous lumps along the rope (fixed per pull so they don't shimmer).
    const clumps = Math.max(1, Math.round(len / (r0 * 3)))
    const a = map(t.ax, t.ay)
    for (let i = 0; i < t.blobs.length; i++) {
      const b = t.blobs[i]!
      if (i >= n) {
        b.set(ex, ey, 0)
        continue
      }
      const f = i / (n - 1)
      const x = a.x + (ex - a.x) * f
      const y = a.y + (ey - a.y) * f + sag * Math.sin(Math.PI * f)
      const lump = 1 + g * 0.4 * Math.max(0, Math.sin(f * Math.PI * clumps * 2 + 0.6)) * (1 - p * 0.5)
      // Root and cursor blob are the fattest; the neck between is fat and lumpy.
      const rootW = Math.pow(1 - f, 6)
      const endW = Math.pow(f, 5)
      const r = neck * lump * (1 - rootW - endW) + r0 * 1.15 * rootW + rEnd * endW
      b.set(x, y, Math.max(0, r) * grow)
    }
    // Secondary ropes: thinner, lagging a little, each snapping at its own length.
    for (const rope of t.extra) {
      const tx = t.holding && !rope.snapped ? ex + rope.ox : rope.ax
      const ty = t.holding && !rope.snapped ? ey + rope.oy : rope.ay
      if (t.holding && !rope.snapped) {
        const k = 1 - Math.exp(-dt / (P.taffyFollow * 1.8 * tuning.thickness))
        const nx = rope.end.x.x + (tx - rope.end.x.x) * k
        const ny = rope.end.y.x + (ty - rope.end.y.x) * k
        rope.end.x.v = dt > 0 ? (nx - rope.end.x.x) / dt : 0
        rope.end.y.v = dt > 0 ? (ny - rope.end.y.x) / dt : 0
        rope.end.x.x = nx
        rope.end.y.x = ny
        if (Math.hypot(nx - rope.ax, ny - rope.ay) > maxLen * rope.snapAt) {
          // Staggered release: this strand lets go first and drops a small glob.
          rope.snapped = true
          fluid.spawn({
            x: nx,
            y: ny,
            vx: rope.end.x.v * 0.3,
            vy: Math.max(0, rope.end.y.v * 0.3),
            r: r0 * rope.scale * 0.9,
            oiliness: Math.max(tuning.oiliness, 0.8),
            gravity: tuning.gravity,
            vanish,
            viscosity: tuning.thickness,
          })
          rope.end.x.v = (rope.ax - nx) * 9
          rope.end.y.v = (rope.ay - ny) * 9
          rope.end.x.x = nx + (rope.ax - nx) * 0.4
          rope.end.y.x = ny + (rope.ay - ny) * 0.4
        }
      } else {
        stepSpring(rope.end.x, rope.ax, taffyCfg, dt)
        stepSpring(rope.end.y, rope.ay, taffyCfg, dt)
      }
      const rx = rope.end.x.x
      const ry = rope.end.y.x
      const rl = Math.hypot(rx - rope.ax, ry - rope.ay)
      const alive = rl > 0.6 || Math.hypot(rope.end.x.v, rope.end.y.v) > 20
      const ra = map(rope.ax, rope.ay)
      const rn = Math.max(vanish * 1.05, neck * rope.scale)
      const m = clamp(Math.ceil(rl / (rn * 1.1)) + 2, 3, rope.blobs.length)
      const rgrow = alive ? Math.min(1, rl / (r0 * 0.8)) : 0
      for (let i = 0; i < rope.blobs.length; i++) {
        const b = rope.blobs[i]!
        if (i >= m || !alive) {
          b.set(rx, ry, 0)
          continue
        }
        const f = i / (m - 1)
        const x = ra.x + (rx - ra.x) * f
        const y = ra.y + (ry - ra.y) * f + sag * 0.8 * Math.sin(Math.PI * f)
        const rootW = Math.pow(1 - f, 6)
        const r = rn * (1 - rootW) + r0 * rope.scale * 1.1 * rootW
        b.set(x, y, r * rgrow)
      }
    }
    return true
  }

  // ---- reach (pre-contact bulge) -----------------------------------------------------
  let reachBlobs: GoopBlob[] = []
  const reachAmt: SpringState = { x: 0, v: 0 }
  const reachPt = { x: 0, y: 0, nx: 0, ny: 0, has: false }
  let reachCfg = springConfig(P.reachSpring, tuning.thickness)
  let reachLumpCfg = springConfig(P.reachLumpSpring, tuning.thickness)
  let reachShown = 0
  let reachGlobs: { slot: number; size: number; length: number; lag: number; lump: { x: SpringState; y: SpringState } | null }[] = []
  /** Client-space host rect, refreshed lazily (no per-frame layout reads). */
  let rect: DOMRect | null = null
  let rectAt = 0
  const hostRect = (): DOMRect => {
    const t = typeof performance !== 'undefined' ? performance.now() : 0
    if (!rect || t - rectAt > 400) {
      rect = host.getBoundingClientRect()
      rectAt = t
    }
    return rect
  }
  /** Distance (px) from the pointer to the host rect. */
  const pointerGap = (): number => {
    const s = pointer.sample()
    const r = hostRect()
    const dx = Math.max(r.left - s.x, 0, s.x - r.right)
    const dy = Math.max(r.top - s.y, 0, s.y - r.bottom)
    return Math.hypot(dx, dy)
  }
  function onTrackerMove(): void {
    if (destroyed || reduced || !visible || tuning.reach <= 0 || hovered || opts.disabled) {
      if (reachAmt.x > 0.01) wake()
      return
    }
    if (reachAmt.x > 0.01 || pointerGap() < tuning.reach) wake()
  }
  const stepReach = (dt: number, map: (x: number, y: number) => { x: number; y: number }): boolean => {
    let target = 0
    let cursor: { x: number; y: number } | null = null
    let toward = 0
    if (tuning.reach > 0 && !hovered && !pressed && canInteract() && visible) {
      const s = pointer.sample()
      const r = hostRect()
      const k = width ? r.width / width : 1
      const lx = (s.x - r.left) / k
      const ly = (s.y - r.top) / k
      // Nearest point on ANY edge: top, sides, bottom.
      const e = edgePoint(lx, ly)
      const gap = Math.hypot(lx - e.x, ly - e.y)
      if (gap > 0.5 && gap < tuning.reach) {
        const nx = (lx - e.x) / gap
        const ny = (ly - e.y) / gap
        toward = Math.max(0, -(s.vx * nx + s.vy * ny)) / P.speedRef
        target = Math.min(1.6, Math.pow(1 - gap / tuning.reach, 1.2) * (1 + toward * P.reachSpeedBoost) * react())
        const sm = reachPt.has ? 1 - Math.exp(-dt / 0.06) : 1
        reachPt.x += (e.x - reachPt.x) * sm
        reachPt.y += (e.y - reachPt.y) * sm
        reachPt.nx += (nx - reachPt.nx) * sm
        reachPt.ny += (ny - reachPt.ny) * sm
        reachPt.has = true
        cursor = { x: lx, y: ly }
      }
    }
    stepSpring(reachAmt, target, reachCfg, dt)
    // Rate-limited so lumps swell and melt back smoothly, never in a frame or two.
    const maxStep = P.reachMaxRate * dt
    reachShown += clamp(Math.max(0, reachAmt.x) - reachShown, -maxStep, maxStep)
    const amt = reachShown
    if (amt < 0.004 && target === 0 && Math.abs(reachAmt.v) < 0.05 && reachAmt.x < 0.004) {
      for (const b of reachBlobs) b.remove()
      reachBlobs = []
      reachPt.has = false
      reachGlobs = []
      return false
    }
    // Several globs: the main one at the nearest point, more fanning out along the edge as
    // the pointer gets nearer / faster. Each has its own seeded size, length and lag.
    const K = Math.max(1, Math.round(tuning.reachGlobs))
    if (reachGlobs.length !== K) {
      for (const b of reachBlobs) b.remove()
      reachBlobs = []
      const rng = seeded((opts.seed ?? stableSeed(host)) ^ 0x5eed)
      const v = tuning.dripVariance
      reachGlobs = Array.from({ length: K }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1
        return {
          slot: i === 0 ? 0 : side * Math.ceil(i / 2),
          size: i === 0 ? 1 : (0.55 + 0.3 * rng()) * (1 + (rng() - 0.5) * v * 0.4),
          length: i === 0 ? 1 : (0.5 + 0.45 * rng()) * (1 + (rng() - 0.5) * v * 0.5),
          lag: 1 + 0.6 * rng() * i,
          lump: null as { x: SpringState; y: SpringState } | null,
        }
      })
      for (let i = 0; i < K * 3; i++) reachBlobs.push(renderer.createBlob())
    }
    const g = tuning.globbiness
    const tanX = -reachPt.ny
    const tanY = reachPt.nx
    const am = Math.min(1.2, amt)
    let moving = !isSpringSettled(reachAmt, target, 0.003, 0.02) || Math.abs(reachShown - Math.max(0, reachAmt.x)) > 0.002
    for (let i = 0; i < K; i++) {
      const gl = reachGlobs[i]!
      // Secondary globs join as the pull grows (nearer / faster = more).
      const join = i === 0 ? 1 : smoothstep(0.02 + 0.1 * i, 0.5 + 0.1 * i, am + toward * 0.4)
      const a = am * join
      const swell = a < 0.39 ? a * 1.6 : Math.sqrt(a)
      const R = tuning.dripSize * tuning.reachSize * swell * gl.size
      const len = (P.reachBulge + R * (0.9 + 0.6 * g)) * Math.min(1.2, a) * gl.length
      // Anchor along the edge, kept on the element's edge.
      const spread = tuning.dripSize * tuning.reachSize * 1.1 * gl.slot
      const ep = edgePoint(reachPt.x + tanX * spread - reachPt.nx * 0.5, reachPt.y + tanY * spread - reachPt.ny * 0.5)
      let dx = reachPt.nx
      let dy = reachPt.ny
      if (cursor) {
        const cx = cursor.x - ep.x
        const cy = cursor.y - ep.y
        const cl = Math.hypot(cx, cy) || 1
        // Lean: mostly outward, partly toward the cursor (side globs converge on it).
        dx = reachPt.nx * 0.5 + (cx / cl) * 0.5
        dy = reachPt.ny * 0.5 + (cy / cl) * 0.5
        const dl = Math.hypot(dx, dy) || 1
        dx /= dl
        dy /= dl
      }
      const tx = ep.x + dx * len
      const ty = ep.y + dy * len
      if (!gl.lump) gl.lump = { x: { x: ep.x, v: 0 }, y: { x: ep.y, v: 0 } }
      stepSpring(gl.lump.x, tx, reachLumpCfg, dt / gl.lag)
      stepSpring(gl.lump.y, ty, reachLumpCfg, dt / gl.lag)
      const lx = gl.lump.x.x
      const ly = gl.lump.y.x
      const base = map(ep.x, ep.y)
      const lump = map(lx, ly)
      const mid = map(ep.x + (lx - ep.x) * 0.5, ep.y + (ly - ep.y) * 0.5)
      reachBlobs[i * 3]!.set(base.x, base.y, R * (0.7 + 0.2 * g))
      reachBlobs[i * 3 + 1]!.set(mid.x, mid.y, R * (0.55 + 0.35 * g))
      reachBlobs[i * 3 + 2]!.set(lump.x, lump.y, R)
      if (!isSpringSettled(gl.lump.x, tx, 0.05, 0.5) || !isSpringSettled(gl.lump.y, ty, 0.05, 0.5)) moving = true
    }
    // A pointer resting nearby keeps static lumps: stop ticking once settled
    // (pointer moves wake us again).
    return moving
  }

  // ---- sim -----------------------------------------------------------------
  function tick(frameDt: number): boolean {
    if (destroyed || reduced) return false
    const dt = frameDt * Math.max(0, opts.timeScale ?? 1)
    const s = pointer.sample()
    const r = react()

    // Click mass drains back to rest.
    mass *= Math.exp(-dt / tuning.clickGoopFade)
    if (mass < 0.005) mass = 0

    // Inertia: the goo lags OPPOSITE to the pointer's acceleration while hovered.
    if (hovered && prevV && dt > 0) {
      const k = P.sloshPerAccel * tuning.inertia * r
      slosh.x.v -= (s.vx - prevV.vx) * k
      slosh.y.v -= (s.vy - prevV.vy) * k * 0.6
    }
    prevV = hovered ? { vx: s.vx, vy: s.vy } : null
    // Page scroll sloshes it too (only while on screen).
    if (scroll && visible && tuning.scrollSlosh !== 0) {
      const sv = scroll.velocity().vy
      slosh.y.v -= (sv - prevScrollVy) * P.sloshPerScroll * tuning.scrollSlosh * r
      prevScrollVy = sv
    }
    const gx = gravityX()
    stepSpring(slosh.x, gx * P.tiltSlosh, sloshCfg, dt)
    stepSpring(slosh.y, 0, sloshCfg, dt)
    const sxo = clamp(slosh.x.x, -P.maxSlosh, P.maxSlosh)
    const syo = clamp(slosh.y.x, -P.maxSlosh, P.maxSlosh)

    // Press squash.
    const pressTarget = pressed ? 1 - tuning.squish : 1
    stepSpring(body, pressTarget, pressed ? pressCfg : releaseCfg, dt)

    // Jelly: lean toward the pointer and skew with its horizontal velocity while hovering.
    const leanX = hovered && ptr.has ? clamp((ptr.x - width / 2) / (width / 2 || 1), -1, 1) * P.leanPx * r : 0
    const leanY = hovered && ptr.has ? clamp((ptr.y - height / 2) / (height / 2 || 1), -1, 1) * P.leanPx * r * 0.5 : 0
    const skewT = hovered ? clamp(s.vx * P.skewPerVelocity * r, -P.maxSkew, P.maxSkew) : 0
    stepSpring(jelly.tx, leanX, jellyCfg, dt)
    stepSpring(jelly.ty, leanY, jellyCfg, dt)
    stepSpring(jelly.dsx, 0, jellyCfg, dt)
    stepSpring(jelly.dsy, 0, jellyCfg, dt)
    stepSpring(jelly.skew, skewT, jellyCfg, dt)
    stepSpring(jelly.swell, mass * P.massSwell, jellyCfg, dt)

    // Compose the body pose (slosh shifts and skews the mass toward its side).
    const swell = 1 + jelly.swell.x
    const pressSy = body.x
    const pressSx = 1 + (1 - pressSy) * P.squishSpread
    const sx = pressSx * (1 + clamp(jelly.dsx.x, -P.maxDeform, P.maxDeform)) * swell
    const sy = pressSy * (1 + clamp(jelly.dsy.x, -P.maxDeform, P.maxDeform)) * swell
    const full = !!renderer.setBodyTransform
    const tx = full ? clamp(jelly.tx.x + sxo * P.sloshBody, -P.maxOffset, P.maxOffset) : 0
    const ty = full ? clamp(jelly.ty.x + syo * P.sloshBody * 0.5, -P.maxOffset, P.maxOffset) : 0
    const skew = full ? clamp(jelly.skew.x - sxo * P.sloshSkew, -P.maxSkew, P.maxSkew) : 0
    if (full) renderer.setBodyTransform!({ tx, ty, skew, sx, sy })
    else renderer.setBodyScale(sx, sy)
    writeVars(tx, ty, skew, sx, sy)
    rideLabels(tx, ty, skew, sx, sy)

    // Continuous dripping while hovered.
    if (hovered && canInteract() && dripsOn()) {
      nextDrip -= dt
      if (nextDrip <= 0) {
        nextDrip = rhythmInterval()
        if (hoverDrips() < tuning.dripCount) {
          const lead = random() < 0.75 ? leadX(s) : undefined
          const x = pickX(takenXs(), lead, width * 0.15)
          if (x !== null) field.spawn(tuning, { x, random })
        }
      }
    }

    // Drips ride the deformed bottom edge; slosh swings them, feeds the leading side.
    const tan = Math.tan(skew * DEG)
    const map = (x: number, y: number) => {
      const dy = (y - height / 2) * sy
      return { x: width / 2 + tx + (x - width / 2) * sx + tan * dy, y: height / 2 + ty + dy }
    }
    const side = clamp(sxo / (P.maxSlosh * 0.5), -1, 1)
    const edge = edgeRange()
    const dripsMoving = field.step(dt, {
      tuning,
      width,
      height,
      sx,
      sy,
      pressed,
      anchor: (x) => map(x, height),
      sway: (sxo + gx * P.tiltSlosh * 0.5) * P.sloshSway,
      stretch: syo * P.sloshStretch,
      feedBoost: 1 + mass * P.massFeed,
      feedAt: side === 0 ? undefined : (x) => 1 + P.sloshFeedBias * side * clamp((x - width / 2) / (width / 2 || 1), -1, 1),
      flowTo: hovered && ptr.has ? ptr.x : undefined,
      flowPull: P.flowPull * tuning.flowToCursor * Math.min(1, r),
      edge,
      floor: tuning.puddles > 0 ? floorY() : undefined,
      onLand: tuning.puddles > 0 ? pool : undefined,
    })

    // Splash / shockwave particles in this layer (soft box ~nearReach past the edges).
    const reach = P.nearReach
    const pad = layerPadding(tuning, splashMode)
    fluid.floor = tuning.puddles > 0 ? floorY() : undefined
    fluid.onLand = tuning.puddles > 0 ? (l) => pool(l.x, l.y, l.r, l.vx) : null
    const fluidMoving = fluid.step(dt, {
      minX: -reach,
      minY: -reach,
      maxX: width + reach,
      maxY: height + Math.max(reach, pad.bottom - tuning.dripSize * 3),
    })
    const ripplesMoving = stepRipples(dt, map)
    // Resting drips breathe: a very slow, tiny swell, redrawn at a low rate (cheap).
    const breathing = tuning.idle > 0 && resting.length > 0 && visible
    if (breathing) {
      idleT += dt
      if (idleT - idleLast >= 1 / P.idleFps) {
        idleLast = idleT
        field.drawResting({ tuning, width, height }, resting, idleT)
      }
    }
    const puddlesMoving = puddles.step(dt)
    const taffyMoving = stepTaffy(dt, map)
    const reachMoving = stepReach(dt, map)

    // Oil film. By default it ignores the mouse: it drifts slowly on its own while the goo is
    // animating and rides the body's jelly translation (it is painted on the goo). With
    // --goop-oil-react > 0 the old pointer coupling (flow, slide, swirl) comes back, scaled.
    let sheenMoving = false
    if (finish === 'oil' && renderer.setSheen) {
      const sh = oilReact * r
      sheen.phase += (P.oilDrift + (s.vx * 0.93 + s.vy * 0.37) * 0.12 * sh) * dt
      const posT = sh > 0 && hovered && ptr.has ? (ptr.x - width / 2) * 0.5 * sh + (ptr.y - height / 2) * 0.3 * sh : 0
      const swirlT = P.oilSwirl + (sh > 0 ? Math.min(2, speedOf(s) * 1.2 * sh) : 0)
      const k = 1 - Math.exp(-dt / 0.25)
      sheen.pos += (posT - sheen.pos) * k
      sheen.swirl += (swirlT - sheen.swirl) * k
      renderer.setSheen({
        phase: sheen.phase + sheen.pos,
        swirl: sheen.swirl,
        vx: sh > 0 ? s.vx : 0,
        vy: sh > 0 ? s.vy : 0,
        ox: tx,
        oy: ty,
      })
      sheenMoving = Math.abs(posT - sheen.pos) > 0.05 || Math.abs(swirlT - sheen.swirl) > 0.01
    }
    renderer.flush()

    const bodyMoving =
      !isSpringSettled(body, pressTarget, 0.0005, 0.005) ||
      !isSpringSettled(jelly.tx, leanX, 0.02, 0.1) ||
      !isSpringSettled(jelly.ty, leanY, 0.02, 0.1) ||
      !isSpringSettled(jelly.dsx, 0, 0.0005, 0.005) ||
      !isSpringSettled(jelly.dsy, 0, 0.0005, 0.005) ||
      !isSpringSettled(jelly.skew, skewT, 0.02, 0.1) ||
      !isSpringSettled(jelly.swell, mass * P.massSwell, 0.0005, 0.005) ||
      !isSpringSettled(slosh.x, gx * P.tiltSlosh, 0.03, 0.2) ||
      !isSpringSettled(slosh.y, 0, 0.03, 0.2)
    return (
      bodyMoving ||
      dripsMoving ||
      fluidMoving ||
      ripplesMoving ||
      puddlesMoving ||
      breathing ||
      taffyMoving ||
      reachMoving ||
      sheenMoving ||
      mass > 0 ||
      (hovered && dripsOn()) ||
      (hovered && r > 0)
    )
  }

  const wake = (): void => {
    if (!destroyed && !reduced) wakeTicker(tick)
  }

  field.onDetach = () => {
    if (tuning.squish > 0) body.v -= P.detachRecoil
  }

  // Scroll slosh (shared passive listener) + visibility so off-screen elements stay asleep.
  const scroll: ScrollTracker | null = win ? trackScroll(doc, () => visible && tuning.scrollSlosh !== 0 && wake()) : null
  const IO = win?.IntersectionObserver
  const io = IO
    ? new IO((entries) => {
        for (const e of entries) visible = e.isIntersecting
        if (visible) wake()
      })
    : undefined
  io?.observe(host)

  const syncTilt = (): void => {
    if (opts.tilt && tuning.tiltStrength > 0 && win && !tiltTracker) tiltTracker = trackTilt(win, wake)
    else if ((!opts.tilt || tuning.tiltStrength <= 0) && tiltTracker) {
      tiltTracker.release()
      tiltTracker = null
    }
  }
  syncTilt()

  if (reduced) enterReduced()

  // ---- interactions ----------------------------------------------------------
  /** Kick the jelly springs with a pointer velocity. `exit` stretches instead of squashing. */
  const impact = (s: PointerSample, exit: boolean): void => {
    const r = react()
    if (r <= 0 || s.speed < 1) return
    const n = speedOf(s) * r
    const dx = s.vx / s.speed
    const dy = s.vy / s.speed
    const push = exit ? P.exitPull : P.impactPush
    jelly.tx.v += s.vx * push * r
    jelly.ty.v += s.vy * push * r
    if (exit) {
      // Pulled along the exit direction, then snaps back.
      jelly.dsx.v += Math.abs(dx) * n * P.exitStretch
      jelly.dsy.v += Math.abs(dy) * n * P.exitStretch
    } else {
      // Squashed along the travel axis, bulging across it; the mass sloshes forward.
      jelly.dsx.v += (-Math.abs(dx) + Math.abs(dy) * 0.5) * n * P.impactSquash
      jelly.dsy.v += (-Math.abs(dy) + Math.abs(dx) * 0.5) * n * P.impactSquash
      slosh.x.v += s.vx * P.sloshPerAccel * 0.5 * tuning.inertia * r
    }
  }

  /**
   * Momentum hit: a fast pointer entry / swipe / exit fires the same family as a click (edge
   * ripple, particle ring, jelly pulse, a bit of click goop) at the contact point, aimed along
   * the pointer velocity and scaled by speed (capped like a click). Rate-limited.
   * `hitEffect` picks shockwave, the punch-through glob, both, or nothing.
   */
  const hit = (x: number, y: number, vx: number, vy: number): boolean => {
    if (!canInteract() || hitEffect === 'none') return false
    const speed = Math.hypot(vx, vy)
    const n = speed / P.speedRef
    if (n < tuning.splashMinSpeed) return false
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    if (now - lastHit < P.hitCooldown * 1000) return false
    lastHit = now
    const over = Math.min(1.5, n - tuning.splashMinSpeed)
    if ((hitEffect === 'shockwave' || hitEffect === 'both') && tuning.shockwave > 0) {
      const strength = Math.min(tuning.shockwave * P.hitMaxStrength, tuning.shockwave * (P.hitBaseStrength + over * 0.6))
      if (tuning.clickGoop > 0) addGoop(tuning.clickGoop * P.hitGoop * Math.min(1, 0.6 + over), x)
      shockwave(clamp(x, 0, width), clamp(y, 0, height), strength, { vx, vy })
    }
    if (hitEffect === 'splash' || hitEffect === 'both') splashThrough(x, y, vx, vy)
    return true
  }

  const startHover = (x?: number, e?: { clientX: number; clientY: number }, y?: number): void => {
    if (!canInteract()) return
    if (e) pointer.feed(e)
    const s = pointer.sample()
    hovered = true
    prevV = { vx: s.vx, vy: s.vy }
    if (x !== undefined) {
      ptr.x = x
      ptr.y = y ?? ptr.y
      ptr.has = true
    }
    impact(s, false)
    // Hard enough: a momentum hit (click-like shockwave and/or punch-through glob).
    if (x !== undefined) hit(x, y ?? height / 2, s.vx, s.vy)
    if (dripsOn()) {
      field.setFed(true) // re-feed drips that were retracting: interruptible
      const sn = speedOf(s) * react()
      const live = hoverDrips()
      const want = Math.min(tuning.dripCount, 1 + Math.floor(sn * (tuning.dripCount - 1) * 0.6 + random() * 0.8))
      const taken = takenXs()
      const lead = leadX(s)
      for (let i = live, k = 0; i < want; i++, k++) {
        // Faster = tighter cluster ahead of the pointer.
        const spread = k === 0 ? P.pointerJitter : (width * 0.2) / (1 + sn)
        const px = pickX(taken, lead, spread)
        if (px === null) break
        taken.push(px)
        const delay = k === 0 ? random() * 0.04 : (k * P.spawnStagger * (0.5 + random())) / (1 + sn)
        field.spawn(tuning, {
          x: px,
          delay,
          random,
          sizeScale: 1 + P.burstSize * sn,
          swellScale: 1 / (1 + 0.4 * sn),
        })
      }
      nextDrip = rhythmInterval() + tuning.dripInterval * 0.3
    }
    wake()
  }

  const endHover = (e?: { clientX: number; clientY: number }): void => {
    if (e) pointer.feed(e)
    const s = pointer.sample()
    hovered = false
    prevV = null
    nextDrip = Number.POSITIVE_INFINITY
    if (canInteract()) {
      // A fast exit is a hit too, where the pointer left.
      if (ptr.has) hit(ptr.x, ptr.y, s.vx, s.vy)
      impact(s, true)
      // A fast exit heading down tears fat drips off and flings them along.
      const n = speedOf(s) * react()
      if (n > P.yankSpeed && s.vy > 0 && s.vy > Math.abs(s.vx) * 0.5) {
        for (const d of field.attached()) {
          if (d.m > P.yankFill) d.yank = { vx: s.vx * 0.15, vy: s.vy * 0.15 }
        }
      }
    }
    field.setFed(false)
    ptr.has = false
    wake()
  }

  const press = (): void => {
    if (!canInteract() || tuning.squish <= 0) return
    pressed = true
    wake()
  }
  const release = (): void => {
    if (!pressed) return
    pressed = false
    wake()
  }
  const tapDrip = (x?: number): void => {
    if (!canInteract() || !dripsOn()) return
    const px = pickX(takenXs(), x)
    if (px === null) return
    field.spawn(tuning, { x: px, forced: true, random })
    wake()
  }

  const addGoop = (amount: number = tuning.clickGoop, x?: number): void => {
    if (!canInteract() || amount <= 0) return
    mass = Math.min(P.maxMass, mass + amount)
    // A little pop of the swell spring so the gain reads as a gulp, not a scale step.
    jelly.swell.v += amount * P.massSwell * 6
    if (dripsOn()) {
      const near = x ?? (ptr.has ? ptr.x : undefined)
      const taken = takenXs()
      const px = pickX(taken, near, P.pointerJitter)
      if (px !== null) {
        taken.push(px)
        field.spawn(tuning, {
          x: px,
          forced: true,
          random,
          sizeScale: 1 + P.splashSizePerMass * mass,
          swellScale: P.splashSwellScale / P.tapSwellScale,
        })
      }
      if (mass > P.doubleSplashMass) {
        const side = random() < 0.5 ? -1 : 1
        const px2 = pickX(taken, (near ?? width / 2) + side * tuning.dripSize * P.minSpacing, tuning.dripSize)
        if (px2 !== null) {
          field.spawn(tuning, {
            x: px2,
            forced: true,
            random,
            delay: 0.05,
            sizeScale: 0.7 + P.splashSizePerMass * mass * 0.5,
            swellScale: P.splashSwellScale / P.tapSwellScale,
          })
        }
      }
    }
    if (hovered) nextDrip = Math.min(nextDrip, rhythmInterval())
    wake()
  }

  // ---- pointer wiring ------------------------------------------------------
  const hoverMQ = win?.matchMedia?.('(hover: hover)')
  const canHover = (): boolean => hoverMQ?.matches ?? true
  const local = (e: { clientX: number; clientY: number }): { x: number; y: number } | undefined => {
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return undefined
    // Undo any CSS scale on ancestors so coords are in host layout px.
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height }
  }

  let pressType = ''
  const onEnter = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' || !canHover()) return
    const p = local(e)
    startHover(p?.x, e, p?.y)
  }
  let pressId = -1
  let downAt = { x: 0, y: 0 }
  const isInside = (p?: { x: number; y: number }): boolean =>
    !!p && p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height
  const clearTaffyTimer = (): void => {
    if (taffyTimer) clearTimeout(taffyTimer)
    taffyTimer = null
  }
  const onMove = (e: PointerEvent): void => {
    // Taffy: while pressed (pointer captured), dragging off the edge pulls a string.
    if (pressed && e.pointerId === pressId && tuning.taffy > 0) {
      const p = local(e)
      if (p) {
        if (!taffyArmed && pressType === 'touch' && Math.hypot(p.x - downAt.x, p.y - downAt.y) > 10) clearTaffyTimer()
        if (taffyArmed && !taffy && !isInside(p) && canInteract()) startTaffy(p.x, p.y)
        if (taffy && taffy.holding) {
          taffy.target = p
          wake()
        }
      }
    }
    if (!hovered || e.pointerType !== 'mouse') return
    const p = local(e)
    if (p) {
      ptr.x = p.x
      ptr.y = p.y
      ptr.has = true
      // A fast swipe across the element is a hit (rate-limited inside hit()).
      if (!pressed) {
        const sm = pointer.sample()
        hit(p.x, p.y, sm.vx, sm.vy)
      }
    }
    wake()
  }
  const onLeave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && hovered) endHover(e)
  }
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!canInteract()) return
    pressType = e.pointerType
    pressId = e.pointerId
    downAt = local(e) ?? { x: width / 2, y: height / 2 }
    press()
    if (tuning.taffy > 0) {
      // Mouse/pen: drag-off pulls immediately. Touch: long-press first, so scrolling still works.
      clearTaffyTimer()
      taffyArmed = e.pointerType !== 'touch'
      if (!taffyArmed) taffyTimer = setTimeout(() => (taffyArmed = true), P.taffyLongPress * 1000)
      try {
        host.setPointerCapture?.(e.pointerId)
      } catch {
        // not capturable (synthetic event): fine, document listeners still see pointerup
      }
    }
    doc.addEventListener('pointerup', onUp, true)
    doc.addEventListener('pointercancel', onUp, true)
  }
  const onUp = (e: PointerEvent): void => {
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    clearTaffyTimer()
    taffyArmed = false
    release()
    // Releasing an unsnapped pull slurps it back with a big wobble.
    if (taffy && taffy.holding) {
      taffy.holding = false
      const k = react() * (1 + tuning.globbiness)
      jelly.dsy.v += 0.45 * k
      jelly.dsx.v -= 0.3 * k
      wake()
    }
    const p = local(e)
    // No layout (e.g. not rendered): fall back to where the event landed.
    const inside = p ? isInside(p) : host.contains(e.target as Node | null)
    // Native buttons don't click when released outside; with pointer capture the browser
    // would, so swallow it. A snapped string never clicks either.
    if (e.type === 'pointerup' && (!inside || suppressClick)) {
      suppressClick = true
      setTimeout(() => (suppressClick = false), 0)
    }
    if (e.type === 'pointerup' && inside && !suppressClick) {
      if (tuning.clickGoop > 0) addGoop(tuning.clickGoop, p?.x)
      else if (pressType !== 'mouse') tapDrip(p?.x)
      if (tuning.shockwave > 0) shockwave(p?.x ?? width / 2, p?.y ?? height / 2)
    }
    pressType = ''
    pressId = -1
  }
  const onClickCapture = (e: Event): void => {
    if (!suppressClick) return
    suppressClick = false
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  // Keyboard: a directional squish from the top on Space/Enter.
  let keyDown = ''
  const onKeyDown = (e: KeyboardEvent): void => {
    if (opts.keyboard === false || tuning.keyboard <= 0 || e.repeat || (e.key !== ' ' && e.key !== 'Enter') || !canInteract()) return
    keyDown = e.key
    const r = react()
    jelly.ty.v += P.keyPush * r
    jelly.dsy.v -= P.keySquash * r
    slosh.y.v += P.keyPush * 0.15 * tuning.inertia * r
    press()
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    if (!keyDown || e.key !== keyDown) return
    keyDown = ''
    release()
    if (tuning.clickGoop > 0) addGoop(tuning.clickGoop, width / 2)
    if (tuning.shockwave > 0) shockwave(width / 2, height * 0.25, tuning.shockwave * 0.7)
  }

  let listening = false
  const listen = (on: boolean): void => {
    if (on === listening) return
    listening = on
    const m = on ? 'addEventListener' : 'removeEventListener'
    host[m]('pointerenter', onEnter as EventListener)
    host[m]('pointermove', onMove as EventListener)
    host[m]('pointerleave', onLeave as EventListener)
    host[m]('pointerdown', onDown as EventListener)
    host[m]('keydown', onKeyDown as EventListener)
    host[m]('keyup', onKeyUp as EventListener)
    host[m]('click', onClickCapture, true)
    if (!on) {
      doc.removeEventListener('pointerup', onUp, true)
      doc.removeEventListener('pointercancel', onUp, true)
    }
  }
  listen(opts.interactive !== false)

  // ---- size tracking -------------------------------------------------------
  /** Resting drip layout: organic by default (a long one, a medium one, small bumps, jittered
   *  positions), deterministic per element via the seed. --goop-drip-variance 0 = uniform. */
  const restingSpecs = (): RestingDrip[] => {
    const v = tuning.dripVariance
    const rng = seeded(opts.seed ?? stableSeed(host))
    const ROLES = [
      { length: 1.7, size: 1.05, pinch: 0.35 },
      { length: 0.75, size: 0.9, pinch: 0.15 },
      { length: 0.3, size: 0.7, pinch: 0 },
      { length: 1.15, size: 0.95, pinch: 0.25 },
      { length: 0.45, size: 0.8, pinch: 0.05 },
    ]
    const vary = (base: number, role: number, spread: number): number =>
      (1 + (role - 1) * v) * (1 + (rng() * 2 - 1) * spread * v)
    const given = opts.restingDrips
    if (Array.isArray(given)) {
      return given.map((g, j) => {
        const o: RestingDrip = typeof g === 'number' ? { x: g } : g
        const role = ROLES[j % ROLES.length]!
        return {
          x: o.x,
          length: o.length ?? vary(1, role.length, 0.15),
          size: o.size ?? vary(1, role.size, 0.1),
          pinch: o.pinch ?? role.pinch * v,
          phase: o.phase ?? rng() * Math.PI * 2,
        }
      })
    }
    const n = tuning.restingDrips
    if (n <= 0) return []
    // Shuffle the roles across slots so the long one isn't always on the left.
    const order = Array.from({ length: n }, (_, j) => j).sort(() => rng() - 0.5)
    const [lo, hi] = edgeRange()
    const span = Math.max(1, hi - lo)
    return order.map((roleIdx, j) => {
      const role = ROLES[roleIdx % ROLES.length]!
      const slot = (j + 0.5) / n
      const jitter = (rng() * 2 - 1) * (0.4 / n) * v
      return {
        x: (lo + span * clamp(slot + jitter, 0, 1)) / Math.max(1, width),
        length: vary(1, role.length, 0.15),
        size: vary(1, role.size, 0.1),
        pinch: role.pinch * v,
        phase: rng() * Math.PI * 2,
      }
    })
  }
  let resting: RestingDrip[] = []
  let idleT = 0
  let idleLast = -1
  const drawResting = (): void => {
    resting = restingSpecs()
    field.drawResting({ tuning, width, height }, resting, reduced || tuning.idle <= 0 ? undefined : idleT)
    if (resting.length && tuning.idle > 0) wake()
  }
  drawResting()
  const RO = win?.ResizeObserver
  const ro = RO
    ? new RO(() => {
        readGeometry()
        renderer.setPadding(layerPadding(tuning, splashMode))
        drawResting()
        wake()
      })
    : undefined
  ro?.observe(host)

  // ---- hot renderer swap ------------------------------------------------------
  /** Replace the renderer in place (finish / renderer changed): live drips, particles,
   *  puddles, ripples, taffy and reach keep their sim state and are redrawn this frame. */
  const swapRenderer = (): void => {
    const old = renderer
    renderer = resolveRenderer(rendererKey)(host, filterParams(tuning))
    renderer.setPadding(layerPadding(tuning, splashMode))
    const make = (): GoopBlob => renderer.createBlob()
    field.rebind(renderer)
    fluid.rebind(make)
    puddles.rebind(make)
    for (const rp of ripples) for (const sl of rp.slots) {
      sl.blob.remove()
      sl.blob = make()
    }
    if (taffy) {
      taffy.blobs = taffy.blobs.map((b) => (b.remove(), make()))
      for (const rope of taffy.extra) rope.blobs = rope.blobs.map((b) => (b.remove(), make()))
    }
    reachBlobs = reachBlobs.map((b) => (b.remove(), make()))
    old.destroy()
    lastLabel = '\u0000'
    if (!reduced) tick(0)
    renderer.flush()
    wake()
  }

  // ---- handle --------------------------------------------------------------
  return {
    get layer() {
      return renderer.layer
    },
    get reducedMotion() {
      return reduced
    },
    get tuning() {
      return tuning
    },
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      const prev = tuning
      resolved = resolveTuning(host, opts)
      tuning = resolved.tuning
      splashMode = readSplashMode(host, opts.splash, resolved.preset)
      hitEffect = readHitEffect(host, opts.hitEffect, resolved.preset)
      if (splashMode !== 'escape' && escape) {
        escape.release()
        escape = null
      }
      if (splashMode !== 'near') fluid.clear()
      const nextKey = rendererChoice()
      if (nextKey !== rendererKey) {
        rendererKey = nextKey
        swapRenderer()
      } else if (
        prev.softness !== tuning.softness ||
        prev.edgeSharpness !== tuning.edgeSharpness ||
        prev.edge !== tuning.edge ||
        prev.gloss !== tuning.gloss
      ) {
        renderer.setParams(filterParams(tuning))
      }
      renderer.setPadding(layerPadding(tuning, splashMode))
      applyFinish()
      syncSprings()
      syncTilt()
      listen(opts.interactive !== false)
      readGeometry()
      drawResting()
      findLabels()
      lastLabel = '\u0000'
      rect = null
      gooColor = ''
      const r = computeReduced()
      if (r !== reduced) {
        reduced = r
        if (reduced) enterReduced()
      }
      if (opts.drips === false) field.clear()
      if (opts.disabled) {
        if (hovered) endHover()
        release()
      }
      wake()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      listen(false)
      ro?.disconnect()
      io?.disconnect()
      unwatchReduced()
      pointer.release()
      scroll?.release()
      tiltTracker?.release()
      escape?.release()
      escape = null
      removeTicker(tick)
      field.destroy()
      fluid.clear()
      clearRipples()
      puddles.clear()
      clearTaffyTimer()
      endTaffy()
      for (const b of reachBlobs) b.remove()
      reachBlobs = []
      rideLabels(0, 0, 0, 1, 1)
      for (const l of labels) l.style.transform = ''
      renderer.destroy()
      host.style.position = prevStyle.position
      host.style.isolation = prevStyle.isolation
      if (opts.cssVars) for (const v of ['x', 'y', 'skew', 'sx', 'sy']) host.style.removeProperty(`--goop-${v}`)
    },
    press,
    release,
    hover(on, x) {
      if (on) startHover(x)
      else if (hovered) endHover()
    },
    drip: tapDrip,
    addGoop,
    shockwave,
    splashThrough,
    feedPointer(e) {
      if (destroyed) return
      pointer.feed(e)
      const p = local(e)
      if (p) {
        ptr.x = p.x
        ptr.y = p.y
        ptr.has = true
      }
      wake()
    },
    inspect() {
      const s = pointer.sample()
      const g = opts.tilt && tiltTracker ? tiltTracker.gravity() : { x: 0, y: 1 }
      return {
        hovered,
        pressed,
        vx: s.vx,
        vy: s.vy,
        speed: speedOf(s),
        mass,
        drips: field.size,
        nextDrip: hovered ? Math.max(0, nextDrip) : Number.POSITIVE_INFINITY,
        sloshX: slosh.x.x,
        sloshY: slosh.y.x,
        gravityX: g.x * (opts.tilt ? tuning.tiltStrength : 0),
        gravityY: 1,
        scrollVy: scroll?.velocity().vy ?? 0,
        particles: fluid.count,
        splash: splashMode,
        preset: resolved.preset,
        puddles: puddles.count,
        taffy: !taffy ? 'none' : taffy.holding ? 'pulling' : 'retracting',
        reach: Math.max(0, reachAmt.x),
      }
    },
  }
}

