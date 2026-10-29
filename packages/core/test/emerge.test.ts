import { afterEach, describe, expect, it } from 'vitest'
import {
  EMERGE_CIRCLES,
  EMERGE_CONTENT_VAR,
  EMERGE_FEEL,
  EMERGE_MOMENTUM_CIRCLES,
  EMERGE_NECK_LUMPS,
  EMERGE_FLOW_ROOT,
  emergeFlowDuration,
  emergeBloomDuration,
  emergeBloomDripCount,
  emergeMomentum,
  GOOP_PART_ATTR,
  activeTickerCount,
  attachEmerge,
  emergeBridge,
  emergeJelly,
  emergeOverflow,
  emergePose,
  emergeRestPose,
  emergeSnapTime,
  isLoopRunning,
  type EmergeRect,
  type EmergeSide,
} from '../src'

const SIDES: EmergeSide[] = ['top', 'right', 'bottom', 'left']
const trigger: EmergeRect = { x: 400, y: 300, width: 120, height: 36 }
/** A 288x120 panel placed on `side` of the trigger, centered, 4px away. */
const panelFor = (side: EmergeSide, align: 'start' | 'center' | 'end' = 'center'): EmergeRect => {
  const w = 288
  const h = 120
  const cx = align === 'start' ? trigger.x + w / 2 : align === 'end' ? trigger.x + trigger.width - w / 2 : trigger.x + trigger.width / 2
  const cy = align === 'start' ? trigger.y + h / 2 : align === 'end' ? trigger.y + trigger.height - h / 2 : trigger.y + trigger.height / 2
  if (side === 'bottom') return { x: cx - w / 2, y: trigger.y + trigger.height + 4, width: w, height: h }
  if (side === 'top') return { x: cx - w / 2, y: trigger.y - 4 - h, width: w, height: h }
  if (side === 'right') return { x: trigger.x + trigger.width + 4, y: cy - h / 2, width: w, height: h }
  return { x: trigger.x - 4 - w, y: cy - h / 2, width: w, height: h }
}
const bodyExtent = (side: EmergeSide, b: { w: number; h: number }) => (side === 'top' || side === 'bottom' ? b.h : b.w)
const ts = Array.from({ length: 51 }, (_, i) => i / 50)

describe('emergeBridge', () => {
  it('points from the anchor to the panel on every side, across the gap', () => {
    for (const side of SIDES) {
      const b = emergeBridge(trigger, panelFor(side), side)
      expect(b.gap).toBeCloseTo(4)
      expect(b.depth).toBe(side === 'top' || side === 'bottom' ? 120 : 288)
      // Source sits `gap` px behind the target along -dir.
      expect(b.target.x - b.source.x).toBeCloseTo(b.dir.x * b.gap)
      expect(b.target.y - b.source.y).toBeCloseTo(b.dir.y * b.gap)
      // Target lies on the panel's near edge.
      const near = ({ bottom: [null, 0], top: [null, 120], right: [0, null], left: [288, null] } as Record<EmergeSide, [number | null, number | null]>)[side]
      if (near[0] !== null) expect(b.target.x).toBeCloseTo(near[0])
      if (near[1] !== null) expect(b.target.y).toBeCloseTo(near[1])
      // Bulb scales with the trigger's smaller side.
      expect(b.bulb).toBeCloseTo(EMERGE_FEEL.playful.bulb * 36)
    }
  })

  it('lines up with the anchor center under alignment and stays clear of the corners', () => {
    const start = emergeBridge(trigger, panelFor('bottom', 'start'), 'bottom')
    expect(start.targetCross).toBeCloseTo(60) // trigger center, 60px into the panel
    expect(start.sourceCross).toBeCloseTo(60)
    const end = emergeBridge(trigger, panelFor('bottom', 'end'), 'bottom')
    expect(end.targetCross).toBeCloseTo(288 - 60)
    // Panel shoved far right (collision shift): target clamps inside, source stays on the anchor.
    const shifted = emergeBridge(trigger, { x: 600, y: 340, width: 200, height: 80 }, 'bottom')
    expect(shifted.targetCross).toBeGreaterThanOrEqual(shifted.bulb)
    expect(shifted.sourceCross + 600).toBeGreaterThanOrEqual(trigger.x)
    expect(shifted.sourceCross + 600).toBeLessThanOrEqual(trigger.x + trigger.width)
  })
})

describe('emergeJelly', () => {
  it('runs 0 -> 1, overshoots with wobble, never without', () => {
    expect(emergeJelly(0, 4.5)).toBeCloseTo(0)
    expect(emergeJelly(1, 4.5)).toBeCloseTo(1)
    const wob = ts.map((u) => emergeJelly(u, 4.5))
    expect(Math.max(...wob)).toBeGreaterThan(1.05)
    const flat = ts.map((u) => emergeJelly(u, 4.5, false))
    expect(Math.max(...flat)).toBeLessThanOrEqual(1)
    for (let i = 1; i < flat.length; i++) expect(flat[i]!).toBeGreaterThanOrEqual(flat[i - 1]!)
  })
})

describe('emergePose (open)', () => {
  it('starts empty at the anchor and ends at rest, on every side', () => {
    for (const side of SIDES) {
      const b = emergeBridge(trigger, panelFor(side), side)
      const p0 = emergePose(0, b)
      expect(p0.body.w * p0.body.h).toBe(0)
      expect(p0.content).toBe(0)
      expect(p0.circles).toHaveLength(EMERGE_CIRCLES)
      expect(emergePose(1, b)).toEqual(emergeRestPose(b))
      expect(emergePose(0.3, b)).toEqual(emergePose(0.3, b))
    }
  })

  it('grows out of the anchor side first (directional)', () => {
    for (const side of SIDES) {
      const b = emergeBridge(trigger, panelFor(side), side)
      const { body } = emergePose(0.16, b)
      expect(body.w * body.h).toBeGreaterThan(0)
      // Early on the body hugs the near edge, and is a tongue narrower than the panel.
      const main = { bottom: body.cy, top: b.height - body.cy, right: body.cx, left: b.width - body.cx }[side]
      expect(main).toBeLessThan(b.depth / 2)
      const breadth = side === 'top' || side === 'bottom' ? body.w : body.h
      expect(breadth).toBeLessThan(b.breadth)
    }
  })

  it('swells a bulb, keeps the neck globby, snaps, and clears the bridge', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    const snap = emergeSnapTime(b)
    expect(snap).toBeGreaterThan(0.2)
    expect(snap).toBeLessThanOrEqual(0.5)
    const swell = emergePose(0.2, b)
    expect(swell.circles[0]!.r).toBeGreaterThan(b.bulb * 0.8)
    for (let t = 0.12; t < snap; t += 0.02) {
      const { circles } = emergePose(t, b)
      const bulb = circles[0]!.r
      // Lumps stay fat relative to the bulb: never a thin string.
      for (const c of circles.slice(1, 1 + EMERGE_NECK_LUMPS)) expect(c.r).toBeGreaterThanOrEqual(bulb * 0.4)
    }
    const after = emergePose(Math.min(0.95, snap + 0.35), b)
    for (const c of after.circles) expect(c.r).toBe(0)
  })

  it('fades content in only once the goo has mostly settled, monotonically', () => {
    const b = emergeBridge(trigger, panelFor('right'), 'right')
    let prev = 0
    for (const t of ts) {
      const { content } = emergePose(t, b)
      expect(content).toBeGreaterThanOrEqual(prev)
      prev = content
      if (t < 0.55) expect(content).toBe(0)
    }
    expect(emergePose(0.1, b, 'open', EMERGE_FEEL.playful, { fade: false }).content).toBe(1)
  })

  it('effects toggle independently', () => {
    const b = emergeBridge(trigger, panelFor('top'), 'top')
    for (const t of ts) {
      const noBridge = emergePose(t, b, 'open', EMERGE_FEEL.playful, { bridge: false })
      for (const c of noBridge.circles) expect(c.r).toBe(0)
      const still = emergePose(t, b, 'open', EMERGE_FEEL.wild, { wobble: false, momentum: false })
      expect(bodyExtent('top', still.body)).toBeLessThanOrEqual(b.depth + 1e-6)
    }
    const wobbly = ts.map((t) => bodyExtent('top', emergePose(t, b, 'open', EMERGE_FEEL.wild).body))
    expect(Math.max(...wobbly)).toBeGreaterThan(b.depth * 1.05)
  })
})

describe('emergePose (close)', () => {
  it('starts at the full panel, shrinks toward the anchor, ends empty', () => {
    for (const side of SIDES) {
      const b = emergeBridge(trigger, panelFor(side), side)
      const p0 = emergePose(0, b, 'close')
      expect(bodyExtent(side, p0.body)).toBeCloseTo(b.depth)
      let prev = Infinity
      for (const t of ts) {
        const e = bodyExtent(side, emergePose(t, b, 'close').body)
        expect(e).toBeLessThanOrEqual(prev + 1e-6)
        prev = e
      }
      const end = emergePose(1, b, 'close')
      expect(end.body.w * end.body.h).toBe(0)
      expect(end.content).toBe(0)
      for (const c of end.circles) expect(c.r).toBe(0)
      // The neck reforms mid-close (sucked back through it).
      expect(emergePose(0.5, b, 'close').circles[0]!.r).toBeGreaterThan(0)
    }
  })
})

describe('emergeOverflow', () => {
  it('is zero at rest and covers the bridge while animating', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    expect(emergeOverflow(emergeRestPose(b), b.width, b.height)).toBe(0)
    expect(emergeOverflow(emergePose(0.2, b), b.width, b.height)).toBeGreaterThan(b.gap)
  })
})

describe('attachEmerge', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete document.documentElement.dataset.reducedMotion
  })
  const setup = () => {
    const anchor = document.createElement('button')
    const host = document.createElement('div')
    host.setAttribute('data-side', 'right')
    host.append('Panel text')
    document.body.append(anchor, host)
    return { anchor, host }
  }

  it('adds an aria-hidden surface behind real content, starts closed and hidden', () => {
    const { anchor, host } = setup()
    const h = attachEmerge(host, { anchor })
    const surface = host.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="surface"]`)!
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(host.firstElementChild).toBe(surface)
    expect(host.textContent).toBe('Panel text')
    expect(surface.querySelector(`[${GOOP_PART_ATTR}="layer"]`)).not.toBeNull()
    expect(host.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
    expect(h.state).toBe('closed')
    expect(host.getAttribute('data-goop-emerge')).toBe('closed')
    expect(host.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('0')
    h.destroy()
    expect(host.querySelector(`[${GOOP_PART_ATTR}="surface"]`)).toBeNull()
    expect(host.hasAttribute('data-goop-emerge')).toBe(false)
  })

  it('open/close run on the shared loop; close reports its duration', () => {
    const { anchor, host } = setup()
    const h = attachEmerge(host, { anchor, preset: 'playful' })
    h.open()
    expect(h.state).toBe('opening')
    expect(isLoopRunning()).toBe(true)
    const ms = h.close()
    expect(h.state).toBe('closing')
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThanOrEqual(EMERGE_FEEL.playful.close * 1000)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: plain open/close, nothing ticks, no hold', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { anchor, host } = setup()
    const h = attachEmerge(host, { anchor })
    expect(h.reducedMotion).toBe(true)
    expect(host.hasAttribute('data-goop-still')).toBe(true)
    h.open()
    expect(h.state).toBe('open')
    expect(activeTickerCount()).toBe(0)
    expect(host.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('1')
    expect(h.close()).toBe(0)
    expect(h.state).toBe('closed')
    expect(h.closeDuration).toBe(0)
    h.destroy()
  })
})

describe('emerge flow mode', () => {
  const flow = { flow: true }
  /** Main-axis distance of a point from the trigger's facing edge, + toward the panel. */
  const out = (side: EmergeSide, p: { x: number; y: number }, panel: EmergeRect): number => {
    const x = panel.x + p.x
    const y = panel.y + p.y
    if (side === 'bottom') return y - (trigger.y + trigger.height)
    if (side === 'top') return trigger.y - y
    if (side === 'right') return x - (trigger.x + trigger.width)
    return trigger.x - x
  }

  it('is off by default and changes the pose when on', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    expect(emergePose(0.3, b)).toEqual(emergePose(0.3, b, 'open', EMERGE_FEEL.playful, { flow: false }))
    expect(emergePose(0.3, b, 'open', EMERGE_FEEL.playful, flow)).not.toEqual(emergePose(0.3, b))
  })

  for (const side of SIDES) {
    it(`${side}: root grows out of the trigger edge, never deep inside the trigger`, () => {
      const panel = panelFor(side)
      const b = emergeBridge(trigger, panel, side)
      for (const phase of ['open', 'close'] as const) {
        for (let i = 0; i <= 40; i++) {
          const p = emergePose(i / 40, b, phase, EMERGE_FEEL.playful, flow)
          for (const c of p.circles) if (c.r > 0) expect(out(side, c, panel) - c.r).toBeGreaterThanOrEqual(-3.5)
        }
      }
      // Early in the open, root and body hug the trigger edge.
      const early = emergePose(0.12, b, 'open', EMERGE_FEEL.playful, flow)
      expect(early.circles.slice(0, EMERGE_FLOW_ROOT).some((c) => c.r > 2)).toBe(true)
      expect(early.body.w).toBeGreaterThan(0)
      expect(early.body.w * early.body.h).toBeLessThan(panel.width * panel.height * 0.25)
      expect(early.content).toBe(0)
    })
  }

  it('ends at rest on open and empty on close; content fades in late', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    expect(emergePose(1, b, 'open', EMERGE_FEEL.playful, flow)).toEqual(emergeRestPose(b))
    const end = emergePose(1, b, 'close', EMERGE_FEEL.playful, flow)
    expect(end.body.w * end.body.h).toBe(0)
    expect(end.circles.every((c) => c.r === 0)).toBe(true)
    expect(emergePose(0.5, b, 'open', EMERGE_FEEL.playful, flow).content).toBe(0)
    expect(emergePose(0.95, b, 'open', EMERGE_FEEL.playful, flow).content).toBeGreaterThan(0.9)
    // The neck has pinched off and the root drained before the end.
    expect(emergePose(0.92, b, 'open', EMERGE_FEEL.playful, flow).circles.every((c) => c.r === 0)).toBe(true)
  })

  for (const side of SIDES) {
    it(`${side}: the body never overshoots the panel rect by more than a few px`, () => {
      const panel = panelFor(side)
      const b = emergeBridge(trigger, panel, side)
      for (const preset of ['subtle', 'playful', 'wild'] as const) {
        for (let i = 0; i <= 60; i++) {
          const { body } = emergePose(i / 60, b, 'open', EMERGE_FEEL[preset], flow)
          if (body.w * body.h === 0) continue
          // The near edge may tuck back to the trigger; the far edge and sides stay put.
          const l = body.cx - body.w / 2
          const r = body.cx + body.w / 2
          const tp = body.cy - body.h / 2
          const bt = body.cy + body.h / 2
          const tol = 3.5
          if (side !== 'left') expect(r).toBeLessThanOrEqual(panel.width + tol)
          if (side !== 'right') expect(l).toBeGreaterThanOrEqual(-tol)
          if (side !== 'top') expect(bt).toBeLessThanOrEqual(panel.height + tol)
          if (side !== 'bottom') expect(tp).toBeGreaterThanOrEqual(-tol)
        }
      }
    })
  }

  it('presets scale the flow: wild is slower and has a thicker neck than subtle', () => {
    const { subtle, playful, wild } = EMERGE_FEEL
    for (const ph of ['open', 'close'] as const) {
      expect(emergeFlowDuration(subtle, ph)).toBeLessThan(emergeFlowDuration(playful, ph))
      expect(emergeFlowDuration(playful, ph)).toBeLessThan(emergeFlowDuration(wild, ph))
    }
    expect(subtle.flowNeck!).toBeLessThan(wild.flowNeck!)
  })

  it('reduced motion: flow opens and closes statically, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const anchor = document.createElement('button')
    const host = document.createElement('div')
    document.body.append(anchor, host)
    const h = attachEmerge(host, { anchor, flow: true })
    h.open()
    expect(h.state).toBe('open')
    expect(activeTickerCount()).toBe(0)
    expect(host.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('1')
    expect(h.close()).toBe(0)
    expect(h.state).toBe('closed')
    h.destroy()
    delete document.documentElement.dataset.reducedMotion
    document.body.innerHTML = ''
  })

  it('attachEmerge uses the flow durations', () => {
    const anchor = document.createElement('button')
    const host = document.createElement('div')
    document.body.append(anchor, host)
    const h = attachEmerge(host, { anchor, preset: 'playful', flow: true })
    h.open()
    expect(h.closeDuration).toBe(Math.round(emergeFlowDuration(EMERGE_FEEL.playful, 'close') * 1000))
    h.destroy()
    document.body.innerHTML = ''
  })
})

describe('emerge bloom flow style', () => {
  const bloom = { flow: true, flowStyle: 'bloom' } as const
  const merge = { ...bloom, bloomStart: 'merge' } as const

  for (const side of SIDES) {
    it(`${side}: frame 1 is a small droplet at the panel's own center`, () => {
      const panel = panelFor(side)
      const b = emergeBridge(trigger, panel, side)
      const p = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, bloom)
      expect(p.body.w).toBeGreaterThan(0)
      expect(p.body.cx).toBeCloseTo(panel.width / 2, 5)
      expect(p.body.cy).toBeCloseTo(panel.height / 2, 5)
      expect(p.body.w * p.body.h).toBeLessThan(panel.width * panel.height * 0.05)
      // Every circle stays near the center (no link to the trigger).
      for (const c of p.circles) if (c.r > 0) expect(Math.hypot(c.x - panel.width / 2, c.y - panel.height / 2)).toBeLessThan(40)
      expect(p.content).toBe(0)
    })
  }

  it('merge start: 3-5 seed drops around the center grow before the puddle', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    const p = emergePose(0.08, b, 'open', EMERGE_FEEL.playful, merge, 3)
    const drops = p.circles.filter((c) => c.r > 0)
    expect(drops.length).toBeGreaterThanOrEqual(3)
    expect(drops.length).toBeLessThanOrEqual(5)
    for (const c of drops) {
      expect(Math.abs(c.x - b.width / 2)).toBeLessThanOrEqual(b.width * 0.2 + 0.01)
      expect(Math.abs(c.y - b.height / 2)).toBeLessThanOrEqual(b.height * 0.2 + 0.01)
    }
  })

  for (const start of ['single', 'merge'] as const) {
    it(`${start}: grows in all directions, overshoots briefly, ends exactly on the panel`, () => {
      const panel = panelFor('bottom')
      const b = emergeBridge(trigger, panel, 'bottom')
      const fx = { ...bloom, bloomStart: start }
      expect(emergePose(1, b, 'open', EMERGE_FEEL.playful, fx)).toEqual(emergeRestPose(b))
      for (const preset of ['subtle', 'playful', 'wild'] as const) {
        for (let i = 0; i <= 60; i++) {
          const t = i / 60
          const { body } = emergePose(t, b, 'open', EMERGE_FEEL[preset], fx)
          if (body.w === 0) continue
          expect(body.cx).toBeCloseTo(panel.width / 2, 5)
          expect(body.cy).toBeCloseTo(panel.height / 2, 5)
          expect(body.w).toBeLessThanOrEqual(panel.width + 2 * 10)
          // Settled: within 3.5px of the panel on every side.
          if (t >= 0.9) {
            expect(Math.abs(body.w - panel.width) / 2).toBeLessThanOrEqual(3.5)
            expect(Math.abs(body.h - panel.height) / 2).toBeLessThanOrEqual(3.5)
          }
        }
      }
      expect(emergePose(0.5, b, 'open', EMERGE_FEEL.playful, fx).body.w).toBeGreaterThan(panel.width * 0.9)
    })
  }

  it('close contracts to the center and vanishes; content fades first', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    const mid = emergePose(0.6, b, 'close', EMERGE_FEEL.playful, bloom)
    expect(mid.body.cx).toBeCloseTo(b.width / 2, 5)
    expect(mid.body.w).toBeLessThan(b.width * 0.6)
    expect(mid.content).toBe(0)
    const end = emergePose(1, b, 'close', EMERGE_FEEL.playful, bloom)
    expect(end.body.w * end.body.h).toBe(0)
    expect(end.circles.every((c) => c.r === 0)).toBe(true)
  })

  it('splash: drops fly off every side, more than the far-edge burst; off with openDrips false', () => {
    const b = emergeBridge(trigger, panelFor('bottom'), 'bottom')
    const rest = emergeRestPose(b)
    const sides = new Set<string>()
    for (const sec of [0.2, 0.3]) {
      const p = emergeMomentum(rest, b, 'open', sec, {}, { bloom: true, seed: 1 })
      for (const c of p.circles) {
        if (c.r <= 0) continue
        if (c.y < -2) sides.add('top')
        if (c.y > b.height + 2) sides.add('bottom')
        if (c.x < -2) sides.add('left')
        if (c.x > b.width + 2) sides.add('right')
      }
      const off = emergeMomentum(rest, b, 'open', sec, { openDrips: false, openSlosh: false }, { bloom: true, seed: 1 })
      expect(off.circles.every((c) => c.r === 0)).toBe(true)
    }
    expect([...sides].sort()).toEqual(['bottom', 'left', 'right', 'top'])
    expect(emergeBloomDripCount(b.width, b.height, 1, 'playful')).toBeGreaterThan(20)
    expect(emergeBloomDripCount(b.width, b.height, 1, 'subtle')).toBeLessThan(emergeBloomDripCount(b.width, b.height, 1, 'wild'))
  })

  it('presets scale the bloom durations', () => {
    const { subtle, playful, wild } = EMERGE_FEEL
    for (const ph of ['open', 'close'] as const) {
      expect(emergeBloomDuration(subtle, ph)).toBeLessThan(emergeBloomDuration(playful, ph))
      expect(emergeBloomDuration(playful, ph)).toBeLessThan(emergeBloomDuration(wild, ph))
    }
  })

  it('reduced motion: bloom opens and closes statically', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const host = document.createElement('div')
    document.body.append(host)
    const h = attachEmerge(host, { ...bloom })
    h.open()
    expect(h.state).toBe('open')
    expect(activeTickerCount()).toBe(0)
    expect(host.style.getPropertyValue(EMERGE_CONTENT_VAR)).toBe('1')
    expect(h.close()).toBe(0)
    h.destroy()
    delete document.documentElement.dataset.reducedMotion
    document.body.innerHTML = ''
  })

  it('attachEmerge uses the bloom durations', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const h = attachEmerge(host, { preset: 'playful', ...bloom })
    h.open()
    expect(h.closeDuration).toBe(Math.round(emergeBloomDuration(EMERGE_FEEL.playful, 'close') * 1000))
    h.destroy()
    document.body.innerHTML = ''
  })
})
