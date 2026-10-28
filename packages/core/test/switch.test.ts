import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOP_PART_ATTR,
  SWITCH_ALL_EFFECTS,
  SWITCH_DROP_CIRCLES,
  SWITCH_FEEL,
  SWITCH_FILL_CIRCLES,
  SWITCH_SHOWN_ATTR,
  SWITCH_THUMB_CIRCLES,
  SWITCH_TRAVEL,
  activeTickerCount,
  attachSwitch,
  switchEffectValue,
  switchMetrics,
  switchPose,
  switchStaticPose,
  switchToggleEnd,
  switchDefaultWave,
  switchWaveAt,
  switchWaveStrength,
  type SwitchCircle,
} from '../src'

const G = { width: 32, height: 18.4 }
const { x0, x1, r } = switchMetrics(G)
const END = switchToggleEnd()
const visible = <C extends { r: number }>(cs: C[]): C[] => cs.filter((c) => c.r > 0)
const blobs = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="blob"]`)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('switchPose', () => {
  it('starts at the from side and rests at the far side', () => {
    const start = switchPose(0, 0, 1, G)
    expect(start.position).toBe(0)
    expect(start.thumb[0]!.x).toBeCloseTo(x0)
    const end = switchPose(END, 0, 1, G)
    expect(end.position).toBe(1)
    expect(end.thumb[0]).toMatchObject({ x: x1, r, sx: 1, sy: 1 })
    expect(switchPose(END, 1, 0, G).thumb[0]!.x).toBeCloseTo(x0)
    expect(start.thumb).toHaveLength(SWITCH_THUMB_CIRCLES)
    expect(start.fill).toHaveLength(SWITCH_FILL_CIRCLES)
  })

  it('resting poses: one round thumb; fill full when checked, empty when not', () => {
    const on = switchStaticPose(true, G)
    const off = switchStaticPose(false, G)
    expect(visible(on.thumb)).toHaveLength(1)
    expect(visible(off.thumb)).toHaveLength(1)
    expect(visible(on.fill)).toHaveLength(SWITCH_FILL_CIRCLES)
    expect(on.fill[0]!.x).toBeCloseTo(x0)
    expect(on.fill.at(-1)!.x).toBeCloseTo(x1)
    expect(visible(off.fill)).toHaveLength(0)
    expect(visible(on.thumb)).toEqual(visible(switchPose(END, 0, 1, G).thumb))
    expect(on.fill).toEqual(switchPose(END, 0, 1, G).fill)
    expect(visible(switchStaticPose(true, G, SWITCH_FEEL.playful, { stretch: 1, bridge: 1, squish: 1, fill: 0, splat: 1, droplets: 1, wave: 1 }).fill)).toHaveLength(0)
  })

  it('leans and stretches the way it travels, teardrop tail behind', () => {
    const mid = switchPose(SWITCH_TRAVEL * 0.6, 0, 1, G)
    const [head, tail] = mid.thumb
    expect(head!.sx).toBeGreaterThan(1)
    expect(head!.sy).toBeLessThan(1)
    expect(tail!.r).toBeGreaterThan(0)
    expect(tail!.x).toBeLessThan(head!.x)
    // Mirror image going the other way.
    const back = switchPose(SWITCH_TRAVEL * 0.6, 1, 0, G)
    expect(back.thumb[1]!.x).toBeGreaterThan(back.thumb[0]!.x)
    expect(back.thumb[0]!.x).toBeCloseTo(x0 + x1 - head!.x)
    // stretch off: round the whole way.
    const flat = switchPose(SWITCH_TRAVEL * 0.6, 0, 1, G, SWITCH_FEEL.playful, { stretch: 0, bridge: 1, squish: 1, fill: 1, splat: 1, droplets: 1, wave: 1 })
    expect(flat.thumb[0]!.sx).toBe(1)
  })

  it('bridges to the start, then snaps', () => {
    const neck = (t: number, bridge = 1) =>
      switchPose(t, 0, 1, G, SWITCH_FEEL.playful, { stretch: 1, bridge, squish: 1, fill: 1, splat: 1, droplets: 1, wave: 1 }).thumb.slice(4)
    expect(visible(neck(SWITCH_TRAVEL * 0.2))).toHaveLength(3)
    expect(visible(neck(SWITCH_TRAVEL * 0.95))).toHaveLength(0)
    expect(visible(neck(SWITCH_TRAVEL * 0.2, 0))).toHaveLength(0)
  })

  it('squashes on landing and settles round', () => {
    const land = Array.from({ length: 20 }, (_, i) => switchPose(SWITCH_TRAVEL + ((1 - SWITCH_TRAVEL) * (i + 1)) / 21, 0, 1, G))
    expect(Math.min(...land.map((p) => p.thumb[0]!.sx))).toBeLessThan(0.95)
    const off = switchPose(SWITCH_TRAVEL + 0.06, 0, 1, G, SWITCH_FEEL.playful, { stretch: 0, bridge: 1, squish: 0, fill: 1, splat: 0, droplets: 1, wave: 1 })
    expect(off.thumb[0]!.sx).toBe(1)
  })

  it('keeps the old color under the travelling thumb (both directions)', () => {
    for (let i = 0; i < 20; i++) {
      const t = (SWITCH_TRAVEL * i) / 20
      const on = switchPose(t, 0, 1, G)
      expect(on.coverage).toBe(0)
      expect(on.shown).toBe(false)
      expect(visible(on.fill)).toHaveLength(0)
      const off = switchPose(t, 1, 0, G)
      expect(off.coverage).toBe(1)
      expect(off.shown).toBe(true)
      expect(visible(off.fill)).toHaveLength(SWITCH_FILL_CIRCLES)
      expect(off.fill[0]!.x).toBeCloseTo(x0)
    }
    // The colors flip at impact.
    expect(switchPose(SWITCH_TRAVEL, 0, 1, G).shown).toBe(true)
    expect(switchPose(SWITCH_TRAVEL, 1, 0, G).shown).toBe(false)
  })
})

describe('track wave', () => {
  const f = SWITCH_FEEL.playful
  const fx = (over: Partial<typeof SWITCH_ALL_EFFECTS> = {}) => ({ ...SWITCH_ALL_EFFECTS, ...over })
  const at = (sec: number) => SWITCH_TRAVEL + sec / f.duration
  const run = (from: number, to: number, effects = fx(), n = 60) =>
    Array.from({ length: n }, (_, i) => switchPose(at((f.waveSettle * (i + 1)) / (n + 1)), from, to, G, f, effects))
  // Left edge of the primary fill (px), or the track width when there is none.
  const edge = (p: ReturnType<typeof switchPose>) => {
    const vis = visible(p.fill)
    return vis.length ? Math.min(...vis.map((c) => c.x - c.r * c.sx)) : G.width
  }

  it('floods from the right wall to the left, sloshes past, rebounds and settles flat', () => {
    const ps = run(0, 1)
    const cov = ps.map((p) => p.coverage)
    // Starts at the impact (right) wall: early on only the right end is covered.
    expect(cov[0]!).toBeGreaterThan(0)
    expect(cov[0]!).toBeLessThan(0.3)
    expect(edge(ps[0]!)).toBeGreaterThan(G.width / 2)
    // The front moves left over time, overshoots the far wall (slosh), rebounds under it.
    const peak = Math.max(...cov)
    expect(peak).toBeGreaterThan(1.05)
    const iPeak = cov.indexOf(peak)
    expect(Math.min(...cov.slice(iPeak))).toBeLessThan(1)
    // Rounded crest while moving; piled up the far wall at the slosh peak.
    const mid = ps.find((p) => p.coverage > 0.4 && p.coverage < 0.8)!
    expect(mid.fill[0]!.sy).toBeGreaterThan(1.05)
    expect(ps[iPeak]!.fill[0]!.sy).toBeGreaterThan(1.15)
    // Settled flat at the end.
    for (const p of ps.slice(-4)) expect(Math.abs(p.coverage - 1)).toBeLessThan(0.02)
    const rest = switchPose(at(f.waveSettle), 0, 1, G, f)
    expect(rest.coverage).toBe(1)
    expect(rest.fill).toEqual(switchStaticPose(true, G).fill)
  })

  it('unchecking drains the primary away from the left wall into the right end', () => {
    const ps = run(1, 0)
    expect(ps[0]!.coverage).toBeLessThan(1)
    expect(ps[0]!.coverage).toBeGreaterThan(0.7)
    const edges = ps.slice(0, 8).map(edge)
    for (let i = 1; i < edges.length; i++) expect(edges[i]!).toBeGreaterThanOrEqual(edges[i - 1]! - 1e-9)
    expect(Math.min(...ps.map((p) => p.coverage))).toBeLessThan(0)
    expect(switchPose(at(f.waveSettle), 1, 0, G, f).coverage).toBe(0)
    expect(visible(switchStaticPose(false, G).fill)).toHaveLength(0)
  })

  it('the fill stays inside the track (plus a small slosh margin) through both toggles', () => {
    for (const feel of Object.values(SWITCH_FEEL)) {
      for (const geo of [G, { width: 44, height: 24 }, { width: 24, height: 14 }]) {
        const end = switchToggleEnd(feel)
        for (const [from, to] of [[1, 0], [0, 1]] as const) {
          for (let i = 0; i <= 400; i++) {
            const p = switchPose((end * i) / 400, from, to, geo, feel)
            for (const c of visible(p.fill)) {
              const hh = geo.height / 2
              // fillR overdraws the track by 0.35px; the crest/slosh may bulge 25% past it.
              const margin = 0.25 * hh + 0.5
              expect(c.r * c.sy).toBeLessThanOrEqual(hh + margin)
              expect(c.x - c.r * c.sx).toBeGreaterThanOrEqual(-margin)
              expect(c.x + c.r * c.sx).toBeLessThanOrEqual(geo.width + margin)
            }
          }
        }
      }
    }
  })

  it('the draining remainder hugs the right end cap instead of balling up', () => {
    const ps = run(1, 0, fx(), 200)
    const h = G.height / 2
    for (const p of ps) {
      const vis = visible(p.fill)
      if (!vis.length || p.coverage > 0.5) continue
      for (const c of vis) {
        // Right edge on the wall, about the track's height at most (a fading crest).
        expect(c.x + c.r * c.sx).toBeCloseTo(G.width, 5)
        expect(c.r * c.sy).toBeLessThanOrEqual((h + 0.35) * 1.1)
      }
    }
  })

  it('wave off: old color until impact, then switches at once', () => {
    const off = fx({ wave: 0 })
    expect(switchPose(SWITCH_TRAVEL * 0.99, 0, 1, G, f, off).coverage).toBe(0)
    expect(switchPose(SWITCH_TRAVEL, 0, 1, G, f, off).coverage).toBe(1)
    expect(switchPose(SWITCH_TRAVEL, 1, 0, G, f, off).coverage).toBe(0)
    for (const p of run(0, 1, off)) expect(p.fill).toEqual(switchStaticPose(true, G, f, off).fill)
  })

  it('stronger waves slosh further; presets scale it', () => {
    const over = (effects = fx(), feel = f) =>
      Math.max(...Array.from({ length: 80 }, (_, i) => switchWaveAt(SWITCH_TRAVEL + (feel.waveSettle * i) / 80 / feel.duration, switchDefaultWave(0, 1), feel, switchWaveStrength(feel, effects)).coverage))
    expect(over(fx({ wave: 2 }))).toBeGreaterThan(over())
    expect(over(fx({ wave: 0.5 }))).toBeLessThan(over())
    expect(over(fx(), SWITCH_FEEL.subtle)).toBeLessThan(over())
    expect(over(fx(), SWITCH_FEEL.wild)).toBeGreaterThan(over())
  })

  it('a retargeted wave continues from where it is, without jumps', () => {
    // Mid-wave a new impact retargets: the coverage is continuous across the switch.
    const first = switchDefaultWave(0, 1)
    const tHit = at(0.12)
    const now = switchWaveAt(tHit, first, f)
    const second = { from: now.coverage, to: 0, velocity: now.velocity, start: tHit }
    expect(switchWaveAt(tHit + 1e-6, second, f).coverage).toBeCloseTo(now.coverage, 3)
    expect(switchWaveAt(tHit + f.waveSettle / f.duration, second, f).coverage).toBe(0)
  })
})

describe('switch toggle timeline', () => {
  it('settles everything by switchToggleEnd', () => {
    expect(END).toBeGreaterThanOrEqual(SWITCH_TRAVEL + SWITCH_FEEL.playful.waveSettle / SWITCH_FEEL.playful.duration)
  })

  it('effect values', () => {
    expect(switchEffectValue(undefined)).toBe(1)
    expect(switchEffectValue(true)).toBe(1)
    expect(switchEffectValue(false)).toBe(0)
    expect(switchEffectValue(1.5)).toBe(1.5)
    expect(switchEffectValue(-2)).toBe(0)
  })
})

describe('wall splat and splash droplets', () => {
  const fx = (over: Partial<typeof SWITCH_ALL_EFFECTS> = {}) => ({ ...SWITCH_ALL_EFFECTS, ...over })
  // Seconds after impact -> toggle progress (playful).
  const at = (sec: number) => SWITCH_TRAVEL + sec / SWITCH_FEEL.playful.duration
  const landing = (from: number, to: number, effects = fx(), n = 60) =>
    Array.from({ length: n }, (_, i) => switchPose(at((SWITCH_FEEL.playful.settle * (i + 1)) / (n + 1)), from, to, G, SWITCH_FEEL.playful, effects))

  it('runs past t = 1 and settles exactly round', () => {
    expect(END).toBeGreaterThan(1)
    expect(switchToggleEnd(SWITCH_FEEL.playful, fx({ splat: 0, droplets: 0, wave: 0 }))).toBe(1)
    const rest = switchPose(END, 0, 1, G)
    expect(rest.thumb[0]).toMatchObject({ x: x1, r, sx: 1, sy: 1 })
    expect(visible(rest.thumb)).toHaveLength(1)
    expect(visible(rest.drops)).toHaveLength(0)
  })

  it('flattens against the wall (short and tall), rebounds, and decays to zero', () => {
    const poses = landing(0, 1)
    const head = poses.map((p) => p.thumb[0]!)
    const flat = head.reduce((a, b) => (b.sx < a.sx ? b : a))
    expect(flat.sx).toBeLessThan(0.85)
    expect(flat.sy).toBeGreaterThan(1.1)
    // The side touching the wall stays on the wall and is squared off by the corner circles.
    expect(flat.x + flat.r * flat.sx).toBeCloseTo(x1 + r, 5)
    const flatPose = poses[head.indexOf(flat)]!
    expect(visible(flatPose.thumb.slice(7))).toHaveLength(2)
    // Rebound: stretched off the wall later on, and it wobbles (sign changes).
    expect(Math.max(...head.slice(10).map((h) => h.sx))).toBeGreaterThan(1)
    const signs = head.map((h) => Math.sign(h.sx - 1)).filter((v, i, a) => v !== 0 && v !== a[i - 1])
    expect(signs.length).toBeGreaterThanOrEqual(3)
    // Decays: the last stretch of the settle is near round, the end exactly round.
    for (const h of head.slice(-6)) expect(Math.abs(h.sx - 1)).toBeLessThan(0.03)
    expect(switchPose(END - 1e-6, 0, 1, G).thumb[0]!.sx).toBeCloseTo(1, 3)
  })

  it('is mirrored for on and off', () => {
    const on = landing(0, 1, fx(), 12)
    const off = landing(1, 0, fx(), 12)
    for (let i = 0; i < on.length; i++) {
      const a = on[i]!
      const b = off[i]!
      const pairs: [SwitchCircle, SwitchCircle][] = [...a.thumb, ...a.drops].map((c, j) => [c, [...b.thumb, ...b.drops][j]!])
      for (const [ca, cb] of pairs) {
        expect(cb.r).toBeCloseTo(ca.r, 6)
        if (ca.r > 0) {
          expect(cb.x).toBeCloseTo(x0 + x1 - ca.x, 6)
          expect(cb.y).toBeCloseTo(ca.y, 6)
          expect(cb.sx).toBeCloseTo(ca.sx, 6)
        }
      }
    }
  })

  it('scales with arrival speed: a short interrupted toggle splats less', () => {
    const min = (ps: ReturnType<typeof landing>) => Math.min(...ps.map((p) => p.thumb[0]!.sx))
    expect(min(landing(0.75, 1))).toBeGreaterThan(min(landing(0, 1)))
    expect(min(landing(0.95, 1))).toBeGreaterThan(0.97)
  })

  it('throws 2-4 fat drops up and out past the wall, zero radius at rest and after landing', () => {
    const at0 = switchPose(0, 0, 1, G)
    expect(at0.drops).toHaveLength(SWITCH_DROP_CIRCLES)
    expect(visible(at0.drops)).toHaveLength(0)
    expect(visible(switchPose(SWITCH_TRAVEL * 0.9, 0, 1, G).drops)).toHaveLength(0)
    const poses = landing(0, 1)
    const most = Math.max(...poses.map((p) => visible(p.drops).length))
    expect(most).toBeGreaterThanOrEqual(2)
    expect(most).toBeLessThanOrEqual(4)
    const all = poses.flatMap((p) => visible(p.drops))
    expect(Math.min(...all.map((d) => d.y - d.r))).toBeLessThan(0) // above the track
    expect(Math.max(...all.map((d) => d.x))).toBeGreaterThan(x1 + r) // past the wall end
    for (const d of all) expect(d.r).toBeLessThan(r * 0.5)
    // Every pose has the same circle budget; all gone well before the end and at rest.
    for (const p of poses) {
      expect(p.drops).toHaveLength(SWITCH_DROP_CIRCLES)
      expect(p.thumb).toHaveLength(SWITCH_THUMB_CIRCLES)
      expect(p.fill).toHaveLength(SWITCH_FILL_CIRCLES)
    }
    expect(visible(poses.at(-1)!.drops)).toHaveLength(0)
    expect(visible(switchStaticPose(true, G).drops)).toHaveLength(0)
    expect(visible(switchStaticPose(false, G).drops)).toHaveLength(0)
  })

  it('toggles disable each effect', () => {
    const noSplat = landing(0, 1, fx({ splat: 0, squish: 0, stretch: 0 }))
    for (const p of noSplat) {
      expect(p.thumb[0]!.sx).toBe(1)
      expect(visible(p.thumb.slice(7))).toHaveLength(0)
    }
    const noDrops = landing(0, 1, fx({ droplets: 0 }))
    for (const p of noDrops) expect(visible(p.drops)).toHaveLength(0)
    // Splat off falls back to the plain squish landing, ending at t = 1.
    const plain = fx({ splat: 0, droplets: 0 })
    expect(switchPose(1, 0, 1, G, SWITCH_FEEL.playful, plain).thumb[0]).toMatchObject({ x: x1, sx: 1, sy: 1 })
  })

  it('presets scale both', () => {
    const peak = (preset: 'subtle' | 'playful' | 'wild') => {
      const f = SWITCH_FEEL[preset]
      let sx = 1
      let drops = 0
      for (let i = 1; i < 80; i++) {
        const p = switchPose(SWITCH_TRAVEL + (f.settle * i) / 80 / f.duration, 0, 1, G, f)
        sx = Math.min(sx, p.thumb[0]!.sx)
        drops = Math.max(drops, ...p.drops.map((d) => d.r))
      }
      return { sx, drops }
    }
    const s = peak('subtle')
    const p = peak('playful')
    const w = peak('wild')
    expect(s.sx).toBeGreaterThan(p.sx)
    expect(p.sx).toBeGreaterThan(w.sx)
    expect(s.drops).toBeLessThan(p.drops)
    expect(p.drops).toBeLessThan(w.drops)
  })
})

describe('attachSwitch', () => {
  const host = () => {
    const el = document.createElement('button')
    document.body.append(el)
    return el
  }

  it('draws two aria-hidden layers and animates a toggle on the shared loop', () => {
    const el = host()
    const h = attachSwitch(el, { checked: false })
    const layers = el.querySelectorAll(`[${GOOP_PART_ATTR}="layer"]`)
    expect(layers).toHaveLength(2)
    for (const l of layers) expect(l.getAttribute('aria-hidden')).toBe('true')
    expect(blobs(el)).toHaveLength(SWITCH_FILL_CIRCLES + SWITCH_DROP_CIRCLES + SWITCH_THUMB_CIRCLES)
    expect(h.running).toBe(false)
    h.update({ checked: true })
    expect(h.running).toBe(true)
    expect(activeTickerCount()).toBe(1)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(el.children).toHaveLength(0)
  })

  it('reduced motion: instant state change, static pose, no ticker', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host()
    const h = attachSwitch(el, { checked: false })
    expect(h.reducedMotion).toBe(true)
    h.update({ checked: true })
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    expect(h.pose?.position).toBe(1)
    expect(visible(h.pose!.thumb)).toHaveLength(1)
    expect(visible(h.pose!.drops)).toHaveLength(0)
    expect(h.pose!.coverage).toBe(1)
    expect(el.getAttribute(SWITCH_SHOWN_ATTR)).toBe('checked')
    h.destroy()
  })

  describe('with a manual frame clock', () => {
    let frames: FrameRequestCallback[] = []
    let clock = 0
    beforeEach(() => {
      frames = []
      clock = 0
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
      vi.stubGlobal('cancelAnimationFrame', () => {})
    })
    afterEach(() => vi.unstubAllGlobals())
    const step = (sec: number) => {
      const end = clock + sec * 1000
      while (clock < end && frames.length) {
        clock += 1000 / 60
        const fs = frames
        frames = []
        for (const f of fs) f(clock)
      }
    }
    const travelSec = SWITCH_TRAVEL * SWITCH_FEEL.playful.duration

    it('shows the old state until impact, then floods; the attribute follows', () => {
      const el = host()
      const h = attachSwitch(el, { checked: false })
      expect(el.getAttribute(SWITCH_SHOWN_ATTR)).toBe('unchecked')
      h.update({ checked: true })
      step(travelSec * 0.8)
      expect(h.pose!.coverage).toBe(0)
      expect(el.getAttribute(SWITCH_SHOWN_ATTR)).toBe('unchecked')
      step(travelSec * 0.3)
      expect(el.getAttribute(SWITCH_SHOWN_ATTR)).toBe('checked')
      expect(h.pose!.coverage).toBeGreaterThan(0)
      step(2)
      expect(h.running).toBe(false)
      expect(h.pose!.coverage).toBe(1)
      h.destroy()
      expect(el.hasAttribute(SWITCH_SHOWN_ATTR)).toBe(false)
    })

    it('interrupted mid-travel: the color never changes', () => {
      const el = host()
      const h = attachSwitch(el, { checked: false })
      h.update({ checked: true })
      const seen: number[] = []
      const states = new Set<string | null>()
      step(travelSec * 0.5)
      h.update({ checked: false })
      for (let i = 0; i < 90; i++) {
        step(1 / 60)
        seen.push(h.pose!.coverage)
        states.add(el.getAttribute(SWITCH_SHOWN_ATTR))
      }
      expect(Math.max(...seen)).toBe(0)
      expect([...states]).toEqual(['unchecked'])
      h.destroy()
    })

    it('interrupted mid-wave: the wave keeps moving, then drains from the next impact without a flash', () => {
      const el = host()
      const h = attachSwitch(el, { checked: false })
      h.update({ checked: true })
      step(travelSec + 0.08)
      const c0 = h.pose!.coverage
      expect(c0).toBeGreaterThan(0)
      expect(c0).toBeLessThan(1)
      h.update({ checked: false })
      const seen: number[] = [c0]
      for (let i = 0; i < 120; i++) {
        step(1 / 60)
        seen.push(h.pose!.coverage)
      }
      // Continuous: no frame-to-frame jump bigger than a wave can move in a frame.
      for (let i = 1; i < seen.length; i++) expect(Math.abs(seen[i]! - seen[i - 1]!)).toBeLessThan(0.2)
      // Still flooding right after the click (old wave continues), ends drained.
      expect(seen[3]!).toBeGreaterThan(c0)
      expect(h.pose!.coverage).toBe(0)
      expect(el.getAttribute(SWITCH_SHOWN_ATTR)).toBe('unchecked')
      h.destroy()
    })
  })
})
