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
  GOOP_DEFAULT_SPLASH,
  GOOP_FINISH_VAR,
  GOOP_PHYSICS,
  GOOP_SPLASH_VAR,
  type GoopSplashMode,
  type GoopTuning,
} from './constants'
import { DripField } from './drips'
import { gooVanishRadius } from './filter'
import { ParticleFluid, fluidParams, type ParticleSpawn } from './fluid'
import { removeTicker, wakeTicker } from './loop'
import { trackScroll, trackTilt, type ScrollTracker, type TiltTracker } from './motion'
import { acquireEscapeLayer, type EscapeLease, type GoopOverlayFactory } from './overlay'
import { trackPointer, type PointerSample } from './pointer'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import {
  createSvgFilterRenderer,
  type GoopBlob,
  type GoopFinishKind,
  type GoopRenderer,
  type GoopRendererFactory,
} from './renderer'
import { clamp, isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readTuning } from './tuning'

const P = GOOP_PHYSICS

export interface GoopOptions extends Partial<Omit<GoopTuning, 'restingDrips'>> {
  /** Static resting drips: a count (evenly spaced) or x positions as 0..1 fractions of the
   *  width. Also `--goop-resting-drips` (count only). */
  restingDrips?: number | number[]
  /** Surface finish: 'solid' (default) or thin-film 'oil' iridescence. Also `--goop-finish`.
   *  Tune with --goop-oil-intensity / --goop-oil-scale / --goop-oil-shift. */
  finish?: GoopFinishKind
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
  /** Swap the renderer (default: SVG filter). */
  renderer?: GoopRendererFactory
  /** RNG for drip placement/jitter (inject a seeded one for tests). Default Math.random. */
  random?: () => number
  /** Where splash / shockwave particles go: 'near' (default; stay within ~70px, inside this
   *  element's layer), 'escape' (fly across the page in a shared overlay), or 'off'.
   *  Also settable from CSS: `--goop-splash: escape`. The option wins. */
  splash?: GoopSplashMode
  /** Swap the shared escape overlay (default: SVG filter overlay). */
  overlay?: GoopOverlayFactory
  /** Space/Enter on the focused host squishes from the top and adds goop. Default true. */
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
  /** Click shockwave at (x, y) host px (default center): particle ring + edge ripple. */
  shockwave(x?: number, y?: number, strength?: number): void
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

const filterParams = (t: GoopTuning) => ({ blur: t.blur, contrast: t.contrast, threshold: t.threshold })

function layerPadding(t: GoopTuning, splash: GoopSplashMode): { side: number; bottom: number } {
  const maxSize = t.dripSize * (1 + P.sizeJitter) * (1 + P.burstSize * 2 + P.splashSizePerMass * P.maxMass)
  let side = Math.ceil(t.blur * 3 + maxSize * 2 + P.maxOffset + 4)
  const reach = t.dripLength + maxSize * 2 + P.maxSlosh
  const fall = t.fall * (1 + P.fallJitter) * (1 + P.dropMaxStretch)
  let bottom = Math.ceil(side + reach + fall)
  if (splash === 'near' && (t.splashAmount > 0 || t.shockwave > 0)) {
    // Room for particles to fly ~nearReach px past any edge, then drip.
    side = Math.max(side, Math.ceil(P.nearReach + t.blur * 3 + t.dripSize * 2))
    bottom = Math.max(bottom, Math.ceil(side + t.fall))
  }
  return { side, bottom }
}

const spring = (x = 0): SpringState => ({ x, v: 0 })
const DEG = Math.PI / 180

function readFinish(host: Element, opt: GoopFinishKind | undefined): GoopFinishKind {
  if (opt) return opt
  const raw = host.ownerDocument?.defaultView?.getComputedStyle?.(host)?.getPropertyValue(GOOP_FINISH_VAR)?.trim()
  return raw === 'oil' ? 'oil' : 'solid'
}

/** Numeric tuning overrides from options (array-valued restingDrips is handled separately). */
const tuningOverrides = (o: GoopOptions): Partial<GoopTuning> => {
  const { restingDrips, ...rest } = o
  return { ...rest, restingDrips: Array.isArray(restingDrips) ? undefined : restingDrips } as Partial<GoopTuning>
}

function readSplashMode(host: Element, opt: GoopSplashMode | undefined): GoopSplashMode {
  if (opt) return opt
  const raw = host.ownerDocument?.defaultView?.getComputedStyle?.(host)?.getPropertyValue(GOOP_SPLASH_VAR)?.trim()
  return raw === 'escape' || raw === 'off' || raw === 'near' ? raw : GOOP_DEFAULT_SPLASH
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
  let tuning = readTuning(host, tuningOverrides(opts))
  let splashMode = readSplashMode(host, opts.splash)
  let finish = readFinish(host, opts.finish)
  const random = (): number => (opts.random ?? Math.random)()

  // ---- host setup ----------------------------------------------------------
  const prevStyle = { position: host.style.position, isolation: host.style.isolation }
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const renderer: GoopRenderer = (opts.renderer ?? createSvgFilterRenderer)(host, filterParams(tuning))
  renderer.setPadding(layerPadding(tuning, splashMode))
  const field = new DripField(renderer)
  const applyFinish = (): void =>
    renderer.setFinish?.({
      kind: finish,
      intensity: tuning.oilIntensity,
      scale: tuning.oilScale,
      shift: tuning.oilShift,
    })
  applyFinish()
  /** Oil film flow state. */
  const sheen = { phase: 0, pos: 0, swirl: 0 }
  const fluid = new ParticleFluid(() => renderer.createBlob())
  const pointer = trackPointer(doc)
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

  let pressCfg = springConfig(P.pressSpring, tuning.viscosity)
  let releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)
  let jellyCfg = springConfig(P.jellySpring, tuning.viscosity)
  let sloshCfg = springConfig(P.sloshSpring, tuning.viscosity)
  const syncSprings = (): void => {
    pressCfg = springConfig(P.pressSpring, tuning.viscosity)
    releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)
    jellyCfg = springConfig(P.jellySpring, tuning.viscosity)
    sloshCfg = springConfig(P.sloshSpring, tuning.viscosity)
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
    pressed = false
    hovered = false
    nextDrip = Number.POSITIVE_INFINITY
    resetMotion()
    sheen.pos = 0
    sheen.swirl = 0
    if (finish === 'oil') renderer.setSheen?.({ phase: sheen.phase, swirl: 0.3, vx: 0, vy: 0 })
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
  const react = (): number => tuning.reactivity
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
    if (!escape) escape = acquireEscapeLayer(doc, opts.overlay, filterParams(tuning))
    return escape
  }
  const particleRoom = (): number =>
    splashMode === 'escape' ? ensureEscape().room() : splashMode === 'near' ? fluid.room() : 0

  /** Launch one particle from host-space (x, y) along (dx, dy) at `speed` px/s. */
  const launch = (x: number, y: number, dx: number, dy: number, speed: number, rand: number): void => {
    const fp = fluidParams(tuning.oiliness, tuning.viscosity)
    const r = tuning.dripSize * fp.size * (0.8 + 0.4 * rand)
    const base: Omit<ParticleSpawn, 'x' | 'y' | 'vx' | 'vy'> = {
      r,
      oiliness: tuning.oiliness,
      gravity: tuning.gravity,
      gravityX: gravityX() * tuning.gravity * P.tiltGravity,
      vanish: gooVanishRadius(tuning),
      viscosity: tuning.viscosity,
      rand,
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
    const over = Math.max(0, n - tuning.splashThreshold)
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
    for (let i = 0; i < count; i++) {
      const a = base + (random() * 2 - 1) * cone
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const r = random()
      // Emerge just outside the far edge, slightly staggered along the ray (a stream, not a dot).
      const off = tuning.dripSize * (0.3 + 1.2 * random())
      // Oil launches with a wider speed spread so cohesion stretches it into strings.
      const spread = 0.35 + 0.35 * tuning.oiliness
      launch(exit.x + ux * off, exit.y + uy * off, ux, uy, sp * (1 - spread + 2 * spread * r), r)
    }
    // The far side bulges out with the punch.
    jelly.tx.v += dx * P.shockPush * 1.5 * react()
    jelly.ty.v += dy * P.shockPush * 1.5 * react()
    wake()
  }

  const shockwave = (x = width / 2, y = height / 2, strength = tuning.shockwave): void => {
    if (!canInteract() || strength <= 0) return
    const r = react()
    const s = pointer.sample()
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

  // ---- sim -----------------------------------------------------------------
  function tick(frameDt: number): boolean {
    if (destroyed || reduced) return false
    const dt = frameDt * Math.max(0, opts.timeScale ?? 1)
    const s = pointer.sample()
    const r = react()

    // Click mass drains back to rest.
    mass *= Math.exp(-dt / tuning.massDecay)
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
      flowPull: P.flowPull * tuning.flow * Math.min(1, r),
      edge,
    })

    // Splash / shockwave particles in this layer (soft box ~nearReach past the edges).
    const reach = P.nearReach
    const pad = layerPadding(tuning, splashMode)
    const fluidMoving = fluid.step(dt, {
      minX: -reach,
      minY: -reach,
      maxX: width + reach,
      maxY: height + Math.max(reach, pad.bottom - tuning.dripSize * 3),
    })
    const ripplesMoving = stepRipples(dt, map)

    // Oil film: bands flow along the pointer's motion, slide with its position, swirl with speed.
    let sheenMoving = false
    if (finish === 'oil' && renderer.setSheen) {
      const sh = tuning.oilShift * r
      sheen.phase += (s.vx * 0.93 + s.vy * 0.37) * 0.12 * sh * dt
      const posT = hovered && ptr.has ? (ptr.x - width / 2) * 0.5 * sh + (ptr.y - height / 2) * 0.3 * sh : 0
      const swirlT = Math.min(2, speedOf(s) * 1.2 * sh + Math.hypot(sxo, syo) / P.maxSlosh)
      const k = 1 - Math.exp(-dt / 0.25)
      sheen.pos += (posT - sheen.pos) * k
      sheen.swirl += (swirlT - sheen.swirl) * k
      renderer.setSheen({ phase: sheen.phase + sheen.pos, swirl: sheen.swirl, vx: s.vx, vy: s.vy })
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
    if (x !== undefined && n >= tuning.splashThreshold) splashThrough(x, y ?? height / 2, s.vx, s.vy)
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

  const addGoop = (amount: number = tuning.clickMass, x?: number): void => {
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
  const onMove = (e: PointerEvent): void => {
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
    press()
    doc.addEventListener('pointerup', onUp, true)
    doc.addEventListener('pointercancel', onUp, true)
  }
  const onUp = (e: PointerEvent): void => {
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    release()
    if (e.type === 'pointerup' && host.contains(e.target as Node | null)) {
      const p = local(e)
      if (tuning.clickMass > 0) addGoop(tuning.clickMass, p?.x)
      else if (pressType !== 'mouse') tapDrip(p?.x)
      if (tuning.shockwave > 0) shockwave(p?.x ?? width / 2, p?.y ?? height / 2)
    }
    pressType = ''
  }

  // Keyboard: a directional squish from the top on Space/Enter.
  let keyDown = ''
  const onKeyDown = (e: KeyboardEvent): void => {
    if (opts.keyboard === false || e.repeat || (e.key !== ' ' && e.key !== 'Enter') || !canInteract()) return
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
    if (tuning.clickMass > 0) addGoop(tuning.clickMass, width / 2)
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
    if (!on) {
      doc.removeEventListener('pointerup', onUp, true)
      doc.removeEventListener('pointercancel', onUp, true)
    }
  }
  listen(opts.interactive !== false)

  // ---- size tracking -------------------------------------------------------
  const drawResting = (): void =>
    field.drawResting({ tuning, width, height }, Array.isArray(opts.restingDrips) ? opts.restingDrips : undefined)
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

  // ---- handle --------------------------------------------------------------
  return {
    layer: renderer.layer,
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
      tuning = readTuning(host, tuningOverrides(opts))
      splashMode = readSplashMode(host, opts.splash)
      finish = readFinish(host, opts.finish)
      if (splashMode !== 'escape' && escape) {
        escape.release()
        escape = null
      }
      if (splashMode !== 'near') fluid.clear()
      if (prev.blur !== tuning.blur || prev.contrast !== tuning.contrast || prev.threshold !== tuning.threshold) {
        renderer.setParams(filterParams(tuning))
      }
      renderer.setPadding(layerPadding(tuning, splashMode))
      applyFinish()
      syncSprings()
      syncTilt()
      listen(opts.interactive !== false)
      readGeometry()
      drawResting()
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
      }
    },
  }
}

