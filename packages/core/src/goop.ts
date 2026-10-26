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
import { clamp, isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
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
  if (t.taffy > 0) side = Math.max(side, Math.ceil(t.taffyLength + t.dripSize * 3 + t.softness * 3))
  if (t.reach > 0) side = Math.max(side, Math.ceil(P.reachBulge * 2 + t.dripSize * 3 + t.softness * 3))
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
  for (const k of TOGGLES) if (o[k] === true && tuning[k] <= 0) tuning[k] = GOOP_DEFAULTS[k]
  return { tuning, preset }
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
    taffy = {
      ax: e.x,
      ay: e.y,
      end: { x: { x: e.x, v: 0 }, y: { x: e.y, v: 0 } },
      target: { x, y },
      holding: true,
      blobs,
    }
    wake()
  }

  const endTaffy = (): void => {
    if (!taffy) return
    for (const b of taffy.blobs) b.remove()
    taffy = null
  }

  /** Snap: the far blob becomes a falling drop; the near part recoils with a wobble. */
  const snapTaffy = (): void => {
    if (!taffy) return
    const t = taffy
    t.holding = false
    suppressClick = true
    const ex = t.end.x.x
    const ey = t.end.y.x
    fluid.spawn({
      x: ex,
      y: ey,
      vx: t.end.x.v * 0.4,
      vy: Math.max(0, t.end.y.v * 0.4),
      r: tuning.dripSize * 1.05,
      oiliness: tuning.oiliness,
      gravity: tuning.gravity,
      vanish: gooVanishRadius(gooParamsOf(tuning)),
      viscosity: tuning.thickness,
    })
    // Recoil from where it broke: the stub starts ~40% of the way back, moving fast.
    const dx = t.ax - ex
    const dy = t.ay - ey
    t.end.x.x = ex + dx * 0.4
    t.end.y.x = ey + dy * 0.4
    t.end.x.v = dx * 8
    t.end.y.v = dy * 8
    const n = Math.hypot(dx, dy) || 1
    jelly.tx.v -= (dx / n) * P.shockPush * react() * 0.8
    jelly.ty.v -= (dy / n) * P.shockPush * react() * 0.8
    jelly.dsx.v += 0.4 * react()
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
    if (!t.holding && len < 0.6 && Math.hypot(t.end.x.v, t.end.y.v) < 20) {
      endTaffy()
      return false
    }
    // Volume ~ r^2 * length: the string thins as it stretches, but stays visible.
    const vanish = gooVanishRadius(gooParamsOf(tuning))
    const r0 = tuning.dripSize * (0.9 + 0.25 * Math.min(2, tuning.taffy))
    const vol = r0 * r0 * r0 * 3
    const rMid = Math.max(vanish * 1.08, Math.min(r0, Math.sqrt(vol / Math.max(len, r0 * 3))))
    const grow = Math.min(1, len / (r0 * 0.8)) // fades in from the edge: no pop
    const n = clamp(Math.ceil(len / (rMid * 1.4)) + 2, 3, t.blobs.length)
    const sag = P.taffySag * Math.min(1, len / maxLen) * (t.holding ? 1 : 0.4)
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
      // Thick at the root and the end blob, thin in the middle.
      const ends = Math.pow(Math.abs(2 * f - 1), 3)
      const rEnd = f < 0.5 ? r0 * 1.1 : r0 * 0.95
      b.set(x, y, (rMid + (rEnd - rMid) * ends) * grow)
    }
    return true
  }

  // ---- reach (pre-contact bulge) -----------------------------------------------------
  let reachBlobs: GoopBlob[] = []
  const reachAmt: SpringState = { x: 0, v: 0 }
  const reachPt = { x: 0, y: 0, nx: 0, ny: 0, has: false }
  let reachCfg = springConfig(P.reachSpring, tuning.thickness)
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
    if (tuning.reach > 0 && !hovered && !pressed && canInteract() && visible) {
      const s = pointer.sample()
      const r = hostRect()
      const k = width ? r.width / width : 1
      const lx = (s.x - r.left) / k
      const ly = (s.y - r.top) / k
      const e = edgePoint(lx, ly)
      const gap = Math.hypot(lx - e.x, ly - e.y)
      if (gap > 0.5 && gap < tuning.reach) {
        const nx = (lx - e.x) / gap
        const ny = (ly - e.y) / gap
        const toward = Math.max(0, -(s.vx * nx + s.vy * ny)) / P.speedRef
        target = Math.min(1.6, Math.pow(1 - gap / tuning.reach, 2) * (1 + toward * P.reachSpeedBoost) * react())
        const sm = reachPt.has ? 1 - Math.exp(-dt / 0.05) : 1
        reachPt.x += (e.x - reachPt.x) * sm
        reachPt.y += (e.y - reachPt.y) * sm
        reachPt.nx += (nx - reachPt.nx) * sm
        reachPt.ny += (ny - reachPt.ny) * sm
        reachPt.has = true
      }
    }
    stepSpring(reachAmt, target, reachCfg, dt)
    const amt = Math.max(0, reachAmt.x)
    if (amt < 0.004 && target === 0 && Math.abs(reachAmt.v) < 0.05) {
      for (const b of reachBlobs) b.remove()
      reachBlobs = []
      reachPt.has = false
      return false
    }
    if (!reachBlobs.length) reachBlobs = [renderer.createBlob(), renderer.createBlob()]
    const base = map(reachPt.x, reachPt.y)
    const len = P.reachBulge * amt
    const rr = tuning.dripSize * P.reachSize * Math.sqrt(Math.min(1, amt))
    reachBlobs[0]!.set(base.x + reachPt.nx * len * 0.35, base.y + reachPt.ny * len * 0.35, rr)
    reachBlobs[1]!.set(base.x + reachPt.nx * len, base.y + reachPt.ny * len, rr * 0.75)
    // A pointer resting nearby keeps a static bulge: stop ticking once it has settled
    // (pointer moves wake us again).
    return !isSpringSettled(reachAmt, target, 0.003, 0.02)
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
    // Hard enough: punch through and splash out the far side.
    const n = s.speed / P.speedRef
    if (x !== undefined && n >= tuning.splashMinSpeed) splashThrough(x, y ?? height / 2, s.vx, s.vy)
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
    // Releasing an unsnapped string retracts it springily.
    if (taffy && taffy.holding) {
      taffy.holding = false
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
    if (taffy) taffy.blobs = taffy.blobs.map((b) => (b.remove(), make()))
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

