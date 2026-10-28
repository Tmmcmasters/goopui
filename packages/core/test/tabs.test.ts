import { afterEach, describe, expect, it } from 'vitest'
import {
  EMERGE_FEEL,
  GOOP_PART_ATTR,
  MENU_FEEL,
  MENU_HIGHLIGHT_CIRCLES,
  MENU_NECK_MIN,
  TABS_EFFECTS,
  TABS_FEEL,
  TOOLTIP_FEEL,
  TOOLTIP_MOMENTUM,
  activeTickerCount,
  attachEmerge,
  attachTabsIndicator,
  emergeBridge,
  findActiveTab,
  menuHighlightInit,
  menuHighlightPose,
  menuHighlightSettled,
  menuHighlightSnap,
  menuHighlightStep,
  type EmergeRect,
  type MenuHighlightState,
} from '../src'

// Four tabs side by side in a 36px list with 3px padding, like shadcn's TabsList.
const tab = (i: number): EmergeRect => ({ x: 3 + i * 80, y: 3, width: 80, height: 28 })
const DT = 1 / 60
type Preset = keyof typeof TABS_FEEL

const run = (s: MenuHighlightState, target: EmergeRect | null, seconds: number, preset: Preset = 'playful', fx = {}) => {
  const frames = []
  for (let t = 0; t < seconds; t += DT) {
    menuHighlightStep(s, target, DT, TABS_FEEL[preset], fx)
    frames.push({ s: structuredClone(s), pose: menuHighlightPose(s, TABS_FEEL[preset], fx) })
  }
  return frames
}
const slide = (from: number, to: number, preset: Preset = 'playful', fx = {}) => {
  const s = menuHighlightInit()
  menuHighlightSnap(s, tab(from))
  return run(s, tab(to), 2, preset, fx)
}
const centerX = (i: number) => tab(i).x + 40

describe('tabs indicator geometry (TABS_FEEL)', () => {
  it('at rest is exactly the active trigger', () => {
    const s = menuHighlightInit()
    menuHighlightSnap(s, tab(1))
    const { body, circles } = menuHighlightPose(s, TABS_FEEL.playful)
    expect(body).toEqual({ cx: 123, cy: 17, w: 80, h: 28 })
    expect(circles.every((c) => c.r === 0)).toBe(true)
  })

  it('slides sideways with momentum, overshoots the target, then settles on it', () => {
    const frames = slide(0, 2)
    expect(Math.max(...frames.map((f) => f.s.x.x))).toBeGreaterThan(centerX(2) + 0.5)
    const last = frames.at(-1)!
    expect(last.s.x.x).toBeCloseTo(centerX(2), 1)
    expect(menuHighlightSettled(last.s, tab(2))).toBe(true)
    // Settled: back to the trigger's exact shape, nothing trailing.
    expect(last.pose.body.w).toBeCloseTo(80, 1)
    expect(last.pose.body.h).toBeCloseTo(28, 1)
  })

  it('stretches along the travel and trails a tail behind (toward where it came from)', () => {
    const frames = slide(0, 3)
    const stretched = frames.find((f) => f.pose.body.w > 84)
    expect(stretched).toBeDefined()
    const { body, circles } = stretched!.pose
    expect(circles[0]!.r).toBeGreaterThan(0)
    expect(circles[0]!.x).toBeLessThan(body.cx)
    // Travelling sideways keeps the body in the track: it never grows taller.
    for (const f of frames) expect(f.pose.body.h).toBeLessThanOrEqual(28 + 1e-6)
    // Bounded stretch.
    for (const f of frames) expect(f.pose.body.w).toBeLessThanOrEqual(80 * 1.25 + 28 * TABS_FEEL.playful.stretch)
  })

  it('stays globby: fat, overlapping neck lumps all the way to the tail, every preset', () => {
    for (const preset of ['subtle', 'playful', 'wild'] as const) {
      for (const f of slide(0, 3, preset)) {
        const [tail, ...neck] = f.pose.circles
        if (!tail || tail.r === 0) continue
        for (const c of neck) expect(c.r).toBeGreaterThanOrEqual(14 * MENU_NECK_MIN * 0.99)
        const chain = [...neck, tail]
        for (let i = 1; i < chain.length; i++) {
          const a = chain[i - 1]!
          const b = chain[i]!
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(a.r + b.r)
        }
      }
    }
  })

  it('holds the tail on its rope', () => {
    for (const f of slide(0, 3)) {
      expect(Math.hypot(f.s.tx.x - f.s.x.x, f.s.ty.x - f.s.y.x)).toBeLessThanOrEqual(TABS_FEEL.playful.lag * 28 + 1e-6)
    }
  })

  it('wild overshoots further than subtle; tabs travel looser than the menu', () => {
    const over = (p: Preset) => Math.max(...slide(0, 2, p).map((f) => f.s.x.x)) - centerX(2)
    expect(over('wild')).toBeGreaterThan(over('subtle'))
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(TABS_FEEL[p].lag).toBeGreaterThan(MENU_FEEL[p].lag)
      expect(TABS_FEEL[p].stretch).toBeGreaterThan(MENU_FEEL[p].stretch)
    }
  })

  it('toggles: no wobble = no overshoot; no momentum = no tail or stretch', () => {
    expect(Math.max(...slide(0, 2, 'playful', { wobble: false }).map((f) => f.s.x.x))).toBeLessThanOrEqual(centerX(2) + 0.01)
    for (const f of slide(0, 2, 'playful', { momentum: false })) {
      expect(f.pose.circles.every((c) => c.r === 0)).toBe(true)
    }
  })

  it('lists its toggles', () => {
    expect([...TABS_EFFECTS]).toEqual(['indicator', 'wobble', 'momentum'])
  })
})

describe('attachTabsIndicator', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete document.documentElement.dataset.reducedMotion
  })
  const setup = () => {
    const list = document.createElement('div')
    list.setAttribute('role', 'tablist')
    list.innerHTML =
      '<button role="tab" data-state="active">One</button><button role="tab" data-state="inactive">Two</button>'
    document.body.append(list)
    return list
  }

  it('inserts an aria-hidden blob behind the triggers and follows data-state="active"', async () => {
    const list = setup()
    const h = attachTabsIndicator(list)
    const el = list.firstElementChild as HTMLElement
    expect(el.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    const [one, two] = list.querySelectorAll('[role="tab"]')
    expect(h.target).toBe(one)
    one!.setAttribute('data-state', 'inactive')
    two!.setAttribute('data-state', 'active')
    await new Promise((r) => setTimeout(r, 0))
    expect(findActiveTab(list)).toBe(two)
    expect(h.target).toBe(two)
    // No select pop on tabs.
    expect(h.pop()).toBe(0)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(list.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
  })

  it('skips triggers of a nested tab list', () => {
    const list = setup()
    const nested = setup()
    list.append(nested)
    const h = attachTabsIndicator(list)
    const h2 = attachTabsIndicator(nested)
    expect(findActiveTab(list)).toBe(list.querySelector(':scope > [role="tab"]'))
    expect(findActiveTab(nested)).toBe(nested.querySelector('[role="tab"]'))
    h2.destroy()
    h.destroy()
  })

  it('reduced motion: snaps, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const h = attachTabsIndicator(setup())
    expect(h.reducedMotion).toBe(true)
    h.refresh()
    expect(activeTickerCount()).toBe(0)
    h.destroy()
  })
})

describe('TOOLTIP_FEEL', () => {
  it('is a quicker, smaller emerge than the popover, with light momentum and no drips', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(TOOLTIP_FEEL[p].open).toBeLessThan(EMERGE_FEEL[p].open)
      expect(TOOLTIP_FEEL[p].close).toBeLessThan(EMERGE_FEEL[p].close)
      expect(TOOLTIP_FEEL[p].bulb).toBeLessThan(EMERGE_FEEL[p].bulb)
    }
    const anchor = { x: 100, y: 100, width: 36, height: 36 }
    const panel = { x: 80, y: 60, width: 76, height: 32 }
    expect(emergeBridge(anchor, panel, 'top', TOOLTIP_FEEL.playful).bulb).toBeLessThan(
      emergeBridge(anchor, panel, 'top', EMERGE_FEEL.playful).bulb,
    )
    expect(TOOLTIP_MOMENTUM.openDrips).toBe(false)
    expect(TOOLTIP_MOMENTUM.openSlosh).toBeLessThan(1)
  })

  it('attachEmerge uses a passed feel table (close timing follows it)', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const a = attachEmerge(host, { feel: TOOLTIP_FEEL })
    expect(a.closeDuration).toBe(Math.round(TOOLTIP_FEEL.playful.close * 1000))
    a.destroy()
    host.remove()
  })
})
