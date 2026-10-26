// Drip model. Pure sim + renderer calls; no event listeners, no DOM queries. It only emits
// plain circle data (x, y, r, opacity, stretch) through GoopBlob, so any renderer works.
//
// A drip has two lives:
//
// 1. ATTACHED. A fill level `m` (0..1) rises while the drip is "fed" (pointer hovering, or a
//    click/tap drip) and drains when it isn't. Springs chase targets derived from `m`:
//      hang   -> dripLength * m^hangCurve   (how far the bulb center sits below the edge)
//      radius -> size * sqrt(m)             (area ~ volume of goo in the bulb)
//      sway   -> lateral lean of the bulb, driven by pointer velocity (bent neck)
//    Fed, hang/radius use a heavily damped "viscous" spring (slow creep). Un-fed, a softer
//    spring melts the drip back into the edge. It is drawn as a root circle (the meniscus
//    fillet where it meets the body), a chain of neck circles that thins in the middle as
//    `m` rises, and the bulb. The goo filter melts these into one tapered shape.
//
// 2. DETACHED. When `m` hits 1 and the hang is long enough (or a fast exit yanks it), the
//    bulb becomes a free drop: gravity + linear drag, it stretches with speed, shrinks and
//    fades over `fall` px, then is removed. The neck left on the body becomes a stub that
//    springs back up and shrinks to nothing (no leftover nub). The filter's threshold does
//    the visual "pinch" as drop and stub separate.
//
// Every radius goes continuously to 0 before a circle is removed, so nothing pops.

import { GOOP_PHYSICS, type GoopTuning } from './constants'
import { gooVanishRadius } from './filter'
import { gooParamsOf } from './tuning'
import type { GoopBlob, GoopRenderer } from './renderer'
import {
  clamp,
  isSpringSettled,
  lerp,
  smoothstep,
  springConfig,
  stepFall,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from './spring'

const P = GOOP_PHYSICS

/** What the sim needs from its owner each frame. */
export interface DripContext {
  tuning: GoopTuning
  /** Host border-box size. */
  width: number
  height: number
  /** Current body scale (drip anchors ride the squished edge). */
  sx: number
  sy: number
  /** Element is pressed: feeding speeds up. */
  pressed: boolean
  /** Optional: map an unscaled bottom-edge x to the deformed edge point. Overrides sx/sy. */
  anchor?: (x: number) => { x: number; y: number }
  /** Optional: target lateral sway (px) for attached bulbs. Default 0. */
  sway?: number
  /** Optional: extra feed-rate multiplier (e.g. from click mass). Default 1. */
  feedBoost?: number
  /** Optional: per-drip feed multiplier by anchor x (leading side of a slosh feeds faster). */
  feedAt?: (x: number) => number
  /** Optional: extra hang (px at full fill), e.g. vertical slosh. Negative shortens. */
  stretch?: number
  /** Optional: host x that attached, fed drips creep toward (flow toward the pointer). */
  flowTo?: number
  /** Optional: fraction of the distance to `flowTo` a drip may creep (0..1). Default 0. */
  flowPull?: number
  /** Optional: allowed anchor range [lo, hi] for flowing drips. */
  edge?: readonly [number, number]
  /** Optional floor y: drops fall to it (no mid-air fade) and are handed to `onLand`, which
   *  should draw a replacement circle (a puddle) this frame. */
  floor?: number
  onLand?: (x: number, y: number, r: number, vx: number) => void
}

interface Drop {
  x: number
  vx: number
  y: SpringState // x = position, v = velocity
  y0: number
  r0: number
}

export interface Drip {
  /** Anchor x along the bottom edge, in unscaled host space. Creeps when flowing. */
  x: number
  /** Where it was spawned (flow is a partial pull away from here). */
  readonly x0: number
  /** Stay fed until detach even without hover (click/tap drips). */
  readonly forced: boolean
  fed: boolean
  delay: number
  m: number
  hang: SpringState
  rad: SpringState
  sway: SpringState
  /** After detach: the stub tip length, springing back to 0. */
  stub: SpringState | null
  /** Stub length at the moment of detach. */
  stubStart: number
  drop: Drop | null
  detached: boolean
  /** Set to tear the drip off on the next step (fast exits). */
  yank: { vx: number; vy: number } | null
  readonly size: number
  /** Per-drip hang length and neck pinch multipliers (organic variation). */
  readonly lengthScale: number
  readonly pinchScale: number
  readonly swellTime: number
  readonly fall: number
  readonly blobs: GoopBlob[] // [root, ...neck, bulb]
}

/** One resting drip: x as a 0..1 fraction of the width, size/length multipliers (1 = the
 *  tuned dripSize / resting hang), neck pinch 0..0.6, and a breathing phase (radians). */
export interface RestingDrip {
  x: number
  size?: number
  length?: number
  pinch?: number
  phase?: number
}

export interface SpawnOptions {
  x: number
  delay?: number
  forced?: boolean
  random?: () => number
  /** Multiplies the drip's size (default 1). */
  sizeScale?: number
  /** Multiplies the drip's swell time (default 1; tap drips also get tapSwellScale). */
  swellScale?: number
}

const jitter = (rand: () => number, amount: number): number => 1 + (rand() * 2 - 1) * amount

/**
 * Radius of a falling drop at fall progress p (0..1). It shrinks by dropShrink until
 * dropFadeStart, then eases QUADRATICALLY onto the filter's vanish radius. The goo edge's
 * visible size goes like sqrt(r - vanish), so a quadratic approach makes the visible drop
 * shrink linearly to nothing instead of popping out when it crosses the threshold.
 * (Opacity stays 1: fading alpha under a threshold filter is itself a pop.)
 */
export function dropRadius(r0: number, p: number, t: GoopTuning): number {
  const rm = gooVanishRadius(gooParamsOf(t)) * 0.98
  const fade = P.dropFadeStart
  // Never shrink into the threshold zone before the deliberate fade-out.
  const rA = Math.max(r0 * (1 - P.dropShrink * Math.min(p, fade)), Math.min(r0, rm * 1.2))
  if (p <= fade) return rA
  const q = clamp((p - fade) / (1 - fade), 0, 1)
  if (rA <= rm) return rA * (1 - q) // already sub-threshold (tiny drop / huge blur)
  return rm + (rA - rm) * (1 - q) * (1 - q)
}
/** Radius below which a circle is invisible anyway; settling there avoids a threshold pop. */
const GONE = 0.05

export class DripField {
  readonly drips: Drip[] = []
  private resting: GoopBlob[] = []
  private springs = {
    hang: springConfig(P.hangSpring),
    retract: springConfig(P.retractSpring),
    stub: springConfig(P.stubSpring),
    sway: springConfig(P.swaySpring),
  }
  private viscosity = 1

  /** Fired when a drop detaches (owner adds body recoil). */
  onDetach: ((drip: Drip) => void) | null = null

  constructor(private renderer: GoopRenderer) {}

  /** Move every live and resting drip onto a new renderer (hot renderer swap). Positions are
   *  redrawn by the next step / drawResting call. */
  rebind(renderer: GoopRenderer): void {
    this.renderer = renderer
    for (const d of this.drips) {
      for (let i = 0; i < d.blobs.length; i++) {
        d.blobs[i]!.remove()
        d.blobs[i] = renderer.createBlob()
      }
    }
    for (let i = 0; i < this.resting.length; i++) {
      this.resting[i]!.remove()
      this.resting[i] = renderer.createBlob()
    }
  }

  private syncSprings(viscosity: number): void {
    if (viscosity === this.viscosity) return
    this.viscosity = viscosity
    this.springs = {
      hang: springConfig(P.hangSpring, viscosity),
      retract: springConfig(P.retractSpring, viscosity),
      stub: springConfig(P.stubSpring, viscosity),
      sway: springConfig(P.swaySpring, viscosity),
    }
  }

  get size(): number {
    return this.drips.length
  }

  /** Attached (not yet detached) drips. */
  attached(): Drip[] {
    return this.drips.filter((d) => !d.detached)
  }

  spawn(tuning: GoopTuning, opts: SpawnOptions): Drip | null {
    if (this.drips.length >= (tuning.maxDrips ?? P.maxDrips)) return null
    const rand = opts.random ?? Math.random
    const blobs: GoopBlob[] = []
    for (let i = 0; i < P.neckSegments + 2; i++) blobs.push(this.renderer.createBlob())
    const forced = !!opts.forced
    const drip: Drip = {
      x: opts.x,
      x0: opts.x,
      forced,
      fed: true,
      delay: Math.max(0, opts.delay ?? 0),
      m: 0,
      hang: { x: 0, v: 0 },
      rad: { x: 0, v: 0 },
      sway: { x: 0, v: 0 },
      stub: null,
      stubStart: 0,
      drop: null,
      detached: false,
      yank: null,
      // Floor: a drop smaller than the filter's vanish radius would blink out at detach.
      size: Math.max(
        tuning.dripSize *
          jitter(rand, P.sizeJitter * (0.4 + (tuning.dripVariance ?? 0.6))) *
          (opts.sizeScale ?? 1),
        gooVanishRadius(gooParamsOf(tuning)) * 1.25,
      ),
      swellTime:
        P.swellTime *
        tuning.thickness *
        jitter(rand, P.swellJitter) *
        (forced ? P.tapSwellScale : 1) *
        (opts.swellScale ?? 1),
      fall: tuning.fallDistance * jitter(rand, P.fallJitter),
      lengthScale: 1 + (rand() * 2 - 1) * 0.45 * (tuning.dripVariance ?? 0),
      pinchScale: 1 + (rand() * 2 - 1) * 0.6 * (tuning.dripVariance ?? 0),
      blobs,
    }
    this.drips.push(drip)
    return drip
  }

  /** Feed (hover) or starve (leave) every attached, non-forced drip. */
  setFed(fed: boolean): void {
    for (const d of this.drips) if (!d.detached && !d.forced) d.fed = fed
  }

  /** Advance the sim and draw. Returns true while anything is still moving. */
  step(dt: number, ctx: DripContext): boolean {
    this.syncSprings(ctx.tuning.thickness)
    const anchor =
      ctx.anchor ??
      ((x: number) => ({
        x: ctx.width / 2 + (x - ctx.width / 2) * ctx.sx,
        y: ctx.height / 2 + (ctx.height / 2) * ctx.sy,
      }))
    let active = false
    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i]!
      const a = anchor(d.x)
      const alive = this.stepDrip(d, dt, ctx, a.x, a.y)
      if (alive) active = true
      else {
        for (const b of d.blobs) b.remove()
        this.drips.splice(i, 1)
      }
    }
    return active
  }

  private stepDrip(d: Drip, dt: number, ctx: DripContext, ax: number, ay: number): boolean {
    const t = ctx.tuning
    if (d.delay > 0) {
      d.delay -= dt
      // A delayed drip whose hover ended before it appeared just never shows up.
      if (!d.fed) return false
      if (d.delay > 0) return true
      dt = -d.delay
      d.delay = 0
    }

    if (!d.detached) {
      const boost =
        (ctx.pressed ? P.pressFeedBoost : 1) * (ctx.feedBoost ?? 1) * Math.max(0, ctx.feedAt ? ctx.feedAt(d.x) : 1)
      const feed = d.fed ? (1 / Math.max(0.05, d.swellTime)) * boost : 0
      d.m = d.fed ? Math.min(1, d.m + dt * feed) : Math.max(0, d.m - dt / (P.drainTime * t.thickness))
      const cfg: SpringConfig = d.fed ? this.springs.hang : this.springs.retract
      const hangT = t.dripLength * d.lengthScale * Math.pow(d.m, P.hangCurve) + (ctx.stretch ?? 0) * d.m
      stepSpring(d.hang, Math.max(0, hangT), cfg, dt)
      // sqrt(m) (area ~ volume), but linear near 0 so a draining drip never collapses steeply.
      stepSpring(d.rad, d.size * (d.m < 0.25 ? d.m * 2 : Math.sqrt(d.m)), cfg, dt)
      // Pendulum: the longer it hangs, the further the bulb swings.
      const maxSway = d.size * P.maxSway
      const reach = clamp(d.hang.x / Math.max(1, t.dripLength), 0.25, 1.4)
      stepSpring(d.sway, clamp((ctx.sway ?? 0) * reach, -maxSway, maxSway), this.springs.sway, dt)
      // Flow: fed drips creep along the edge toward the pointer with viscous lag.
      if (d.fed && ctx.flowTo !== undefined && ctx.flowPull) {
        const target = lerp(d.x0, ctx.flowTo, clamp(ctx.flowPull, 0, 1))
        const k = 1 - Math.exp(-dt / (P.flowLag * t.thickness))
        let nx = d.x + (target - d.x) * k
        if (ctx.edge) nx = clamp(nx, ctx.edge[0], ctx.edge[1])
        d.x = nx
      }

      const full = d.fed && d.m >= 1 && d.hang.x >= t.dripLength * d.lengthScale * P.detachAt
      if (full || (d.yank && d.rad.x > d.size * 0.3)) {
        this.detach(d, ax, ay)
      } else {
        d.yank = null
        this.drawAttached(d, ax, ay)
        if (
          !d.fed &&
          d.m <= 0 &&
          d.rad.x < GONE &&
          Math.abs(d.rad.v) < 1 &&
          isSpringSettled(d.hang, 0, 0.5, 2) &&
          Math.abs(d.sway.x) < 0.5
        ) {
          return false
        }
        return true
      }
    }

    // Detached: falling drop + retracting stub.
    let moving = false
    const bulb = d.blobs[d.blobs.length - 1]!
    const drop = d.drop
    if (drop) {
      stepFall(drop.y, t.gravity, P.dropDrag, dt)
      drop.vx *= Math.exp(-P.dropDrag * dt)
      drop.x += drop.vx * dt
      const p = d.fall > 0 ? clamp((drop.y.x - drop.y0) / d.fall, 0, 1) : 1
      const landing = ctx.floor !== undefined && !!ctx.onLand
      const rNow = dropRadius(drop.r0, landing ? Math.min(p, P.dropFadeStart) : p, t)
      if (landing && drop.y.x + rNow >= ctx.floor!) {
        ctx.onLand!(drop.x, ctx.floor!, rNow, drop.vx)
        bulb.set(0, 0, 0, 0)
        d.drop = null
      } else if (!landing && p >= 1) {
        bulb.set(0, 0, 0, 0)
        d.drop = null
      } else {
        const stretch = 1 + Math.min(P.dropMaxStretch, Math.max(0, drop.y.v) * P.dropStretch)
        bulb.set(drop.x, drop.y.x, rNow, 1, 1 / Math.sqrt(stretch), stretch)
        moving = true
      }
    }
    const stub = d.stub
    if (stub) {
      stepSpring(stub, 0, this.springs.stub, dt)
      stepSpring(d.sway, 0, this.springs.sway, dt)
      // Done once the stub has shrunk to nothing (its radii scale with its length).
      if (stub.x < 0.15 && Math.abs(stub.v) < 2) {
        d.stub = null
        for (let i = 0; i < d.blobs.length - 1; i++) d.blobs[i]!.set(0, 0, 0)
      } else {
        this.drawStub(d, stub.x, ax, ay)
        moving = true
      }
    }
    return moving
  }

  private detach(d: Drip, ax: number, ay: number): void {
    d.detached = true
    const r0 = Math.max(0, d.rad.x)
    const yank = d.yank
    d.yank = null
    const y0 = ay + d.hang.x
    d.drop = {
      x: ax + d.sway.x,
      vx: yank ? yank.vx : d.sway.v,
      y: { x: y0, v: Math.max(0, d.hang.v) + P.detachKick + (yank ? Math.max(0, yank.vy) : 0) },
      y0,
      r0,
    }
    // The stub starts as the full neck (to the bulb center); the drop pulling away from
    // it is what the filter turns into a stretched thread that pinches off.
    d.stubStart = Math.max(0.001, d.hang.x)
    d.stub = { x: d.stubStart, v: Math.min(0, d.hang.v) }
    this.drawStub(d, d.stub.x, ax, ay)
    const bulb = d.blobs[d.blobs.length - 1]!
    bulb.set(d.drop.x, d.drop.y.x, r0)
    this.onDetach?.(d)
  }

  private drawAttached(d: Drip, ax: number, ay: number): void {
    const n = P.neckSegments
    const bulbR = Math.max(0, d.rad.x)
    const hang = d.hang.x
    const rootR = bulbR * P.rootScale
    const tipR = bulbR * P.neckTipScale
    const pinch = clamp(P.neckPinch * d.pinchScale, 0, 0.85) * smoothstep(0.35, 1, d.m)
    const sway = d.sway.x
    d.blobs[0]!.set(ax, ay, rootR)
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1)
      const r = lerp(rootR, tipR, f) * (1 - pinch * Math.sin(Math.PI * f))
      // Neck bends: root is pinned, bulb takes the full sway.
      d.blobs[i]!.set(ax + sway * f * f, ay + hang * f, r)
    }
    d.blobs[n + 1]!.set(ax + sway, ay + hang, bulbR)
  }

  private drawStub(d: Drip, len: number, ax: number, ay: number): void {
    // Same taper as the attached neck at the moment of detach, shortening AND thinning to
    // zero as the stub springs back, so there is neither a pop at detach nor a leftover nub.
    const n = P.neckSegments
    const r0 = d.drop?.r0 ?? d.size
    const tip = Math.max(0, len)
    const k = clamp(tip / Math.max(1, d.stubStart), 0, 1)
    const rootR = r0 * P.rootScale
    const tipR = r0 * P.neckTipScale
    const sway = d.sway.x * k
    d.blobs[0]!.set(ax, ay, rootR * k)
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1)
      const r = lerp(rootR, tipR, f) * (1 - P.neckPinch * Math.sin(Math.PI * f)) * k
      d.blobs[i]!.set(ax + sway * f * f, ay + tip * f, r)
    }
  }

  /** Static resting drips (no motion). Redraw whenever size or tuning changes. */
  drawResting(
    ctx: Omit<DripContext, 'pressed' | 'sx' | 'sy'>,
    specs?: readonly RestingDrip[],
    /** Seconds, for the slow idle "breathing" swell; omit for a static pose. */
    time?: number,
  ): void {
    const n = specs ? specs.length : ctx.tuning.restingDrips
    const perDrip = P.neckSegments + 2
    while (this.resting.length < n * perDrip) this.resting.push(this.renderer.createBlob())
    while (this.resting.length > n * perDrip) this.resting.pop()!.remove()
    const ay = ctx.height
    for (let j = 0; j < n; j++) {
      const sp = specs?.[j]
      const breathe =
        time === undefined ? 1 : 1 + P.idleSwell * Math.sin((time / P.idlePeriod) * Math.PI * 2 + (sp?.phase ?? j * 2.1))
      const hang = ctx.tuning.dripLength * P.restingHang * (sp?.length ?? 1) * breathe
      const r = ctx.tuning.dripSize * P.restingSize * (sp?.size ?? 1) * (1 + (breathe - 1) * 0.5)
      const pinch = sp?.pinch ?? 0
      const ax = sp ? clamp(sp.x, 0, 1) * ctx.width : (ctx.width * (j + 1)) / (n + 1)
      const blobs = this.resting.slice(j * perDrip, (j + 1) * perDrip)
      blobs[0]!.set(ax, ay, r * P.rootScale)
      for (let i = 1; i <= P.neckSegments; i++) {
        const f = i / (P.neckSegments + 1)
        blobs[i]!.set(
          ax,
          ay + hang * f,
          lerp(r * P.rootScale, r * P.neckTipScale, f) * (1 - pinch * Math.sin(Math.PI * f)),
        )
      }
      blobs[perDrip - 1]!.set(ax, ay + hang, r)
    }
  }

  /** Remove every live drip immediately (resting drips stay). */
  clear(): void {
    for (const d of this.drips) for (const b of d.blobs) b.remove()
    this.drips.length = 0
  }

  destroy(): void {
    this.clear()
    for (const b of this.resting) b.remove()
    this.resting = []
  }
}
