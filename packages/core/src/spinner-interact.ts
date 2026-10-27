// Spinner interaction: a deformation layer on top of any spinner pose (all variants).
//
//   slosh : pointer movement over (and a little around) the spinner drags the goo along with
//           it. Every circle sits on a jelly spring; circles near the pointer get pushed hard
//           and at once, and a slower shared "body" spring lags behind, so it wobbles as one
//           mass and settles back. Push is proportional to pointer velocity: slow moves nudge,
//           fast ones slosh.
//   grab  : press and drag pulls the goo near the grab point toward the pointer, stretched
//           into a few fat lumps (like the button's taffy). Release springs it back with an
//           overshoot wobble.
//   pop   : press squishes the spinner, release (tap/click) swells it back with a jelly
//           overshoot and sends a ripple through the circles from the press point.
//
// Pure math on unit-space circles (center 0,0, the spinner spans -0.5..0.5); no DOM.
// `attachSpinner` feeds it pointer input and draws `apply(base)`.

import { GOOP_PHYSICS } from './constants'
import { clamp, isSpringSettled, smoothstep, springConfig, stepSpring, type SpringState } from './spring'
import type { SpinnerCircle } from './spinner'

/** Extra circles allocated for the grab stretch (zero radius while idle). */
export const SPINNER_GRAB_LUMPS = 4

/** Tuning for the spinner's pointer feel. Lengths in unit space (fractions of the size). */
export const SPINNER_INTERACT = Object.freeze({
  // ---- slosh ----
  /** Pointer px/s -> unit/s divisor is sqrt(size * this): small spinners move a bit more
   *  relative to their size (readable), but less in px (not chaotic). */
  sloshRefSize: 32,
  /** Per-circle push (unit/s^2 per unit/s of pointer velocity) at full proximity. */
  sloshLocal: 3.2,
  /** Shared body push (lags: it rides the slower slosh spring). */
  sloshBody: 1.6,
  /** Proximity falloff (unit) from the pointer to a circle. */
  sloshFalloff: 0.38,
  /** Pointer counts as "over" out to this far beyond the box edge (unit). */
  hoverMargin: 0.35,
  /** Soft cap on any slosh offset (unit). */
  maxSlosh: 0.16,
  /** Per-circle jelly spring and the body spring. */
  localSpring: { response: 0.3, dampingRatio: 0.34 },
  bodySpring: { response: 0.5, dampingRatio: 0.32 },

  // ---- grab ----
  /** Pull beyond this needs ever more force (rubber band), unit. */
  grabReach: 0.55,
  /** Drag distance (unit, and at least `grabThresholdPx`) before a press becomes a grab. */
  grabThreshold: 0.08,
  grabThresholdPx: 4,
  /** How far circles near the grab point lean along the pull (fraction of the pull). */
  grabLean: 0.35,
  grabFalloff: 0.3,
  /** Lump radii (unit): the end glob and the lumps between. */
  grabEnd: 0.12,
  grabLump: 0.085,
  /** Lag (s) of the pulled end behind the pointer. */
  grabFollow: GOOP_PHYSICS.taffyFollow,
  /** Snap back on release (overshoot). */
  grabSpring: GOOP_PHYSICS.taffySpring,

  // ---- pop ----
  /** Squish while pressed: horizontal spread and vertical squash (scale fractions). */
  pressSpread: 0.08,
  pressSquash: -0.14,
  pressSpring: GOOP_PHYSICS.pressSpring,
  releaseSpring: GOOP_PHYSICS.releaseSpring,
  /** Release kick (scale velocity): stretches tall + swells, so a quick tap still pops. */
  popKick: 1.3,
  popSwell: 1.4,
  swellSpring: GOOP_PHYSICS.jellySpring,
  /** Ripple: wavefront speed (unit/s), width (unit), radial push and radius swell. */
  rippleSpeed: 2.4,
  rippleWidth: 0.3,
  ripplePush: 0.05,
  rippleSwell: 0.35,
  rippleDecay: 0.4,
})

/** Which interactions are live (reduced motion: all false). */
export interface SpinnerInteractFlags {
  slosh: boolean
  grab: boolean
  pop: boolean
}

export const SPINNER_NO_INTERACTION: Readonly<SpinnerInteractFlags> = Object.freeze({ slosh: false, grab: false, pop: false })

/** Pointer hovering near the spinner: position (unit) and velocity (unit/s). */
export interface SpinnerPointer {
  x: number
  y: number
  vx: number
  vy: number
}

interface Ripple {
  x: number
  y: number
  t: number
}

const spring = (): SpringState => ({ x: 0, v: 0 })
const bell = (d: number, w: number): number => Math.exp(-(d * d) / (w * w))
/** Soft clamp a 2D vector's length to `max` (tanh), in place-ish. */
const soft = (x: number, y: number, max: number): [number, number] => {
  const l = Math.hypot(x, y)
  if (l < 1e-9) return [0, 0]
  const k = (max * Math.tanh(l / max)) / l
  return [x * k, y * k]
}

export interface SpinnerJelly {
  /** Pointer hovering near the spinner (null = away / still). */
  setPointer(p: SpinnerPointer | null): void
  /** Press at (x, y) unit. */
  press(x: number, y: number): void
  /** Pointer moved while pressed. `threshold` (unit) overrides the grab start distance. */
  drag(x: number, y: number, threshold?: number): void
  /** Release. `click` = a tap/click (pop + ripple); false = cancelled. */
  release(click?: boolean): void
  /** Advance the springs by dt (s), using the current base pose for proximity. */
  step(base: readonly SpinnerCircle[], dt: number, flags: SpinnerInteractFlags): void
  /** The deformed pose. With `flags.grab`, SPINNER_GRAB_LUMPS circles are appended.
   *  `vanish` (unit) keeps visible lumps above the goo vanish radius. */
  apply(base: readonly SpinnerCircle[], flags: SpinnerInteractFlags, vanish?: number): SpinnerCircle[]
  /** True when nothing is deformed (all springs settled, nothing held, no ripples). */
  readonly idle: boolean
  readonly grabbing: boolean
  readonly pressed: boolean
  /** Drop all motion. */
  reset(): void
}

export function createSpinnerJelly(): SpinnerJelly {
  const T = SPINNER_INTERACT
  const localCfg = springConfig(T.localSpring)
  const bodyCfg = springConfig(T.bodySpring)
  const grabCfg = springConfig(T.grabSpring)
  const pressCfg = springConfig(T.pressSpring)
  const releaseCfg = springConfig(T.releaseSpring)
  const swellCfg = springConfig(T.swellSpring)

  let lx: SpringState[] = []
  let ly: SpringState[] = []
  const body = { x: spring(), y: spring() }
  const scale = { x: spring(), y: spring(), r: spring() }
  const pull = { x: spring(), y: spring() }
  const ripples: Ripple[] = []
  let pointer: SpinnerPointer | null = null
  let isPressed = false
  let holding = false
  let start = { x: 0, y: 0 }
  let target = { x: 0, y: 0 }
  /** Direction of the pull at release (lumps only show on that side while it recoils). */
  let releaseDir = { x: 0, y: 0 }
  let anchor = { x: 0, y: 0 }
  let pendingPop = false

  const ensure = (n: number): void => {
    while (lx.length < n) {
      lx.push(spring())
      ly.push(spring())
    }
    if (lx.length > n) {
      lx = lx.slice(0, n)
      ly = ly.slice(0, n)
    }
  }

  /** Rubber-banded pull vector (unit). */
  const pullVec = (): [number, number] => soft(pull.x.x, pull.y.x, T.grabReach)

  const settled = (): boolean => {
    const all = [...lx, ...ly, body.x, body.y, scale.x, scale.y, scale.r, pull.x, pull.y]
    return all.every((s) => isSpringSettled(s, 0, 1e-4, 1e-3))
  }

  const jelly: SpinnerJelly = {
    setPointer(p) {
      pointer = p
    },
    press(x, y) {
      isPressed = true
      holding = false
      start = { x, y }
      target = { x, y }
    },
    drag(x, y, threshold = T.grabThreshold) {
      if (!isPressed) return
      target = { x, y }
      if (!holding && Math.hypot(x - start.x, y - start.y) > threshold) {
        holding = true
        // A fresh pull from this press point.
        pull.x.x = 0
        pull.y.x = 0
        pull.x.v = 0
        pull.y.v = 0
      }
    },
    release(click = true) {
      if (!isPressed) return
      isPressed = false
      if (holding) {
        holding = false
        const [px, py] = pullVec()
        const l = Math.hypot(px, py) || 1
        releaseDir = { x: px / l, y: py / l }
        return
      }
      if (!click) return
      pendingPop = true
      ripples.push({ x: start.x, y: start.y, t: 0 })
      if (ripples.length > 3) ripples.shift()
    },
    step(base, dt, flags) {
      if (!(dt > 0)) return
      ensure(base.length)
      // ---- slosh ----
      const p = flags.slosh ? pointer : null
      if (p) {
        const d = Math.hypot(p.x, p.y)
        // Proximity of the pointer to the spinner as a whole: 1 inside, fades over the margin.
        const near = 1 - smoothstep(0.5, 0.5 + T.hoverMargin, Math.max(Math.abs(p.x), Math.abs(p.y), d * 0.85))
        if (near > 0) {
          body.x.v += p.vx * T.sloshBody * near * dt
          body.y.v += p.vy * T.sloshBody * near * dt
          for (let i = 0; i < base.length; i++) {
            const c = base[i]!
            const w = bell(Math.hypot(c.x - p.x, c.y - p.y), T.sloshFalloff) * near
            lx[i]!.v += p.vx * T.sloshLocal * w * dt
            ly[i]!.v += p.vy * T.sloshLocal * w * dt
          }
        }
      }
      stepSpring(body.x, 0, bodyCfg, dt)
      stepSpring(body.y, 0, bodyCfg, dt)
      for (let i = 0; i < lx.length; i++) {
        stepSpring(lx[i]!, 0, localCfg, dt)
        stepSpring(ly[i]!, 0, localCfg, dt)
      }
      // ---- grab ----
      if (holding && flags.grab) {
        const k = 1 - Math.exp(-dt / T.grabFollow)
        const tx = target.x - start.x
        const ty = target.y - start.y
        const nx = pull.x.x + (tx - pull.x.x) * k
        const ny = pull.y.x + (ty - pull.y.x) * k
        pull.x.v = (nx - pull.x.x) / dt
        pull.y.v = (ny - pull.y.x) / dt
        pull.x.x = nx
        pull.y.x = ny
      } else {
        stepSpring(pull.x, 0, grabCfg, dt)
        stepSpring(pull.y, 0, grabCfg, dt)
      }
      // Anchor: the goo edge nearest the grab point, smoothed so it doesn't hop between circles
      // as the spinner turns underneath.
      const [px, py] = pullVec()
      if (Math.hypot(px, py) > 1e-4) {
        const ex = start.x + px
        const ey = start.y + py
        let best = -1
        let bestD = Infinity
        for (let i = 0; i < base.length; i++) {
          const c = base[i]!
          if (c.r <= 0) continue
          const d = Math.hypot(c.x - (start.x + px * 0.25), c.y - (start.y + py * 0.25)) - c.r
          if (d < bestD) {
            bestD = d
            best = i
          }
        }
        if (best >= 0) {
          const c = base[best]!
          const dx = ex - c.x
          const dy = ey - c.y
          const l = Math.hypot(dx, dy) || 1
          const ax = c.x + (dx / l) * c.r * 0.5
          const ay = c.y + (dy / l) * c.r * 0.5
          const k = 1 - Math.exp(-dt / 0.06)
          anchor = { x: anchor.x + (ax - anchor.x) * k, y: anchor.y + (ay - anchor.y) * k }
        }
      } else anchor = { x: start.x, y: start.y }
      // ---- pop ----
      const popOn = flags.pop
      if (pendingPop) {
        pendingPop = false
        if (popOn) {
          scale.y.v += T.popKick
          scale.x.v -= T.popKick * 0.5
          scale.r.v += T.popSwell
        } else ripples.length = 0
      }
      const squish = popOn && isPressed && !holding
      stepSpring(scale.x, squish ? T.pressSpread : 0, squish ? pressCfg : releaseCfg, dt)
      stepSpring(scale.y, squish ? T.pressSquash : 0, squish ? pressCfg : releaseCfg, dt)
      stepSpring(scale.r, 0, swellCfg, dt)
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]!
        r.t += dt
        if (r.t * T.rippleSpeed > 1.6 + T.rippleWidth) ripples.splice(i, 1)
      }
    },
    apply(base, flags, vanish = 0) {
      const out: SpinnerCircle[] = new Array(base.length)
      ensure(base.length)
      const [bx, by] = soft(body.x.x, body.y.x, T.maxSlosh * 0.6)
      const sx = scale.x.x
      const sy = scale.y.x
      const [px, py] = pullVec()
      const pl = Math.hypot(px, py)
      for (let i = 0; i < base.length; i++) {
        const c = base[i]!
        let [ox, oy] = soft(lx[i]!.x + bx, ly[i]!.x + by, T.maxSlosh)
        let rs = 1 + (sx + sy) * 0.5 + scale.r.x
        if (pl > 1e-6) {
          const w = bell(Math.hypot(c.x - start.x, c.y - start.y), T.grabFalloff)
          ox += px * T.grabLean * w
          oy += py * T.grabLean * w
        }
        for (const r of ripples) {
          const dx = c.x - r.x
          const dy = c.y - r.y
          const d = Math.hypot(dx, dy)
          const u = (r.t * T.rippleSpeed - d) / T.rippleWidth
          if (u <= 0 || u >= 1) continue
          const bump = Math.sin(Math.PI * u) * Math.exp(-r.t / T.rippleDecay)
          const l = d || 1
          ox += (dx / l) * bump * T.ripplePush
          oy += (dy / l) * bump * T.ripplePush
          rs += bump * T.rippleSwell
        }
        out[i] = { x: c.x * (1 + sx) + ox, y: c.y * (1 + sy) + oy, r: Math.max(0, c.r * rs) }
      }
      if (!flags.grab) return out
      // ---- grab lumps: anchor -> pulled end, a few fat overlapping globs ----
      const ex = start.x + px
      const ey = start.y + py
      const dx = ex - anchor.x
      const dy = ey - anchor.y
      const len = Math.hypot(dx, dy)
      // While recoiling, only the side it was pulled toward shows lumps (no flip-side pop-in).
      const along = holding ? pl : Math.max(0, px * releaseDir.x + py * releaseDir.y)
      const grow = clamp(along / 0.12, 0, 1)
      const p = clamp(pl / T.grabReach, 0, 1)
      const late = smoothstep(0.7, 1, p)
      const floor = vanish * 1.15
      const fr = [0.3, 0.55, 0.8, 1]
      for (let k = 0; k < SPINNER_GRAB_LUMPS; k++) {
        const f = fr[k] ?? 1
        const end = k === SPINNER_GRAB_LUMPS - 1
        const lump = 1 + 0.3 * Math.max(0, Math.sin(f * Math.PI * 3 + 0.6))
        let r = end ? T.grabEnd * (1 + 0.3 * p) : T.grabLump * lump * (1 - 0.3 * late)
        if (grow <= 0 || len < 1e-4) r = 0
        else r = Math.max(r, floor) * grow
        // A little sag toward screen-down, heavier the longer it gets.
        const sag = 0.05 * p * Math.sin(Math.PI * f)
        out.push({ x: anchor.x + dx * f, y: anchor.y + dy * f + sag, r })
      }
      return out
    },
    get idle() {
      return !isPressed && !holding && ripples.length === 0 && !pendingPop && settled()
    },
    get grabbing() {
      return holding
    },
    get pressed() {
      return isPressed
    },
    reset() {
      for (const s of [...lx, ...ly, body.x, body.y, scale.x, scale.y, scale.r, pull.x, pull.y]) {
        s.x = 0
        s.v = 0
      }
      ripples.length = 0
      isPressed = false
      holding = false
      pendingPop = false
      pointer = null
    },
  }
  return jelly
}
