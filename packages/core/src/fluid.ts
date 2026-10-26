// Tiny particle fluid for splashes and shockwaves. Pure sim: emits plain circle data through
// GoopBlob, so the SVG filter (or a canvas renderer) merges neighbors into continuous goo.
//
// Model (position-based, so it stays stable at any frame time):
//   1. Integrate: gravity, air drag (exact exponential), predict positions.
//   2. Cohesion: every neighbor pair within `reach` is pulled/pushed toward a rest distance
//      with a clamped position correction weighted by (1 - d/reach). Pairs stretched past
//      `reach` stop interacting -> strings thin and SNAP instead of stretching forever.
//   3. Velocity = moved distance / dt (PBD), then XSPH viscosity: neighbors share velocity,
//      which keeps clumps and tendrils moving as one (oil) or barely at all (water).
//   Neighbor search uses a uniform spatial hash with cell size = max reach.
//
// Lifecycle: a particle flies until it slows down (or flies too long), then it DRIPS: lower
// drag so gravity wins, and its radius drains with the same continuous ease onto the goo
// vanish radius as falling drops (then a short tail to 0 so merged clusters shrink rather
// than pop).

import { GOOP_PHYSICS } from './constants'
import type { GoopBlob } from './renderer'
import { clamp, lerp } from './spring'

const P = GOOP_PHYSICS

/** Physical parameters for a given oiliness (0 = water, 1 = oil). */
export function fluidParams(oiliness: number, viscosity = 1) {
  const o = clamp(oiliness, 0, 1)
  const L = (r: readonly [number, number]) => lerp(r[0], r[1], o)
  return {
    cohesion: L(P.cohesion),
    viscosity: clamp(L(P.fluidViscosity) * Math.sqrt(viscosity), 0, 0.45),
    drag: L(P.fluidDrag) * Math.sqrt(viscosity),
    speed: L(P.fluidSpeed) / Math.sqrt(viscosity),
    reach: L(P.fluidReach),
    size: L(P.particleSize),
  }
}

export interface ParticleSpawn {
  x: number
  y: number
  vx: number
  vy: number
  /** Radius (px). */
  r: number
  /** 0 = water, 1 = oil. */
  oiliness: number
  /** Gravity (px/s^2), downward. */
  gravity: number
  /** Sideways gravity (px/s^2), e.g. from device tilt. Default 0. */
  gravityX?: number
  /** The goo vanish radius of the filter this particle is drawn under (see gooVanishRadius). */
  vanish: number
  /** Viscosity multiplier (the element's --goop-viscosity). */
  viscosity?: number
  /** Multiplies flight drag (escape mode flies further). */
  dragScale?: number
  /** Random in [0,1) for lifetime jitter. */
  rand?: number
  /** CSS color for renderers that need it per circle (shared overlay). */
  color?: string
  /** Chain this particle to the previously spawned one (stringiness): a persistent bond
   *  that keeps strings together until stretched past `bondBreak` x its rest length. */
  bond?: boolean
  /** Bond stiffness per 1/60 s (0..1). */
  bondStiffness?: number
  /** Snap when stretched past this multiple of the rest length. */
  bondBreak?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  px: number
  py: number
  r0: number
  rs: number
  age: number
  /** <0 = flying, else seconds into the drip phase. */
  drip: number
  dripLife: number
  k: number
  visc: number
  drag: number
  reach: number
  g: number
  gx: number
  vanish: number
  nbrs: number
  blob: GoopBlob
  dead: boolean
  bond: Particle | null
  bondRest: number
  bondK: number
  bondBreak: number
  color?: string
}

/** Where a particle touched the floor (see ParticleFluid.floor / onLand). */
export interface ParticleLanding {
  x: number
  y: number
  r: number
  vx: number
  vanish: number
  color?: string
}

/** Optional soft box (same space as particles). Outside it particles are braked hard and
 *  drain faster: keeps 'near' splashes inside the padded goo layer. */
export interface FluidBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

let globalLive = 0
/** Live particles across every fluid on the page (for caps / devtools). */
export function liveParticleCount(): number {
  return globalLive
}

/** Radius over a drain progress q in [0, 1.25]: ease onto the vanish radius by q = 1
 *  (sqrt-shaped visible size -> linear visible shrink), then a short linear tail to 0. */
export function drainRadius(rA: number, rm: number, q: number): number {
  if (q >= 1.25) return 0
  if (q >= 1) return Math.min(rA, rm) * (1 - (q - 1) / 0.25)
  if (rA <= rm) return rA * (1 - q * 0.8)
  const u = 1 - q
  return rm + (rA - rm) * u * u
}

export class ParticleFluid {
  private ps: Particle[] = []
  private grid = new Map<number, number[]>()
  private lastSpawned: Particle | null = null
  /** Optional floor (same space as particles). Particles that reach it are handed to `onLand`
   *  (which should draw a replacement circle this frame) and removed. */
  floor: number | undefined = undefined
  onLand: ((l: ParticleLanding) => void) | null = null

  constructor(
    private createBlob: (color?: string) => GoopBlob,
    readonly max: number = P.maxParticles,
  ) {}

  get count(): number {
    return this.ps.length
  }

  /** Room left under both the per-fluid and the global cap. */
  room(): number {
    return Math.max(0, Math.min(this.max - this.ps.length, P.maxParticlesGlobal - globalLive))
  }

  spawn(s: ParticleSpawn): boolean {
    if (this.room() <= 0) return false
    const f = fluidParams(s.oiliness, s.viscosity ?? 1)
    const rand = s.rand ?? Math.random()
    // Lone droplets must stay clearly above the filter's vanish radius or water spray is invisible.
    const r0 = Math.max(s.r, s.vanish * 1.35)
    const prev = s.bond && this.lastSpawned && !this.lastSpawned.dead ? this.lastSpawned : null
    const p: Particle = {
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      px: s.x,
      py: s.y,
      r0,
      rs: r0 * 0.6,
      age: 0,
      drip: -1,
      dripLife: lerp(P.dripLife[0], P.dripLife[1], rand) * Math.sqrt(s.viscosity ?? 1),
      k: f.cohesion,
      visc: f.viscosity,
      drag: f.drag * (s.dragScale ?? 1),
      reach: f.reach * r0,
      g: s.gravity,
      gx: s.gravityX ?? 0,
      vanish: s.vanish,
      nbrs: 0,
      blob: this.createBlob(s.color),
      dead: false,
      bond: prev,
      bondRest: prev ? Math.max(r0, Math.hypot(prev.x - s.x, prev.y - s.y)) : 0,
      bondK: clamp(s.bondStiffness ?? 0, 0, 0.9),
      bondBreak: Math.max(1.2, s.bondBreak ?? 3),
      color: s.color,
    }
    this.ps.push(p)
    this.lastSpawned = p
    globalLive++
    return true
  }

  /**
   * Advance by dt seconds (any size: split into substeps) and draw, subtracting (ox, oy) from
   * positions (e.g. page -> viewport scroll). Returns true while particles remain.
   */
  step(dt: number, bounds?: FluidBounds, ox = 0, oy = 0): boolean {
    if (this.ps.length === 0) return false
    const n = dt > 0 ? Math.max(1, Math.ceil(dt / P.fluidSubstep - 1e-9)) : 0
    const h = dt / n
    // Stiffness/viscosity are tuned per 1/60 s; convert to this substep so the result
    // doesn't depend on how many substeps run.
    const kScale = h * 60
    for (let i = 0; i < n; i++) this.substep(h, kScale, bounds)
    // Draw + retire.
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i]!
      const crowd = 0.8 + 0.2 * Math.min(1, p.nbrs / 2) // lonely bits of a string thin out
      const target = Math.max(p.r0 * crowd, Math.min(p.r0, p.vanish * 1.3))
      p.rs += (target - p.rs) * (1 - Math.exp(-dt / 0.06))
      let r = p.rs
      // A stretched chain link thins (volume ~ r^2 * length), but stays visible.
      if (p.bond && !p.bond.dead) {
        const d = Math.hypot(p.bond.x - p.x, p.bond.y - p.y)
        if (d > p.bondRest) r = Math.max(p.vanish * 1.1, r * Math.sqrt(p.bondRest / d))
      }
      if (p.drip >= 0) {
        const q = (p.drip / p.dripLife) * 1.25
        if (q >= 1.25) {
          this.kill(i)
          continue
        }
        r = drainRadius(r, p.vanish * 0.98, q)
      }
      if (this.floor !== undefined && this.onLand && p.vy > 0 && p.y + r >= this.floor && r > 0.3) {
        this.onLand({ x: p.x, y: this.floor, r, vx: p.vx, vanish: p.vanish, color: p.color })
        this.kill(i)
        continue
      }
      const stretch = 1 + Math.min(P.dropMaxStretch, Math.abs(p.vy) * P.dropStretch * 0.6)
      p.blob.set(p.x - ox, p.y - oy, r, 1, 1 / Math.sqrt(stretch), stretch)
    }
    return this.ps.length > 0
  }

  private substep(h: number, kScale: number, b?: FluidBounds): void {
    const ps = this.ps
    // 1. integrate + lifecycle
    let maxReach = 1
    for (const p of ps) {
      p.age += h
      const out = !!b && (p.x < b.minX || p.x > b.maxX || p.y < b.minY || p.y > b.maxY)
      if (p.drip < 0) {
        const sp = Math.hypot(p.vx, p.vy)
        if ((p.age > 0.1 && sp < P.dripSpeed) || p.age > P.maxFlight) p.drip = 0
      } else {
        p.drip += out ? h * 4 : h
      }
      // Outside the soft box: brake sideways/upward motion hard, but let it fall and drip.
      const drag = p.drip < 0 ? p.drag : P.dripDrag
      const e = Math.exp(-drag * h)
      const eb = out ? Math.exp(-(drag + 30) * h) : e
      p.vx = p.vx * eb + p.gx * h
      p.vy = p.vy * (out && p.vy < 0 ? eb : e) + p.g * h
      p.px = p.x
      p.py = p.y
      p.x += p.vx * h
      p.y += p.vy * h
      p.nbrs = 0
      if (p.reach > maxReach) maxReach = p.reach
    }
    // 2. spatial hash
    const cell = maxReach
    const grid = this.grid
    grid.clear()
    const key = (cx: number, cy: number) => cx * 92821 + cy
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]!
      const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell))
      const list = grid.get(k)
      if (list) list.push(i)
      else grid.set(k, [i])
    }
    // 3. cohesion (clamped position corrections) - collect pairs for viscosity
    const pairs: number[] = []
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i]!
      const cx = Math.floor(a.x / cell)
      const cy = Math.floor(a.y / cell)
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const list = grid.get(key(gx, gy))
          if (!list) continue
          for (const j of list) {
            if (j <= i) continue
            const c = ps[j]!
            const dx = c.x - a.x
            const dy = c.y - a.y
            const reach = Math.max(a.reach, c.reach)
            const d2 = dx * dx + dy * dy
            if (d2 >= reach * reach || d2 < 1e-8) continue
            const d = Math.sqrt(d2)
            const q = 1 - d / reach
            const rest = P.fluidRest * 0.5 * (a.r0 + c.r0)
            const lim = 0.2 * rest
            const k = 1 - Math.pow(1 - Math.min(a.k, c.k), kScale)
            const corr = clamp((d - rest) * k * q, -lim, lim) * 0.5
            const nx = dx / d
            const ny = dy / d
            a.x += nx * corr
            a.y += ny * corr
            c.x -= nx * corr
            c.y -= ny * corr
            a.nbrs++
            c.nbrs++
            pairs.push(i, j, q)
          }
        }
      }
    }
    // 3b. chain bonds (stringiness): distance constraints that persist until they snap
    for (const p of ps) {
      const b = p.bond
      if (!b) continue
      if (b.dead) {
        p.bond = null
        continue
      }
      const dx = b.x - p.x
      const dy = b.y - p.y
      const d = Math.hypot(dx, dy)
      if (d > p.bondRest * p.bondBreak) {
        p.bond = null // snap
        continue
      }
      if (d < 1e-6 || p.bondK <= 0) continue
      const k = 1 - Math.pow(1 - p.bondK, kScale)
      const corr = clamp((d - p.bondRest) * k, -p.bondRest, p.bondRest) * 0.5
      const nx = dx / d
      const ny = dy / d
      p.x += nx * corr
      p.y += ny * corr
      b.x -= nx * corr
      b.y -= ny * corr
      p.nbrs++
      b.nbrs++
    }
    // 4. PBD velocity
    for (const p of ps) {
      p.vx = (p.x - p.px) / h
      p.vy = (p.y - p.py) / h
    }
    // 5. XSPH viscosity (symmetric, momentum conserving, factor clamped -> stable)
    for (let t = 0; t < pairs.length; t += 3) {
      const a = ps[pairs[t]!]!
      const c = ps[pairs[t + 1]!]!
      const w = Math.min(0.5, (1 - Math.pow(1 - Math.min(a.visc, c.visc), kScale)) * pairs[t + 2]!)
      const dvx = (c.vx - a.vx) * w * 0.5
      const dvy = (c.vy - a.vy) * w * 0.5
      a.vx += dvx
      a.vy += dvy
      c.vx -= dvx
      c.vy -= dvy
    }
  }

  private kill(i: number): void {
    const p = this.ps[i]!
    p.dead = true
    p.blob.remove()
    this.ps.splice(i, 1)
    globalLive--
  }

  /** Remove everything now (reduced motion / destroy). */
  clear(): void {
    for (const p of this.ps) {
      p.dead = true
      p.blob.remove()
    }
    globalLive -= this.ps.length
    this.ps.length = 0
    this.lastSpawned = null
  }

  /** Re-create every particle's circle with a new factory (hot renderer swap). */
  rebind(createBlob: (color?: string) => GoopBlob): void {
    this.createBlob = createBlob
    for (const p of this.ps) {
      p.blob.remove()
      p.blob = createBlob(p.color)
    }
  }

  /** For tests / devtools. */
  snapshot(): { x: number; y: number; vx: number; vy: number; r: number }[] {
    return this.ps.map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, r: p.rs }))
  }
}
