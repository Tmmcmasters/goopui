import { afterEach, describe, expect, it } from 'vitest'
import {
  ALERT_DIALOG_SPLASH,
  BACKDROP_CLOSE_VAR,
  BACKDROP_FEEL,
  BACKDROP_LUMPS,
  DIALOG_FEEL,
  EMERGE_CIRCLES,
  EMERGE_FEEL,
  GOOP_PART_ATTR,
  activeTickerCount,
  attachBackdrop,
  attachEmerge,
  backdropDripStrength,
  backdropPose,
  emergeBloomDripCount,
  emergeBloomDuration,
  emergeDetachedBridge,
  emergeMomentum,
  emergeMomentumStrength,
  emergePose,
  emergeRestPose,
  isLoopRunning,
  type EmergeRect,
} from '../src'

const panel: EmergeRect = { x: 400, y: 200, width: 420, height: 220 }
const bloom = { flow: true, flowStyle: 'bloom' } as const

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('dialog panel (detached bloom)', () => {
  it('has no anchor to keep off and a bulb sized for a dialog', () => {
    const b = emergeDetachedBridge(panel, DIALOG_FEEL.playful)
    expect(b.anchorRect).toBeUndefined()
    expect(b.gap).toBeGreaterThan(1e5)
    expect(b.bulb).toBeGreaterThan(10)
    expect(b.bulb).toBeLessThanOrEqual(26)
  })

  it('blooms from its own center and overshoots every side, top included', () => {
    const b = emergeDetachedBridge(panel, DIALOG_FEEL.playful)
    const first = emergePose(0.02, b, 'open', DIALOG_FEEL.playful, bloom)
    expect(first.body.cx).toBeCloseTo(panel.width / 2, 5)
    expect(first.body.cy).toBeCloseTo(panel.height / 2, 5)
    let maxH = 0
    for (let t = 0; t <= 1; t += 0.01) {
      const p = emergePose(t, b, 'open', DIALOG_FEEL.playful, { ...bloom, sloshVariety: 0 })
      // Nothing trims the overshoot: with no slosh variety it stays centered.
      if (p.body.w > 0) expect(p.body.cy).toBeCloseTo(panel.height / 2, 5)
      maxH = Math.max(maxH, p.body.h)
      // Varied (the default): each side overshoots on its own, a few px off center at most.
      const v = emergePose(t, b, 'open', DIALOG_FEEL.playful, bloom, 3)
      if (v.body.w > 0) expect(Math.abs(v.body.cy - panel.height / 2)).toBeLessThanOrEqual(8)
    }
    expect(maxH).toBeGreaterThan(panel.height + 2)
    expect(emergePose(1, b, 'open', DIALOG_FEEL.playful, bloom)).toEqual(emergeRestPose(b))
  })

  it('splashes off every side, the top too (no trigger to steer around)', () => {
    const b = emergeDetachedBridge(panel, DIALOG_FEEL.playful)
    const rest = emergeRestPose(b)
    const sides = { top: 0, bottom: 0, left: 0, right: 0 }
    for (let seed = 0; seed < 4; seed++) {
      for (let sec = 0; sec < 0.9; sec += 0.02) {
        const p = emergeMomentum(rest, b, 'open', sec, { openSlosh: false }, { bloom: true, seed })
        for (const c of p.circles.slice(EMERGE_CIRCLES)) {
          if (c.r <= 0) continue
          if (c.y < -4) sides.top++
          if (c.y > b.height + 4) sides.bottom++
          if (c.x < -4) sides.left++
          if (c.x > b.width + 4) sides.right++
        }
      }
    }
    for (const n of Object.values(sides)) expect(n).toBeGreaterThan(0)
  })

  it('alert dialog splash is lighter than the dialog one', () => {
    const big = emergeBloomDripCount(panel.width, panel.height, 1, 'playful')
    const S = ALERT_DIALOG_SPLASH
    const light = emergeBloomDripCount(panel.width, panel.height, emergeMomentumStrength(S.openDrips), 'playful', S.openDripAmount)
    expect(light).toBeGreaterThan(0)
    expect(light).toBeLessThan(big / 2)
  })

  it('dialog bloom is a touch slower than the popover', () => {
    expect(emergeBloomDuration(DIALOG_FEEL.playful, 'open')).toBeGreaterThan(emergeBloomDuration(EMERGE_FEEL.playful, 'open'))
  })

  it('attachEmerge detached: forces the bloom, ignores flow: false', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const h = attachEmerge(host, { detached: true, flow: false, feel: DIALOG_FEEL, preset: 'playful' })
    expect(h.closeDuration).toBe(Math.round(emergeBloomDuration(DIALOG_FEEL.playful, 'close') * 1000))
    h.update({ flowStyle: 'neck' })
    expect(h.closeDuration).toBe(Math.round(emergeBloomDuration(DIALOG_FEEL.playful, 'close') * 1000))
    h.open()
    expect(h.state).toBe('opening')
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })
})

describe('backdropPose', () => {
  const W = 1200
  const H = 800

  it('open pours down from above the top and ends fully covered', () => {
    const start = backdropPose(0, 'open', W, H)
    expect(start.bottom).toBeLessThan(0)
    for (const c of start.lumps) if (c.r > 0) expect(c.y - c.r).toBeLessThan(0)
    let prev = -Infinity
    for (let t = 0; t <= 1; t += 0.05) {
      const p = backdropPose(t, 'open', W, H)
      expect(p.top).toBe(0)
      expect(p.bottom).toBeGreaterThanOrEqual(prev)
      prev = p.bottom
    }
    const end = backdropPose(1, 'open', W, H)
    expect(end).toMatchObject({ top: 0, bottom: H })
    expect(end.lumps.every((c) => c.r === 0)).toBe(true)
  })

  it('the leading edge drips: lumps run ahead of the sheet, unevenly', () => {
    const p = backdropPose(0.5, 'open', W, H, 1, 3)
    const live = p.lumps.filter((c) => c.r > 0)
    expect(live.length).toBeGreaterThanOrEqual(4)
    expect(live.length).toBeLessThanOrEqual(BACKDROP_LUMPS)
    const ahead = live.map((c) => c.y + c.r - p.bottom)
    expect(Math.max(...ahead)).toBeGreaterThan(20)
    expect(Math.max(...ahead) - Math.min(...ahead)).toBeGreaterThan(10)
  })

  it('drips: false keeps a straight edge', () => {
    const p = backdropPose(0.5, 'open', W, H, backdropDripStrength(false))
    expect(p.lumps.every((c) => c.r === 0)).toBe(true)
    expect(backdropDripStrength(true)).toBe(1)
    expect(backdropDripStrength(5)).toBe(2)
  })

  it('close drains off the bottom with drips trailing above', () => {
    const mid = backdropPose(0.5, 'close', W, H, 1, 3)
    expect(mid.bottom).toBe(H)
    expect(mid.top).toBeGreaterThan(0)
    expect(mid.lumps.some((c) => c.r > 0 && c.y - c.r < mid.top - 10)).toBe(true)
    const end = backdropPose(1, 'close', W, H)
    expect(end.bottom - end.top).toBe(0)
  })
})

describe('attachBackdrop', () => {
  const setup = () => {
    const host = document.createElement('div')
    document.body.append(host)
    return host
  }

  it('adds an aria-hidden goo surface; open/close run on the loop and report the drain', () => {
    const host = setup()
    const h = attachBackdrop(host, { preset: 'playful' })
    const surface = host.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="surface"]`)!
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(host.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(BACKDROP_LUMPS)
    expect(host.getAttribute('data-goop-backdrop')).toBe('closed')
    h.open()
    expect(h.state).toBe('opening')
    expect(isLoopRunning()).toBe(true)
    const ms = h.close()
    expect(h.state).toBe('closing')
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThanOrEqual(BACKDROP_FEEL.playful.close * 1000)
    expect(host.style.getPropertyValue(BACKDROP_CLOSE_VAR)).toBe(`${ms}ms`)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(host.querySelector(`[${GOOP_PART_ATTR}="surface"]`)).toBeNull()
    expect(host.hasAttribute('data-goop-backdrop')).toBe(false)
  })

  it('reduced motion: no pour, instant close', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const host = setup()
    const h = attachBackdrop(host)
    h.open()
    expect(h.state).toBe('open')
    expect(activeTickerCount()).toBe(0)
    expect(host.hasAttribute('data-goop-still')).toBe(true)
    expect(h.close()).toBe(0)
    expect(h.state).toBe('closed')
    h.destroy()
  })
})
