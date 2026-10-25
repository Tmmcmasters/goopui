// Puddles: drops and particles that reach a floor pool there, spread flat, then drain.
// Pure sim, emits circle data (stretched with sx/sy) through GoopBlob. No pops: a puddle
// starts as exactly the circle that landed, flattens on a spring, and its visible thickness
// (minor radius) eases onto the goo vanish radius before a short tail to zero.

import { GOOP_PHYSICS } from './constants'
import { drainRadius } from './fluid'
import type { GoopBlob } from './renderer'
import { clamp, springConfig, stepSpring, type SpringState } from './spring'

const P = GOOP_PHYSICS

export interface PuddleLanding {
  x: number
  /** Floor y (same space as x). */
  floor: number
  /** Radius of the circle that landed (px). */
  r: number
  vx: number
  /** Goo vanish radius under the filter this puddle is drawn with. */
  vanish: number
  /** Seconds until fully drained. */
  life: number
  color?: string
}

interface Puddle {
  x: number
  vx: number
  floor: number
  r: number
  t: number
  life: number
  vanish: number
  syMin: number
  sx: SpringState
  sy: SpringState
  blob: GoopBlob
  color?: string
}

const spreadCfg = springConfig({ response: 0.28, dampingRatio: 0.55 })

export class PuddleSet {
  private ps: Puddle[] = []
  constructor(private createBlob: (color?: string) => GoopBlob) {}

  /** Re-create every puddle's circle with a new factory (hot renderer swap). */
  rebind(createBlob: (color?: string) => GoopBlob): void {
    this.createBlob = createBlob
    for (const p of this.ps) {
      p.blob.remove()
      p.blob = createBlob(p.color)
    }
  }

  get count(): number {
    return this.ps.length
  }

  /** Start a puddle. Draws it immediately so the caller can drop its own circle this frame. */
  add(l: PuddleLanding, ox = 0, oy = 0): void {
    const blob = this.createBlob(l.color)
    // Never flatten below what stays visible under the threshold filter.
    const syMin = clamp((l.vanish * 1.3) / Math.max(0.01, l.r), P.puddleFlatten, 1)
    const pd: Puddle = {
      x: l.x,
      vx: l.vx,
      floor: l.floor,
      r: l.r,
      t: 0,
      life: l.life,
      vanish: l.vanish,
      syMin,
      sx: { x: 1, v: 0 },
      sy: { x: 1, v: 0 },
      blob,
      color: l.color,
    }
    this.ps.push(pd)
    this.draw(pd, pd.r, ox, oy)
  }

  private draw(p: Puddle, r: number, ox: number, oy: number): void {
    // Rest on the floor: the bottom of the ellipse touches it.
    p.blob.set(p.x - ox, p.floor - r * p.sy.x - oy, r, 1, p.sx.x, p.sy.x)
  }

  step(dt: number, ox = 0, oy = 0): boolean {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i]!
      p.t += dt
      p.vx *= Math.exp(-6 * dt)
      p.x += p.vx * dt
      // Area-preserving spread: flatter and wider.
      const syT = p.syMin
      stepSpring(p.sy, syT, spreadCfg, dt)
      stepSpring(p.sx, 1 / Math.sqrt(syT), spreadCfg, dt)
      // Drain the visible thickness (minor radius) onto the vanish radius, then to zero.
      const q = (p.t / p.life) * 1.25
      if (q >= 1.25) {
        p.blob.remove()
        this.ps.splice(i, 1)
        continue
      }
      const sy = Math.max(0.05, p.sy.x)
      const minor = drainRadius(p.r * sy, p.vanish * 0.98, q)
      this.draw(p, minor / sy, ox, oy)
    }
    return this.ps.length > 0
  }

  clear(): void {
    for (const p of this.ps) p.blob.remove()
    this.ps.length = 0
  }
}
