// Shared goo-toggle pieces: the impact splat, splash droplets and the snapping goo bridge.
//
// Pure math, no DOM. Born in the switch (switch.ts) and generalised to any impact direction so
// the checkbox (a drop landing in the box) and the radio group (a blob jumping between items)
// land, splat and splash the same way.

/** One circle, host px. sx/sy stretch it (1 = round). */
export interface GooCircle {
  x: number
  y: number
  r: number
  sx: number
  sy: number
}

export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
/** Smoothstep over 0..1 (input clamped). */
export const smooth01 = (x: number): number => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
/** A zero-radius (hidden) circle parked at (x, y). */
export const noCircle = (x: number, y: number): GooCircle => ({ x, y, r: 0, sx: 1, sy: 1 })

/** Splat / splash shape constants (feel-independent). Distances are in blob radii. */
export const GOO_SPLAT = Object.freeze({
  /** Wobble frequency, Hz (about 2.5 wobbles over a 0.6s settle). */
  freq: 4.4,
  /** Wobble damping per second. */
  damping: 5.5,
  /** Along-impact squash per unit of splat (along = 1 - flatten * q). */
  flatten: 0.45,
  /** Across-impact bulge per unit of splat (across = 1 + bulge * q). */
  bulge: 0.3,
  /** Rebound: how far the blob springs back off the wall at the first rebound. */
  rebound: 0.5,
  /** Wall-corner circle radius (squares off the side touching the wall). */
  corner: 0.42,
  /** Impacts weaker than this throw no droplets (0..1, short interrupted moves). */
  dropMinImpact: 0.3,
  /** Per droplet, in priority order: side (top = -1 across the impact), size (r), apex height
   *  (r), outward reach past the launch point (r), extra fall below the launch (r), flight (s,
   *  at settle 0.6), delay (s), and whether it lands back in the goo (merge) or shrinks away. */
  drops: Object.freeze([
    Object.freeze({ top: true, size: 0.36, height: 1.7, reach: 0.55, fall: 0, flight: 0.42, delay: 0, merge: true }),
    Object.freeze({ top: false, size: 0.27, height: 0.45, reach: 0.9, fall: 1.1, flight: 0.34, delay: 0.012, merge: false }),
    Object.freeze({ top: true, size: 0.24, height: 2.2, reach: 1.35, fall: 0.3, flight: 0.5, delay: 0.022, merge: false }),
    Object.freeze({ top: true, size: 0.2, height: 1.15, reach: -0.2, fall: 0, flight: 0.33, delay: 0.035, merge: true }),
  ]),
})

/** Most splash droplets one impact throws. */
export const GOO_SPLASH_MAX = GOO_SPLAT.drops.length

/** Splat deformation `a` seconds after impact: > 0 flattened against the wall, < 0 rebounding
 *  (stretched off it). Starts at 0, exactly 0 from `settle` on. `jelly` scales the wobble
 *  after the first flatten. */
export function splatCurve(a: number, settle: number, jelly = 1): number {
  if (a <= 0 || a >= settle) return 0
  const { freq, damping } = GOO_SPLAT
  const ph = 2 * Math.PI * freq * a
  const g = Math.sin(ph) * Math.exp(-damping * a) * (1 - a / settle)
  return ph < Math.PI ? g : g * jelly
}

/** Scale along / across the impact axis for splat `q` (> 0 flat, < 0 rebounding). */
export function splatAxes(q: number): { along: number; across: number } {
  return { along: Math.max(0.45, 1 - GOO_SPLAT.flatten * q), across: 1 + GOO_SPLAT.bulge * q }
}

/** Seconds of settle after impact, as toggle progress past `impactT` (the end of a toggle
 *  that splats or splashes; 1 when neither runs). */
export function splatToggleEnd(impactT: number, settle: number, duration: number, splats: boolean): number {
  if (!splats) return 1
  return Math.max(1, impactT + settle / Math.max(0.01, duration))
}

/** Splash strength settings (a subset of every goo toggle's feel). */
export interface SplashFeel {
  /** Seconds from impact until the droplets have settled. */
  settle: number
  /** Splash droplet strength (size and flight height). */
  droplets: number
  /** Droplets per impact at strength 1 (2..4). */
  dropCount: number
}

/** Where and which way the droplets launch. Gravity is always screen-down. */
export interface SplashFrame {
  /** Launch center, host px. */
  x: number
  y: number
  /** Radius of the blob that hit (droplet sizes and distances scale with it). */
  r: number
  /** Launch offset for side +1 (side -1 / "top" drops mirror it). */
  tx: number
  ty: number
  /** Outward flight direction (unit) for a drop on side -1 and side +1. */
  out: (side: -1 | 1) => readonly [number, number]
}

/** Splash droplets `age` seconds after impact. Each necks off the blob, flies a parabola
 *  (constant outward speed, screen-down gravity) and either lands back in the goo or shrinks
 *  away. All r = 0 outside their flight, and all `GOO_SPLASH_MAX` are always returned. */
export function splashDrops(
  age: number,
  done: boolean,
  frame: SplashFrame,
  impact: number,
  feel: SplashFeel,
  amount: number,
): GooCircle[] {
  const { r } = frame
  const strength = amount * feel.droplets
  const count =
    strength > 0 && impact >= GOO_SPLAT.dropMinImpact && !done
      ? Math.min(GOO_SPLASH_MAX, Math.max(2, Math.round(feel.dropCount * Math.min(amount, 1.4))))
      : 0
  // Flight distances grow with the hit, sizes a little; capped so the layer padding holds them.
  const reach = Math.min(1.35, Math.sqrt(strength) * (0.55 + 0.45 * impact))
  const grow = Math.min(1.25, 0.8 + 0.2 * strength)
  const time = feel.settle / 0.6
  const out: GooCircle[] = []
  for (let i = 0; i < GOO_SPLASH_MAX; i++) {
    const d = GOO_SPLAT.drops[i]!
    const flight = d.flight * time
    const s = (age - d.delay * time) / flight
    const rest = noCircle(frame.x, frame.y)
    if (i >= count || s <= 0 || s >= 1) {
      out.push(rest)
      continue
    }
    const side = d.top ? -1 : 1
    const [ox, oy] = frame.out(side)
    const x0 = frame.x + side * frame.tx
    const y0 = frame.y + side * frame.ty
    const x = x0 + ox * r * d.reach * reach * s
    const y = y0 + oy * r * d.reach * reach * s - 4 * r * d.height * reach * s * (1 - s) + r * d.fall * reach * s * s
    // Neck off (grow out of the blob), then sink back into the goo or shrink away.
    const fade = d.merge ? 1 - smooth01((s - 0.72) / 0.28) : 1 - smooth01((s - 0.5) / 0.5)
    const rr = r * d.size * grow * smooth01(s / 0.2) * fade
    // Fat and globby: a touch squashed along the flight at launch, round in the air.
    const st = 1 + 0.18 * (1 - smooth01(s / 0.35))
    out.push(rr > 0.01 ? { x, y, r: rr, sx: 1 / st, sy: st } : rest)
  }
  return out
}

/** Neck circles in a goo bridge. */
export const GOO_BRIDGE_NECKS = 3

/** A goo bridge: the blob's back stays stuck at `from` while the head leaves, joined by a neck
 *  that thins, then snaps at `snapU`; the stub recoils behind `from` and shrinks away.
 *  `u` is travel progress 0..1, (dx, dy) the unit travel direction, `back` the head's trailing
 *  edge. `fat` scales the neck (1 = the switch's neck). */
export function gooBridge(
  u: number,
  from: { x: number; y: number },
  back: { x: number; y: number },
  dir: { x: number; y: number },
  r: number,
  bridge: number,
  fat = 1,
): { anchor: GooCircle; necks: GooCircle[]; held: boolean; snapU: number } {
  const anchorRest = noCircle(from.x, from.y)
  const necks: GooCircle[] = Array.from({ length: GOO_BRIDGE_NECKS }, () => noCircle(from.x, from.y))
  const snapU = clamp(0.45 + 0.22 * Math.min(bridge, 1.5), 0.3, 0.85)
  if (!(bridge > 0)) return { anchor: anchorRest, necks, held: false, snapU }
  const ra = r * (0.8 - 0.3 * u) * Math.min(1, 0.6 + 0.4 * bridge)
  if (u < snapU) {
    const q = u / snapU
    const nr = r * 0.42 * fat * (1 - 0.45 * q)
    for (let i = 0; i < GOO_BRIDGE_NECKS; i++) {
      const f = (i + 1) / (GOO_BRIDGE_NECKS + 1)
      // Thinnest in the middle, like a real neck.
      necks[i] = {
        x: from.x + (back.x - from.x) * f,
        y: from.y + (back.y - from.y) * f,
        r: nr * (1 - 0.3 * (1 - Math.abs(2 * f - 1))),
        sx: 1,
        sy: 1,
      }
    }
    return { anchor: { x: from.x, y: from.y, r: ra, sx: 1, sy: 1 }, necks, held: true, snapU }
  }
  const v = smooth01((u - snapU) / 0.3)
  return {
    anchor: { x: from.x - dir.x * r * 0.3 * v, y: from.y - dir.y * r * 0.3 * v, r: ra * (1 - v), sx: 1, sy: 1 },
    necks,
    held: false,
    snapU,
  }
}

/** Resolve one effect option: true = 1, false = 0, a number = that multiplier. */
export function gooEffectValue(v: boolean | number | undefined): number {
  if (v === undefined || v === true) return 1
  if (v === false) return 0
  return Number.isFinite(v) ? Math.max(0, v) : 1
}
