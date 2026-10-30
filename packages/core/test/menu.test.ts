import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  MENU_FEEL,
  MENU_HIGHLIGHT_CIRCLES,
  MENU_NECK_LUMPS,
  MENU_NECK_MIN,
  MENU_SWELL_AT,
  MENU_SWELL_CIRCLES,
  activeTickerCount,
  attachMenuHighlight,
  findMenuHighlight,
  menuBulgeTarget,
  menuHighlightInit,
  menuHighlightPose,
  menuHighlightSettled,
  menuHighlightSnap,
  menuHighlightStep,
  menuPopSquish,
  type EmergeRect,
  type MenuHighlightState,
} from '../src'

const row = (i: number): EmergeRect => ({ x: 4, y: 4 + i * 28, width: 180, height: 28 })
const DT = 1 / 60

/** Run until settled (or `max` seconds), recording every pose. */
const run = (s: MenuHighlightState, target: EmergeRect | null, seconds: number, preset: keyof typeof MENU_FEEL = 'playful', fx = {}) => {
  const poses = []
  for (let t = 0; t < seconds; t += DT) {
    menuHighlightStep(s, target, DT, MENU_FEEL[preset], fx)
    poses.push({ s: structuredClone(s), pose: menuHighlightPose(s, MENU_FEEL[preset], fx) })
  }
  return poses
}

describe('menuHighlightPose', () => {
  it('is hidden with nothing highlighted', () => {
    const pose = menuHighlightPose(menuHighlightInit())
    expect(pose.body.w).toBe(0)
    expect(pose.circles).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(pose.circles.every((c) => c.r === 0)).toBe(true)
  })

  it('at rest it is exactly the item, no tail or neck', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(2))
    const { body, circles } = menuHighlightPose(s)
    expect(body).toEqual({ cx: 94, cy: 4 + 56 + 14, w: 180, h: 28 })
    expect(circles.every((c) => c.r === 0)).toBe(true)
  })

  it('grows in where it appears instead of flying in', () => {
    const s = menuHighlightInit()
    const [first] = run(s, row(3), DT)
    expect(first!.s.y.x).toBeCloseTo(row(3).y + 14)
    expect(first!.pose.body.h).toBeLessThan(28)
    run(s, row(3), 1)
    expect(menuHighlightSettled(s, row(3))).toBe(true)
  })
})

describe('pointer follow', () => {
  // The swell's peak circle (the middle of the mound).
  const SWELL = MENU_SWELL_AT + (MENU_SWELL_CIRCLES - 1) / 2
  const runAt = (s: MenuHighlightState, target: EmergeRect, pointer: number | null, seconds: number, fx = {}) => {
    const out = []
    for (let t = 0; t < seconds; t += DT) {
      menuHighlightStep(s, target, DT, MENU_FEEL.playful, fx, pointer)
      out.push({ s: structuredClone(s), pose: menuHighlightPose(s, MENU_FEEL.playful, fx) })
    }
    return out
  }
  const neckXs = (frames: ReturnType<typeof runAt>) =>
    frames.filter((f) => f.pose.circles[0]!.r > 0).flatMap((f) => f.pose.circles.slice(1, 1 + MENU_NECK_LUMPS).map((c) => c.x))

  it('aims at the pointer, clamped inside the item; centred without one', () => {
    expect(menuBulgeTarget(row(0), 120)).toBe(120)
    expect(menuBulgeTarget(row(0), 0)).toBe(4 + 14)
    expect(menuBulgeTarget(row(0), 999)).toBe(4 + 180 - 14)
    expect(menuBulgeTarget(row(0), null)).toBe(94)
  })

  it('the neck rides the pointer down the column; keyboard keeps it centred', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(0), 150)
    const xs = neckXs(runAt(s, row(3), 150, 1))
    expect(xs.length).toBeGreaterThan(0)
    for (const x of xs) expect(x).toBeCloseTo(150, 0)

    const k = menuHighlightInit()
    menuHighlightSnap(k, row(0))
    for (const x of neckXs(runAt(k, row(3), null, 1))) expect(x).toBeCloseTo(94, 0)

    const off = menuHighlightInit()
    menuHighlightSnap(off, row(0), 150)
    for (const x of neckXs(runAt(off, row(3), 150, 1, { followPointer: false }))) expect(x).toBeCloseTo(94, 0)
  })

  it('a swell trails the pointer along the item, then settles flush under it', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(1), 30)
    const frames = runAt(s, row(1), 160, 1.5)
    const swelling = frames.filter((f) => f.pose.circles[SWELL]!.r > 0)
    expect(swelling.length).toBeGreaterThan(0)
    const half = 14
    for (const f of swelling) {
      const c = f.pose.circles[SWELL]!
      expect(c.r).toBeGreaterThan(half)
      expect(c.r).toBeLessThanOrEqual(half * (1 + MENU_FEEL.playful.swell!) + 1e-6)
      expect(c.x).toBeGreaterThanOrEqual(4 + half - 1e-6)
      expect(c.x).toBeLessThanOrEqual(4 + 180 - half + 1e-6)
    }
    // A low, wide mound, not a knob: the circles span a good share of the item and rise
    // gently to the peak (no neighbour much taller than the next).
    const wide = swelling.filter((f) => Math.abs(f.s.bx.x - 94) < 30)
    expect(wide.length).toBeGreaterThan(0)
    for (const f of wide) {
      const mound = f.pose.circles.slice(MENU_SWELL_AT, MENU_SWELL_AT + MENU_SWELL_CIRCLES).filter((c) => c.r > 0)
      expect(mound.length).toBeGreaterThanOrEqual(3)
      const xs = mound.map((c) => c.x)
      const peak = f.pose.circles[SWELL]!.r - half
      if (peak > 0.5) expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(180 / 3 * 0.6)
      for (const c of mound) expect(c.r - half).toBeLessThanOrEqual(peak + 1e-9)
    }
    // Springy, not glued: it lags behind the pointer early on.
    expect(frames[3]!.s.bx.x).toBeLessThan(100)
    const last = frames.at(-1)!
    expect(last.s.bx.x).toBeCloseTo(160, 0)
    expect(last.pose.circles.every((c) => c.r === 0)).toBe(true)
    expect(menuHighlightSettled(s, row(1))).toBe(true)
  })

  it('no swell with followPointer off; the item at rest stays flat', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(1), 30)
    const frames = runAt(s, row(1), 160, 1, { followPointer: false })
    expect(frames.every((f) => f.pose.circles.every((c) => c.r === 0))).toBe(true)
  })

  it('appears under the pointer without a swell (grows in place)', () => {
    const s = menuHighlightInit()
    const [first] = runAt(s, row(2), 140, DT)
    expect(first!.s.bx.x).toBe(140)
    expect(first!.pose.circles[SWELL]!.r).toBe(0)
  })
})

describe('menuHighlightStep: travel', () => {
  const travel = (preset: keyof typeof MENU_FEEL = 'playful', fx = {}) => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(0))
    return run(s, row(3), 1.5, preset, fx)
  }

  it('slides to the new item with momentum (overshoots) and settles on it', () => {
    const frames = travel()
    const target = row(3).y + 14
    const maxY = Math.max(...frames.map((f) => f.s.y.x))
    expect(maxY).toBeGreaterThan(target + 0.5)
    const last = frames.at(-1)!
    expect(last.s.y.x).toBeCloseTo(target, 1)
    expect(last.pose.circles.every((c) => c.r < 0.5 || Math.hypot(c.x - 94, c.y - target) < 1)).toBe(true)
  })

  it('stretches along the travel and necks to a tail behind it', () => {
    const frames = travel()
    const stretched = frames.find((f) => f.pose.body.h > 30)
    expect(stretched).toBeDefined()
    const { body, circles } = stretched!.pose
    // The tail trails above the head (it came from row 0).
    expect(circles[0]!.r).toBeGreaterThan(0)
    expect(circles[0]!.y).toBeLessThan(body.cy)
    // Never more than `stretch` item heights longer.
    for (const f of frames) expect(f.pose.body.h).toBeLessThanOrEqual(28 * (1 + MENU_FEEL.playful.stretch) * 1.25)
  })

  it('stays globby: neck lumps are fat and overlap all the way to the tail', () => {
    for (const preset of ['subtle', 'playful', 'wild'] as const) {
      for (const f of travel(preset)) {
        const [tail, ...rest] = f.pose.circles
        const neck = rest.slice(0, 3)
        if (!tail || tail.r === 0) continue
        for (const c of neck) expect(c.r).toBeGreaterThanOrEqual(14 * MENU_NECK_MIN * 0.99)
        // Consecutive lumps (and the tail) touch: no gaps, no string.
        const chain = [...neck, tail]
        for (let i = 1; i < chain.length; i++) {
          const a = chain[i - 1]!
          const b = chain[i]!
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(a.r + b.r)
        }
      }
    }
  })

  it('the tail is held on a short rope', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(0))
    for (const f of run(s, row(12), 1)) {
      expect(Math.hypot(f.s.tx.x - f.s.x.x, f.s.ty.x - f.s.y.x)).toBeLessThanOrEqual(MENU_FEEL.playful.lag * 28 + 1e-6)
    }
  })

  it('wild travels further past the target than subtle', () => {
    const over = (p: 'subtle' | 'wild') => Math.max(...travel(p).map((f) => f.s.y.x)) - (row(3).y + 14)
    expect(over('wild')).toBeGreaterThan(over('subtle'))
  })

  it('toggles: no wobble = no overshoot; no momentum = no tail or stretch', () => {
    const calm = travel('playful', { wobble: false })
    expect(Math.max(...calm.map((f) => f.s.y.x))).toBeLessThanOrEqual(row(3).y + 14 + 0.01)
    const flat = travel('playful', { momentum: false })
    for (const f of flat) {
      expect(f.pose.circles.every((c) => c.r === 0)).toBe(true)
      expect(f.pose.body.h).toBeCloseTo(28, 5)
    }
  })

  it('shrinks out when nothing is highlighted', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(1))
    run(s, null, 0.5)
    expect(menuHighlightPose(s).body.w).toBe(0)
    expect(menuHighlightSettled(s, null)).toBe(true)
  })
})

describe('select pop', () => {
  it('squashes then rebounds, and ends at rest', () => {
    const us = Array.from({ length: 41 }, (_, i) => i / 40)
    const sy = us.map((u) => menuPopSquish(u, 0.13).sy)
    expect(sy[0]).toBe(1)
    expect(sy.at(-1)).toBe(1)
    expect(Math.min(...sy)).toBeLessThan(0.92)
    expect(Math.max(...sy)).toBeGreaterThan(1)
    // Volume-ish: wider while squashed.
    expect(menuPopSquish(0.15, 0.13).sx).toBeGreaterThan(1)
    // No wobble: one squash, never taller.
    expect(Math.max(...us.map((u) => menuPopSquish(u, 0.13, false).sy))).toBeLessThanOrEqual(1)
  })

  it('squishes the body over the pop, then settles', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, row(1))
    s.pop = 0
    const frames = run(s, row(1), 0.6)
    expect(Math.min(...frames.map((f) => f.pose.body.h))).toBeLessThan(27)
    expect(menuHighlightSettled(s, row(1))).toBe(true)
    // Off: no squish.
    s.pop = 0
    const off = run(s, row(1), 0.3, 'playful', { pop: false })
    for (const f of off) expect(f.pose.body.h).toBe(28)
  })
})

describe('attachMenuHighlight', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete document.documentElement.dataset.reducedMotion
  })
  const setup = () => {
    const list = document.createElement('div')
    list.innerHTML = '<div role="menuitem">One</div><div role="menuitem" data-variant="destructive">Two</div>'
    document.body.append(list)
    return list
  }

  it('inserts an aria-hidden highlight behind the items and follows data-highlighted', async () => {
    const list = setup()
    const h = attachMenuHighlight(list)
    const el = list.firstElementChild as HTMLElement
    expect(el.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    expect(list.style.isolation).toBe('isolate')
    expect(h.target).toBeNull()
    const two = list.querySelectorAll('[role="menuitem"]')[1]!
    two.setAttribute('data-highlighted', '')
    await new Promise((r) => setTimeout(r, 0))
    expect(findMenuHighlight(list)).toBe(two)
    expect(h.target).toBe(two)
    expect(el.getAttribute('data-variant')).toBe('destructive')
    expect(h.pop()).toBe(Math.round(MENU_FEEL.playful.pop * 1000))
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(list.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    expect(list.style.isolation).toBe('')
  })

  it('skips items that belong to a nested menu', () => {
    const list = setup()
    const nested = document.createElement('div')
    nested.innerHTML = '<div role="menuitem" data-highlighted>Nested</div>'
    list.append(nested)
    const h = attachMenuHighlight(list)
    const h2 = attachMenuHighlight(nested)
    expect(findMenuHighlight(list)).toBeNull()
    expect(findMenuHighlight(nested)).toBe(nested.querySelector('[data-highlighted]'))
    h2.destroy()
    h.destroy()
  })

  it('reduced motion: snaps, nothing ticks, no pop', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const list = setup()
    list.lastElementChild!.setAttribute('data-highlighted', '')
    const h = attachMenuHighlight(list)
    expect(h.reducedMotion).toBe(true)
    h.refresh()
    expect(activeTickerCount()).toBe(0)
    expect(h.pop()).toBe(0)
    h.destroy()
  })

  it('pop: false turns the select pop off', () => {
    const h = attachMenuHighlight(setup(), { pop: false })
    expect(h.pop()).toBe(0)
    h.destroy()
  })
})
