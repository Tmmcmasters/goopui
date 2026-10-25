// Drip model. Pure sim + renderer calls; no event listeners, no DOM queries.
//
// A drip has two lives:
//
// 1. ATTACHED. A fill level `m` (0..1) rises while the drip is "fed" (pointer hovering, or a
//    tap drip) and drains when it isn't. Two springs chase targets derived from `m`:
//      hang   -> dripLength * m^hangCurve   (how far the bulb center sits below the edge)
//      radius -> dripSize * sqrt(m)         (area ~ volume of goo in the bulb)
//    Fed, they use a heavily damped "viscous" spring (slow creep). Un-fed, a bouncy spring
//    sucks the drip back up. It is drawn as a root circle (the meniscus fillet where it
//    meets the body), a chain of neck circles that thins in the middle as `m` rises, and
//    the bulb. The goo filter melts these into one tapered shape.
//
// 2. DETACHED. When `m` hits 1 and the hang is long enough, the bulb becomes a free drop:
//    gravity + linear drag, it stretches with speed, shrinks and fades over `fall` px, then
//    is removed. The neck left on the body becomes a stub that springs back up. The
//    filter's threshold does the visual "pinch" as drop and stub separate.

import { GOOP_PHYSICS, type GoopTuning } from './constants'
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
}

interface Drop {
  x: number
  y: SpringState // x = position, v = velocity
  y0: number
  r0: number
}

export interface Drip {
  /** Anchor x along the bottom edge, in unscaled host space. */
  readonly x: number
  /** Stay fed until detach even without hover (tap drips). */
  readonly forced: boolean
  fed: boolean
  delay: number
  m: number
  hang: SpringState
  rad: SpringState
  /** After detach: the stub tip length, springing back to 0. */
  stub: SpringState | null
  /** Stub length at the moment of detach. */
  stubStart: number
  drop: Drop | null
  detached: boolean
  readonly size: number
  readonly swellTime: number
  readonly fall: number
  readonly blobs: GoopBlob[] // [root, ...neck, bulb]
}

export interface SpawnOptions {
  x: number
  delay?: number
  forced?: boolean
  random?: () => number
}

const jitter = (rand: () => number, amount: number): number => 1 + (rand() * 2 - 1) * amount

export class DripField {
  readonly drips: Drip[] = []
  private resting: GoopBlob[] = []
  private springs = {
    hang: springConfig(P.hangSpring),
    retract: springConfig(P.retractSpring),
    stub: springConfig(P.stubSpring),
  }
  private viscosity = 1

  /** Fired when a drop detaches (owner adds body recoil). */
  onDetach: ((drip: Drip) => void) | null = null

  constructor(private readonly renderer: GoopRenderer) {}

  private syncSprings(viscosity: number): void {
    if (viscosity === this.viscosity) return
    this.viscosity = viscosity
    this.springs = {
      hang: springConfig(P.hangSpring, viscosity),
      retract: springConfig(P.retractSpring, viscosity),
      stub: springConfig(P.stubSpring, viscosity),
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
    if (this.drips.length >= P.maxDrips) return null
    const rand = opts.random ?? Math.random
    const blobs: GoopBlob[] = []
    for (let i = 0; i < P.neckSegments + 2; i++) blobs.push(this.renderer.createBlob())
    const forced = !!opts.forced
    const drip: Drip = {
      x: opts.x,
      forced,
      fed: true,
      delay: Math.max(0, opts.delay ?? 0),
      m: 0,
      hang: { x: 0, v: 0 },
      rad: { x: 0, v: 0 },
      stub: null,
      stubStart: 0,
      drop: null,
      detached: false,
      size: tuning.dripSize * jitter(rand, P.sizeJitter),
      swellTime:
        P.swellTime * tuning.viscosity * jitter(rand, P.swellJitter) * (forced ? P.tapSwellScale : 1),
      fall: tuning.fall * jitter(rand, P.fallJitter),
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
    this.syncSprings(ctx.tuning.viscosity)
    const anchorY = ctx.height / 2 + (ctx.height / 2) * ctx.sy
    const mapX = (x: number): number => ctx.width / 2 + (x - ctx.width / 2) * ctx.sx
    let active = false
    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i]!
      const alive = this.stepDrip(d, dt, ctx, mapX(d.x), anchorY)
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
      const feed = d.fed ? (1 / Math.max(0.05, d.swellTime)) * (ctx.pressed ? P.pressFeedBoost : 1) : 0
      d.m = d.fed ? Math.min(1, d.m + dt * feed) : Math.max(0, d.m - dt / (P.drainTime * t.viscosity))
      const cfg: SpringConfig = d.fed ? this.springs.hang : this.springs.retract
      stepSpring(d.hang, t.dripLength * Math.pow(d.m, P.hangCurve), cfg, dt)
      stepSpring(d.rad, d.size * Math.sqrt(d.m), cfg, dt)

      if (d.fed && d.m >= 1 && d.hang.x >= t.dripLength * P.detachAt) {
        this.detach(d, ax, ay)
      } else {
        this.drawAttached(d, ax, ay)
        if (!d.fed && d.m <= 0 && isSpringSettled(d.hang, 0, 0.05, 1) && isSpringSettled(d.rad, 0, 0.05, 1)) {
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
      const p = d.fall > 0 ? clamp((drop.y.x - drop.y0) / d.fall, 0, 1) : 1
      if (p >= 1) {
        bulb.set(0, 0, 0, 0)
        d.drop = null
      } else {
        const stretch = 1 + Math.min(P.dropMaxStretch, Math.max(0, drop.y.v) * P.dropStretch)
        bulb.set(
          drop.x,
          drop.y.x,
          drop.r0 * (1 - P.dropShrink * p),
          1 - smoothstep(P.dropFadeStart, 1, p),
          1 / Math.sqrt(stretch),
          stretch,
        )
        moving = true
      }
    }
    const stub = d.stub
    if (stub) {
      stepSpring(stub, 0, this.springs.stub, dt)
      if (isSpringSettled(stub, 0, 0.05, 1)) {
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
    d.drop = { x: ax, y: { x: ay + d.hang.x, v: Math.max(0, d.hang.v) + P.detachKick }, y0: ay + d.hang.x, r0 }
    // The stub starts as the full neck (to the bulb center); the drop pulling away from
    // it is what the filter turns into a stretched thread that pinches off.
    d.stubStart = Math.max(0.001, d.hang.x)
    d.stub = { x: d.stubStart, v: Math.min(0, d.hang.v) }
    this.drawStub(d, d.stub.x, ax, ay)
    const bulb = d.blobs[d.blobs.length - 1]!
    bulb.set(ax, d.drop.y.x, r0)
    this.onDetach?.(d)
  }

  private drawAttached(d: Drip, ax: number, ay: number): void {
    const n = P.neckSegments
    const bulbR = Math.max(0, d.rad.x)
    const hang = d.hang.x
    const rootR = bulbR * P.rootScale
    const tipR = bulbR * P.neckTipScale
    const pinch = P.neckPinch * smoothstep(0.35, 1, d.m)
    d.blobs[0]!.set(ax, ay, rootR)
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1)
      const r = lerp(rootR, tipR, f) * (1 - pinch * Math.sin(Math.PI * f))
      d.blobs[i]!.set(ax, ay + hang * f, r)
    }
    d.blobs[n + 1]!.set(ax, ay + hang, bulbR)
  }

  private drawStub(d: Drip, len: number, ax: number, ay: number): void {
    // Same taper as the attached neck at the moment of detach, shortening and thinning as
    // the stub springs back, so there is no visual pop when the drop lets go.
    const n = P.neckSegments
    const r0 = d.drop?.r0 ?? d.size
    const tip = Math.max(0, len)
    const k = clamp(tip / Math.max(1, d.stubStart), 0, 1)
    const rootR = r0 * P.rootScale
    const tipR = r0 * P.neckTipScale
    d.blobs[0]!.set(ax, ay, rootR * (0.55 + 0.45 * k))
    for (let i = 1; i <= n; i++) {
      const f = i / (n + 1)
      const r = lerp(rootR, tipR, f) * (1 - P.neckPinch * Math.sin(Math.PI * f)) * (0.35 + 0.65 * k)
      d.blobs[i]!.set(ax, ay + tip * f, r)
    }
  }

  /** Static resting drips (no motion). Redraw whenever size or tuning changes. */
  drawResting(ctx: Omit<DripContext, 'pressed' | 'sx' | 'sy'>): void {
    const n = ctx.tuning.restingDrips
    const perDrip = P.neckSegments + 2
    while (this.resting.length < n * perDrip) this.resting.push(this.renderer.createBlob())
    while (this.resting.length > n * perDrip) this.resting.pop()!.remove()
    const ay = ctx.height
    const hang = ctx.tuning.dripLength * P.restingHang
    const r = ctx.tuning.dripSize * P.restingSize
    for (let j = 0; j < n; j++) {
      const ax = (ctx.width * (j + 1)) / (n + 1)
      const blobs = this.resting.slice(j * perDrip, (j + 1) * perDrip)
      blobs[0]!.set(ax, ay, r * P.rootScale)
      for (let i = 1; i <= P.neckSegments; i++) {
        const f = i / (P.neckSegments + 1)
        blobs[i]!.set(ax, ay + hang * f, lerp(r * P.rootScale, r * P.neckTipScale, f))
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
