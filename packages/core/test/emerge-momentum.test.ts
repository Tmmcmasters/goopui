import { describe, expect, it } from 'vitest'
import {
  EMERGE_CIRCLES,
  EMERGE_MOMENTUM,
  EMERGE_MOMENTUM_CIRCLES,
  EMERGE_MOMENTUM_DRIPS,
  EMERGE_MOMENTUM_NECKS,
  EMERGE_DRIP_KNOBS,
  EMERGE_BULGE_SLOTS,
  EMERGE_BULGE_CIRCLES,
  EMERGE_MOUND_CIRCLES,
  emergeBloomBulges,
  emergeBridge,
  emergeDetachedBridge,
  emergeDripCount,
  emergeDripKnob,
  emergeCloseSlosh,
  emergeMomentum,
  emergeMomentumEnd,
  emergeMomentumStrength,
  emergePose,
  emergeRestPose,
  emergeSloshOffset,
  EMERGE_FEEL,
  type EmergeDripOptions,
  type EmergeMomentumEffects,
  type EmergeRect,
  type EmergeSide,
} from '../src'

const SIDES: EmergeSide[] = ['top', 'right', 'bottom', 'left']
const trigger: EmergeRect = { x: 400, y: 300, width: 120, height: 36 }
const panelFor = (side: EmergeSide): EmergeRect => {
  const w = 288
  const h = 120
  const cx = trigger.x + trigger.width / 2
  const cy = trigger.y + trigger.height / 2
  if (side === 'bottom') return { x: cx - w / 2, y: trigger.y + trigger.height + 4, width: w, height: h }
  if (side === 'top') return { x: cx - w / 2, y: trigger.y - 4 - h, width: w, height: h }
  if (side === 'right') return { x: trigger.x + trigger.width + 4, y: cy - h / 2, width: w, height: h }
  return { x: trigger.x - 4 - w, y: cy - h / 2, width: w, height: h }
}
const feel = EMERGE_FEEL.playful
/** The composed open pose at `sec` (as attachEmerge draws it). */
const openAt = (side: EmergeSide, sec: number, fx: EmergeMomentumEffects & EmergeDripOptions = {}, seed = 1) => {
  const b = emergeBridge(trigger, panelFor(side), side, feel)
  const base = sec >= feel.open ? emergeRestPose(b) : emergePose(sec / feel.open, b, 'open', feel)
  return {
    b,
    base,
    pose: emergeMomentum(base, b, 'open', sec, fx, {
      seed,
      bodyAt: (s) => emergePose(s / feel.open, b, 'open', feel).body,
    }),
  }
}
const extra = (circles: { r: number }[]) => circles.slice(EMERGE_CIRCLES)
/** The burst's drop circles (after bulge, ripple and necks). */
const DROPS_AT = EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES - EMERGE_MOMENTUM_DRIPS
const drops = <T extends { r: number }>(circles: T[]) => circles.slice(DROPS_AT)
/** Most drops alive at once over the open (slosh off). */
const peakDrops = (side: EmergeSide, fx: EmergeMomentumEffects & EmergeDripOptions = {}) =>
  Math.max(...times(emergeMomentumEnd('open'), 80).map((s) => drops(openAt(side, s, { openSlosh: false, ...fx }).pose.circles).filter((c) => c.r > 0).length))
const times = (end: number, n = 120) => Array.from({ length: n + 1 }, (_, i) => (end * i) / n)

describe('emergeMomentum', () => {
  it('strength: true/undefined = 1, false = 0, numbers clamp to 0..2', () => {
    expect(emergeMomentumStrength(undefined)).toBe(1)
    expect(emergeMomentumStrength(true)).toBe(1)
    expect(emergeMomentumStrength(false)).toBe(0)
    expect(emergeMomentumStrength(5)).toBe(2)
    expect(emergeMomentumStrength(-1)).toBe(0)
  })

  it('open slosh bulges out, rebounds, wobbles and decays to exactly zero', () => {
    const end = EMERGE_MOMENTUM.slosh.start + EMERGE_MOMENTUM.slosh.duration
    const d = times(end + 0.2, 400).map((s) => emergeSloshOffset(s, 15, 1))
    const first = d.findIndex((v) => Math.abs(v) > 0.5)
    expect(d[first]).toBeGreaterThan(0) // outward first
    // A low swell: about half a bulb radius at its peak.
    expect(Math.max(...d)).toBeGreaterThan(5)
    expect(Math.max(...d)).toBeLessThanOrEqual(EMERGE_MOMENTUM.slosh.amp * 15 * 1.02)
    expect(Math.min(...d)).toBeLessThan(-1) // rebound
    let flips = 0
    for (let i = 1; i < d.length; i++) if (Math.sign(d[i]!) * Math.sign(d[i - 1]!) < 0) flips++
    expect(flips).toBeGreaterThanOrEqual(3)
    expect(emergeSloshOffset(end, 15, 1)).toBe(0)
    expect(emergeSloshOffset(end + 1, 15, 1)).toBe(0)
    // Peaks shrink.
    const tail = d.slice(Math.floor(d.length * 0.6)).map(Math.abs)
    expect(Math.max(...tail)).toBeLessThan(Math.max(...d) * 0.35)
  })

  it('slosh bulges only push out of their edge, never past the panel sides (tall panels)', () => {
    // A dropdown-like panel taller than it is wide: the bulge is breadth-limited, and its
    // flank circles once poked past the sides as big lobes for the whole slosh.
    const tall = (side: EmergeSide): EmergeRect => {
      const p = panelFor(side)
      const vertical = side === 'top' || side === 'bottom'
      return vertical ? { ...p, width: 182, height: 172 } : { ...p, width: 172, height: 182 }
    }
    const BULGE = EMERGE_BULGE_CIRCLES
    for (const side of SIDES) {
      const b = emergeBridge(trigger, tall(side), side, feel)
      const vertical = side === 'top' || side === 'bottom'
      const check = (circles: { x: number; y: number; r: number }[]) => {
        for (const c of circles.slice(EMERGE_CIRCLES, EMERGE_CIRCLES + BULGE)) {
          if (c.r <= 0) continue
          const cross = vertical ? c.x : c.y
          expect(cross - c.r).toBeGreaterThanOrEqual(0)
          expect(cross + c.r).toBeLessThanOrEqual(b.breadth)
        }
      }
      let seen = 0
      for (const s of times(EMERGE_MOMENTUM.slosh.start + EMERGE_MOMENTUM.slosh.duration, 120)) {
        if (s < feel.open) continue
        const pose = emergeMomentum(emergeRestPose(b), b, 'open', s, { openDrips: false })
        seen += extra(pose.circles).slice(0, BULGE).filter((c) => c.r > 0).length
        check(pose.circles)
      }
      expect(seen).toBeGreaterThan(0)
      for (const s of times(EMERGE_MOMENTUM.close.duration, 40)) {
        check(emergeMomentum(emergePose(0.05, b, 'close', feel), b, 'close', s).circles)
      }
    }
  })

  it('close slosh decays to zero within its duration', () => {
    const end = EMERGE_MOMENTUM.close.duration
    const v = times(end, 100).map((s) => emergeCloseSlosh(s, 15, 1))
    expect(Math.max(...v.map((x) => Math.abs(x.near)))).toBeGreaterThan(1)
    expect(emergeCloseSlosh(end, 15, 1)).toEqual({ near: 0, lag: 0 })
  })

  it('circle count is stable on every side, phase and time', () => {
    for (const side of SIDES) {
      for (const s of times(emergeMomentumEnd('open') + 0.3, 60)) {
        expect(openAt(side, s).pose.circles).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
      }
      const b = emergeBridge(trigger, panelFor(side), side, feel)
      for (const s of times(0.4, 20)) {
        const p = emergeMomentum(emergePose(s / feel.close, b, 'close', feel), b, 'close', s)
        expect(p.circles).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
      }
    }
  })

  it('drops are zero-radius at the start and once they fade, and present in between', () => {
    for (const side of SIDES) {
      expect(extra(openAt(side, 0).pose.circles).every((c) => c.r === 0)).toBe(true)
      const end = emergeMomentumEnd('open')
      expect(extra(openAt(side, end).pose.circles).every((c) => c.r === 0)).toBe(true)
      expect(extra(openAt(side, end + 1).pose.circles).every((c) => c.r === 0)).toBe(true)
      const mid = times(end, 60).map((s) => extra(openAt(side, s, { openSlosh: false }).pose.circles).filter((c) => c.r > 0).length)
      expect(Math.max(...mid)).toBeGreaterThanOrEqual(2)
    }
  })

  it('drops fly out past the far edge, then fall screen-down', () => {
    const pick = (s: number) => drops(openAt('right', s, { openSlosh: false }).pose.circles)
    const early = pick(0.32)
    const late = pick(0.5)
    const live = early.map((c, i) => ({ c, l: late[i]! })).filter(({ c, l }) => c.r > 0 && l.r > 0)
    expect(live.length).toBeGreaterThan(3)
    for (const { c, l } of live) {
      expect(c.x).toBeGreaterThan(288) // outside the panel's far (right) edge
      expect(l.y).toBeGreaterThan(c.y) // gravity
    }
  })

  it('the burst covers the whole far edge, on every side', () => {
    for (const side of SIDES) {
      const { b } = openAt(side, 0)
      const vertical = side === 'top' || side === 'bottom'
      const cross: number[] = []
      for (const s of times(0.3, 60)) {
        for (const c of drops(openAt(side, s, { openSlosh: false }).pose.circles)) if (c.r > 0) cross.push(vertical ? c.x : c.y)
      }
      expect(Math.min(...cross)).toBeLessThan(b.breadth * 0.15)
      expect(Math.max(...cross)).toBeGreaterThan(b.breadth * 0.85)
    }
  })

  it('a lot of drops: many more than the old few, a size mix of globs and specks', () => {
    expect(peakDrops('bottom')).toBeGreaterThanOrEqual(10)
    const sizes = drops(openAt('bottom', 0.27, { openSlosh: false }).pose.circles).filter((c) => c.r > 0).map((c) => c.r)
    expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(2)
    // Variety 0: all alike (no neck swell difference after release, same class size).
    const flat = drops(openAt('bottom', 0.3, { openSlosh: false, openDripVariety: 0 }).pose.circles).filter((c) => c.r > 0).map((c) => c.r)
    expect(Math.max(...flat) / Math.min(...flat)).toBeLessThan(1.3)
  })

  it('count scales with amount, strength, edge and preset, within the budget', () => {
    expect(emergeDripCount(288, 1, 'playful', 2)).toBeGreaterThan(emergeDripCount(288, 1, 'playful', 1))
    expect(emergeDripCount(288, 1, 'playful', 0.5)).toBeLessThan(emergeDripCount(288, 1, 'playful', 1))
    expect(emergeDripCount(288, 1, 'playful', 0)).toBe(0)
    expect(emergeDripCount(288, 0, 'playful', 1)).toBe(0)
    expect(emergeDripCount(288, 2, 'playful')).toBeGreaterThan(emergeDripCount(288, 1, 'playful'))
    expect(emergeDripCount(100, 1)).toBeLessThan(emergeDripCount(300, 1))
    expect(emergeDripCount(288, 1, 'subtle')).toBeLessThanOrEqual(6)
    expect(emergeDripCount(288, 1, 'subtle')).toBeLessThan(emergeDripCount(288, 1, 'playful'))
    expect(emergeDripCount(288, 1, 'wild')).toBeGreaterThan(emergeDripCount(288, 1, 'playful'))
    expect(emergeDripCount(5000, 2, 'wild', 3)).toBe(EMERGE_MOMENTUM_DRIPS)
    expect(peakDrops('bottom', { openDripAmount: 2 })).toBeGreaterThan(peakDrops('bottom', { openDripAmount: 0.5 }))
    expect(peakDrops('bottom', { openDripAmount: 0 })).toBe(0)
    expect(EMERGE_MOMENTUM_NECKS).toBeGreaterThan(0)
  })

  it('size and fling knobs scale the drops; knobs clamp to their ranges', () => {
    const at = (fx: EmergeDripOptions, s = 0.4) => drops(openAt('bottom', s, { openSlosh: false, ...fx }).pose.circles).filter((c) => c.r > 0)
    const sum = (cs: { r: number }[]) => cs.reduce((a, c) => a + c.r, 0)
    expect(sum(at({ openDripSize: 2 }))).toBeGreaterThan(sum(at({ openDripSize: 0.5 })))
    // Fling: higher fling carries drops further out (bottom side: + y), even after gravity.
    const reach = (fx: EmergeDripOptions) => Math.max(...at(fx, 0.3).map((c) => c.y))
    expect(reach({ openDripFling: 2.5 })).toBeGreaterThan(reach({ openDripFling: 0.3 }) + 20)
    expect(emergeDripKnob('openDripAmount', undefined)).toBe(EMERGE_DRIP_KNOBS.openDripAmount.default)
    expect(emergeDripKnob('openDripVariety', 9)).toBe(1)
    expect(emergeDripKnob('openDripSize', -1)).toBe(EMERGE_DRIP_KNOBS.openDripSize.min)
  })

  it('every drop fades to zero by the end, at any knob setting', () => {
    const end = emergeMomentumEnd('open')
    for (const fx of [{}, { openDrips: 2, openDripAmount: 3, openDripSize: 2.5, openDripFling: 3, openDripVariety: 1 }, { openDripVariety: 0 }] as const) {
      for (const seed of [1, 2, 7]) {
        expect(extra(openAt('bottom', end, fx, seed).pose.circles).every((c) => c.r === 0)).toBe(true)
        expect(extra(openAt('top', end - 0.001, fx, seed).pose.circles).every((c) => c.r < 1.5)).toBe(true)
      }
    }
  })

  it('toggles disable: nothing added, body untouched', () => {
    const off = { openSlosh: false, openDrips: false, closeSlosh: false, openDripAmount: 3 }
    for (const side of SIDES) {
      for (const s of times(emergeMomentumEnd('open'), 40)) {
        const { pose, base } = openAt(side, s, off)
        expect(extra(pose.circles).every((c) => c.r === 0)).toBe(true)
        expect(pose.body).toEqual(base.body)
      }
      const b = emergeBridge(trigger, panelFor(side), side, feel)
      const base = emergePose(0.3, b, 'close', feel)
      const p = emergeMomentum(base, b, 'close', 0.1, off)
      expect(p.body).toEqual(base.body)
      expect(extra(p.circles).every((c) => c.r === 0)).toBe(true)
    }
  })

  it('at rest (after everything settles) the pose is the plain rest pose', () => {
    const { pose, base } = openAt('bottom', emergeMomentumEnd('open') + 0.01)
    expect(pose.body).toEqual(base.body)
    expect(extra(pose.circles).every((c) => c.r === 0)).toBe(true)
  })

  it('strength scales the slosh; subtle < playful < wild', () => {
    const peak = (k: number, p: 'subtle' | 'playful' | 'wild' = 'playful') =>
      Math.max(...times(1, 300).map((s) => emergeSloshOffset(s, 15, k, p)))
    expect(peak(2)).toBeGreaterThan(peak(1))
    expect(peak(0)).toBe(0)
    expect(peak(1, 'subtle')).toBeLessThan(peak(1, 'playful'))
    expect(peak(1, 'wild')).toBeGreaterThan(peak(1, 'playful'))
  })
})

describe('bloom slosh variety', () => {
  const panel: EmergeRect = { x: 300, y: 200, width: 420, height: 260 }
  const b = emergeDetachedBridge(panel, feel)
  const rest = emergeRestPose(b)
  const slosh = (sec: number, seed: number, fx: EmergeDripOptions = {}) =>
    emergeMomentum(rest, b, 'open', sec, { openDrips: false, ...fx }, { bloom: true, seed }).circles.slice(EMERGE_CIRCLES, EMERGE_CIRCLES + EMERGE_BULGE_CIRCLES)

  it('profiles are fixed per seed, vary between seeds, and average the preset strength', () => {
    expect(emergeBloomBulges(7)).toEqual(emergeBloomBulges(7))
    expect(emergeBloomBulges(7)).not.toEqual(emergeBloomBulges(8))
    let doubles = 0
    let barely = 0
    for (let seed = 1; seed <= 200; seed++) {
      const p = emergeBloomBulges(seed)
      const peaks = p.map((s) => s.amp * Math.max(...s.lumps.map((l) => l.height)))
      expect(peaks.reduce((a, x) => a + x, 0) / 4).toBeCloseTo(1, 6)
      const slots = p.flatMap((s) => s.lumps.map((l) => l.slot))
      expect(new Set(slots).size).toBe(slots.length)
      expect(Math.max(...slots)).toBeLessThan(EMERGE_BULGE_SLOTS)
      for (const s of p) {
        expect(s.lag).toBeGreaterThanOrEqual(0)
        expect(s.lag).toBeLessThanOrEqual(0.07)
        for (const l of s.lumps) {
          expect(l.at).toBeGreaterThanOrEqual(0.2 - 1e-9)
          expect(l.at).toBeLessThanOrEqual(0.8 + 1e-9)
        }
        if (s.lumps.length === 2) doubles++
        if (s.amp < 0.4) barely++
      }
      // The sides don't peak together.
      expect(new Set(p.map((s) => s.lag)).size).toBe(4)
    }
    expect(doubles).toBeGreaterThan(80)
    expect(barely).toBeGreaterThan(40)
  })

  it('variety 0: one centred lump per side, the fixed stagger, even strength', () => {
    for (const s of emergeBloomBulges(9, 0)) {
      expect(s.amp).toBeCloseTo(1, 9)
      expect(s.lumps).toHaveLength(1)
      expect(s.lumps[0]).toMatchObject({ at: 0.5, width: 1, height: 1 })
    }
    expect(emergeBloomBulges(9, 0).map((s) => s.lag)).toEqual([...EMERGE_MOMENTUM.bloom.lag])
    // The top bulge sits on the top edge's middle.
    const top = times(0.6, 60).map((s) => slosh(s, 9, { sloshVariety: 0 })[(EMERGE_MOUND_CIRCLES - 1) / 2]!).filter((c) => c.r > 0)
    expect(top.length).toBeGreaterThan(0)
    for (const c of top) expect(c.x).toBeCloseTo(b.width / 2, 6)
  })

  it('every bulge is a low, wide, gentle mound: no knob, no kink where it meets the edge', () => {
    // Height of the circles' outline above the top edge (y = 0) at x.
    const outline = (cs: { x: number; y: number; r: number }[], x: number) =>
      Math.max(0, ...cs.filter((c) => c.r > 0 && Math.abs(x - c.x) < c.r).map((c) => Math.sqrt(c.r * c.r - (x - c.x) ** 2) - c.y))
    let checked = 0
    for (const sec of times(0.6, 120)) {
      const top = slosh(sec, 9, { sloshVariety: 0 }).slice(0, EMERGE_MOUND_CIRCLES)
      const xs = Array.from({ length: 421 }, (_, i) => i)
      const h = xs.map((x) => outline(top, x))
      const peak = Math.max(...h)
      if (peak < 3) continue
      checked++
      // Low: at most maxPx (11); wide: its base spans well over a third of the side.
      expect(peak).toBeLessThanOrEqual(EMERGE_MOMENTUM.slosh.maxPx + 0.5)
      const base = h.filter((v) => v > 0.25).length
      expect(base).toBeGreaterThan(b.width * 0.4)
      expect(base / peak).toBeGreaterThan(20)
      // Gentle: never steeper than ~20 degrees; one swell (rises, then falls, no dips).
      for (let i = 1; i < h.length; i++) expect(Math.abs(h[i]! - h[i - 1]!)).toBeLessThan(0.36)
      const top0 = h.indexOf(peak)
      for (let i = 1; i <= top0; i++) expect(h[i]! - h[i - 1]!).toBeGreaterThan(-0.3)
      for (let i = top0 + 1; i < h.length; i++) expect(h[i]! - h[i - 1]!).toBeLessThan(0.3)
    }
    expect(checked).toBeGreaterThan(3)
  })

  it('varied: the bulges sit off-centre and differ per open, inside each side', () => {
    const spots = new Set<number>()
    for (let seed = 1; seed <= 8; seed++) {
      for (const sec of times(0.6, 40)) {
        for (const c of slosh(sec, seed)) {
          if (c.r <= 0) continue
          spots.add(Math.round(c.x / 10) * 100 + Math.round(c.y / 10))
          // Never past a corner: a lump only pokes out of its own side.
          const outX = c.x - c.r < -0.5 || c.x + c.r > b.width + 0.5
          const outY = c.y - c.r < -0.5 || c.y + c.r > b.height + 0.5
          expect(outX && outY).toBe(false)
        }
      }
    }
    expect(spots.size).toBeGreaterThan(12)
  })

  it('strength per preset is kept: the biggest push is about the centred bulge', () => {
    const reach = (fx: EmergeDripOptions, seed: number) =>
      Math.max(...times(0.6, 80).flatMap((s) => slosh(s, seed, fx).filter((c) => c.r > 0).map((c) => Math.max(-(c.y - c.r), c.y + c.r - b.height, -(c.x - c.r), c.x + c.r - b.width))), 0)
    const even = reach({ sloshVariety: 0 }, 1)
    let sum = 0
    for (let seed = 1; seed <= 12; seed++) sum += reach({}, seed)
    expect(even).toBeGreaterThan(3)
    expect(sum / 12).toBeGreaterThan(even * 0.8)
    expect(sum / 12).toBeLessThan(even * 1.6)
  })
})
