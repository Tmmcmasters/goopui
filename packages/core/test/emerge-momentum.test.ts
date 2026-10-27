import { describe, expect, it } from 'vitest'
import {
  EMERGE_CIRCLES,
  EMERGE_MOMENTUM,
  EMERGE_MOMENTUM_CIRCLES,
  emergeBridge,
  emergeCloseSlosh,
  emergeMomentum,
  emergeMomentumEnd,
  emergeMomentumStrength,
  emergePose,
  emergeRestPose,
  emergeSloshOffset,
  EMERGE_FEEL,
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
const openAt = (side: EmergeSide, sec: number, fx: EmergeMomentumEffects = {}, seed = 1) => {
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
    expect(Math.max(...d)).toBeGreaterThan(8)
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
    const { pose: early } = openAt('right', 0.3, { openSlosh: false })
    const { pose: late } = openAt('right', 0.55, { openSlosh: false })
    const head = (p: typeof early) => p.circles[EMERGE_CIRCLES + 3]!
    expect(head(early).r).toBeGreaterThan(0)
    expect(head(early).x).toBeGreaterThan(288) // outside the panel's far (right) edge
    expect(head(late).y).toBeGreaterThan(head(early).y) // gravity
  })

  it('toggles disable: nothing added, body untouched', () => {
    const off = { openSlosh: false, openDrips: false, closeSlosh: false }
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
