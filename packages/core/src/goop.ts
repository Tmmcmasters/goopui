// attachGoop: turn any positioned-ish element into a goo body that drips, squishes, and
// reacts to how the pointer moves.
//
// Layering: the host gets `isolation: isolate` (and `position: relative` if it was static).
// An aria-hidden goo layer sits at z-index -1 inside it, so the host's real content (label,
// icon) paints ABOVE the goo, unfiltered and crisp. The layer is padded beyond the host so
// hanging/falling drips stay inside the filter region. Drips never affect layout.
//
// Motion model (all springs are closed-form, dt-based; see spring.ts):
//   press     : vertical squash spring (pointerdown), bouncy rebound on release
//   jelly     : translate (tx, ty), extra squash/stretch (dsx, dsy), and skew springs.
//               Kicked by pointer entry/exit velocity, pulled toward the pointer while
//               hovering (lean), skewed by horizontal pointer velocity (wobble).
//   swell     : spring toward click mass * massSwell (clicks add goop, decays over time)
//   drips     : DripField; continuous rhythm while hovered, splash drips on click,
//               bulbs sway with pointer velocity, fast downward exits yank drips off.

import { GOOP_PHYSICS, type GoopTuning } from './constants'
import { DripField } from './drips'
import { removeTicker, wakeTicker } from './loop'
import { trackPointer, type PointerSample } from './pointer'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { createSvgFilterRenderer, type GoopRenderer, type GoopRendererFactory } from './renderer'
import { clamp, isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readTuning } from './tuning'

const P = GOOP_PHYSICS

export interface GoopOptions extends Partial<GoopTuning> {
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
  /** What is driving the goo right now (pointer velocity, mass, ...). */
  inspect(): GoopDebugState
  /** The aria-hidden goo layer element. */
  readonly layer: HTMLElement
  /** Whether the instance is currently in reduced-motion (static) mode. */
  readonly reducedMotion: boolean
  /** Resolved tuning currently in use. */
  readonly tuning: Readonly<GoopTuning>
}

const filterParams = (t: GoopTuning) => ({ blur: t.blur, contrast: t.contrast, threshold: t.threshold })

function layerPadding(t: GoopTuning): { side: number; bottom: number } {
  const maxSize = t.dripSize * (1 + P.sizeJitter) * (1 + P.burstSize * 2 + P.splashSizePerMass * P.maxMass)
  const side = Math.ceil(t.blur * 3 + maxSize * 2 + P.maxOffset + 4)
  const reach = t.dripLength + maxSize * 2
  const fall = t.fall * (1 + P.fallJitter) * (1 + P.dropMaxStretch)
  return { side, bottom: Math.ceil(side + reach + fall) }
}

const spring = (x = 0): SpringState => ({ x, v: 0 })
const DEG = Math.PI / 180

export function attachGoop(host: HTMLElement, options: GoopOptions = {}): GoopHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: GoopOptions = { ...options }
  let tuning = readTuning(host, opts)
  const random = (): number => (opts.random ?? Math.random)()

  // ---- host setup ----------------------------------------------------------
  const prevStyle = { position: host.style.position, isolation: host.style.isolation }
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const renderer: GoopRenderer = (opts.renderer ?? createSvgFilterRenderer)(host, filterParams(tuning))
  renderer.setPadding(layerPadding(tuning))
  const field = new DripField(renderer)
  const pointer = trackPointer(doc)

  // ---- state ---------------------------------------------------------------
  let width = host.offsetWidth
  let height = host.offsetHeight
  let cornerRadius = 0
  const body = spring(1) // press: vertical scale
  const jelly = { tx: spring(), ty: spring(), dsx: spring(), dsy: spring(), skew: spring(), swell: spring() }
  let mass = 0
  let pressed = false
  let hovered = false
  let destroyed = false
  let nextDrip = Number.POSITIVE_INFINITY
  /** Last pointer position over the host, in host px. */
  const ptr = { x: 0, y: 0, has: false }

  let pressCfg = springConfig(P.pressSpring, tuning.viscosity)
  let releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)
  let jellyCfg = springConfig(P.jellySpring, tuning.viscosity)
  const syncSprings = (): void => {
    pressCfg = springConfig(P.pressSpring, tuning.viscosity)
    releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)
    jellyCfg = springConfig(P.jellySpring, tuning.viscosity)
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

  const resetMotion = (): void => {
    body.x = 1
    body.v = 0
    for (const s of Object.values(jelly)) {
      s.x = 0
      s.v = 0
    }
    mass = 0
    renderer.setBodyTransform?.({ tx: 0, ty: 0, skew: 0, sx: 1, sy: 1 })
    renderer.setBodyScale(1, 1)
  }

  // ---- reduced motion ------------------------------------------------------
  const computeReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = computeReduced()

  const enterReduced = (): void => {
    field.clear()
    pressed = false
    hovered = false
    nextDrip = Number.POSITIVE_INFINITY
    resetMotion()
    renderer.flush()
    removeTicker(tick)
  }
  if (reduced) enterReduced()

  const unwatchReduced = watchReducedMotion(doc, () => {
    const next = computeReduced()
    if (next === reduced) return
    reduced = next
    if (reduced) enterReduced()
  })

  // ---- helpers ---------------------------------------------------------------
  const react = (): number => tuning.reactivity
  const speedOf = (s: PointerSample): number => Math.min(2, s.speed / P.speedRef)
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

  /** Where the pointer is heading along the bottom edge (host px), if known. */
  const leadX = (s: PointerSample): number | undefined =>
    ptr.has ? ptr.x + s.vx * P.leadTime * Math.min(1, react()) : undefined

  // ---- sim -----------------------------------------------------------------
  function tick(dt: number): boolean {
    if (destroyed || reduced) return false
    const s = pointer.sample()
    const r = react()

    // Click mass drains back to rest.
    mass *= Math.exp(-dt / tuning.massDecay)
    if (mass < 0.005) mass = 0

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

    // Compose the body pose.
    const swell = 1 + jelly.swell.x
    const pressSy = body.x
    const pressSx = 1 + (1 - pressSy) * P.squishSpread
    const sx = pressSx * (1 + clamp(jelly.dsx.x, -P.maxDeform, P.maxDeform)) * swell
    const sy = pressSy * (1 + clamp(jelly.dsy.x, -P.maxDeform, P.maxDeform)) * swell
    const full = !!renderer.setBodyTransform
    const tx = full ? clamp(jelly.tx.x, -P.maxOffset, P.maxOffset) : 0
    const ty = full ? clamp(jelly.ty.x, -P.maxOffset, P.maxOffset) : 0
    const skew = full ? clamp(jelly.skew.x, -P.maxSkew, P.maxSkew) : 0
    if (full) renderer.setBodyTransform!({ tx, ty, skew, sx, sy })
    else renderer.setBodyScale(sx, sy)

    // Continuous dripping while hovered.
    if (hovered && canInteract() && dripsOn()) {
      nextDrip -= dt
      if (nextDrip <= 0) {
        nextDrip = rhythmInterval()
        if (hoverDrips() < tuning.dripCount) {
          const lead = random() < 0.65 ? leadX(s) : undefined
          const x = pickX(takenXs(), lead, width * 0.15)
          if (x !== null) field.spawn(tuning, { x, random })
        }
      }
    }

    // Drips ride the deformed bottom edge.
    const tan = Math.tan(skew * DEG)
    const halfH = (height / 2) * sy
    const dripsMoving = field.step(dt, {
      tuning,
      width,
      height,
      sx,
      sy,
      pressed,
      anchor: (x) => ({ x: width / 2 + tx + (x - width / 2) * sx + tan * halfH, y: height / 2 + ty + halfH }),
      sway: hovered ? s.vx * P.swayPerVelocity * r : 0,
      feedBoost: 1 + mass * P.massFeed,
    })
    renderer.flush()

    const bodyMoving =
      !isSpringSettled(body, pressTarget, 0.0005, 0.005) ||
      !isSpringSettled(jelly.tx, leanX, 0.02, 0.1) ||
      !isSpringSettled(jelly.ty, leanY, 0.02, 0.1) ||
      !isSpringSettled(jelly.dsx, 0, 0.0005, 0.005) ||
      !isSpringSettled(jelly.dsy, 0, 0.0005, 0.005) ||
      !isSpringSettled(jelly.skew, skewT, 0.02, 0.1) ||
      !isSpringSettled(jelly.swell, mass * P.massSwell, 0.0005, 0.005)
    // Keep ticking while hovered (rhythm + velocity-driven lean) or while mass drains.
    return bodyMoving || dripsMoving || mass > 0 || (hovered && dripsOn()) || (hovered && r > 0)
  }

  const wake = (): void => {
    if (!destroyed && !reduced) wakeTicker(tick)
  }

  field.onDetach = () => {
    if (tuning.squish > 0) body.v -= P.detachRecoil
  }

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
      // Squashed along the travel axis, bulging across it.
      jelly.dsx.v += (-Math.abs(dx) + Math.abs(dy) * 0.5) * n * P.impactSquash
      jelly.dsy.v += (-Math.abs(dy) + Math.abs(dx) * 0.5) * n * P.impactSquash
    }
  }

  const startHover = (x?: number, e?: { clientX: number; clientY: number }): void => {
    if (!canInteract()) return
    if (e) pointer.feed(e)
    const s = pointer.sample()
    hovered = true
    if (x !== undefined) {
      ptr.x = x
      ptr.has = true
    }
    impact(s, false)
    if (dripsOn()) {
      field.setFed(true) // re-feed drips that were retracting: interruptible
      const n = speedOf(s) * react()
      const live = hoverDrips()
      const want = Math.min(tuning.dripCount, 1 + Math.floor(n * (tuning.dripCount - 1) * 0.6 + random() * 0.8))
      const taken = takenXs()
      const lead = leadX(s)
      for (let i = live, k = 0; i < want; i++, k++) {
        const px = pickX(taken, k === 0 ? lead : undefined, k === 0 ? P.pointerJitter : width * 0.2)
        if (px === null) break
        taken.push(px)
        const delay = k === 0 ? random() * 0.04 : k * P.spawnStagger * (0.5 + random()) / (1 + n)
        field.spawn(tuning, {
          x: px,
          delay,
          random,
          sizeScale: 1 + P.burstSize * n,
          swellScale: 1 / (1 + 0.4 * n),
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
    if (p) ptr.y = p.y
    startHover(p?.x, e)
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
      const x = local(e)?.x
      if (tuning.clickMass > 0) addGoop(tuning.clickMass, x)
      else if (pressType !== 'mouse') tapDrip(x)
    }
    pressType = ''
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
    if (!on) {
      doc.removeEventListener('pointerup', onUp, true)
      doc.removeEventListener('pointercancel', onUp, true)
    }
  }
  listen(opts.interactive !== false)

  // ---- size tracking -------------------------------------------------------
  const drawResting = (): void => field.drawResting({ tuning, width, height })
  drawResting()
  const RO = win?.ResizeObserver
  const ro = RO
    ? new RO(() => {
        readGeometry()
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
      tuning = readTuning(host, opts)
      if (prev.blur !== tuning.blur || prev.contrast !== tuning.contrast || prev.threshold !== tuning.threshold) {
        renderer.setParams(filterParams(tuning))
      }
      renderer.setPadding(layerPadding(tuning))
      syncSprings()
      listen(opts.interactive !== false)
      readGeometry()
      drawResting()
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
      unwatchReduced()
      pointer.release()
      removeTicker(tick)
      field.destroy()
      renderer.destroy()
      host.style.position = prevStyle.position
      host.style.isolation = prevStyle.isolation
    },
    press,
    release,
    hover(on, x) {
      if (on) startHover(x)
      else if (hovered) endHover()
    },
    drip: tapDrip,
    addGoop,
    inspect() {
      const s = pointer.sample()
      return {
        hovered,
        pressed,
        vx: s.vx,
        vy: s.vy,
        speed: speedOf(s),
        mass,
        drips: field.size,
        nextDrip: hovered ? Math.max(0, nextDrip) : Number.POSITIVE_INFINITY,
      }
    },
  }
}
