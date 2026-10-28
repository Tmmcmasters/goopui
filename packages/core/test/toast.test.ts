import { afterEach, describe, expect, it } from 'vitest'
import {
  TOAST_FEEL,
  TOAST_GOO_ATTR,
  attachToaster,
  toastDropEnd,
  toastDropPose,
  toastFadeBody,
  toastLeaveEnd,
  toastLeavePose,
  toastNeck,
  toastNeckGap,
  type EmergeRect,
  type ToastCircle,
} from '../src'

const rect: EmergeRect = { x: 100, y: 500, width: 356, height: 56 }
const times = (end: number, n = 120) => Array.from({ length: n + 1 }, (_, i) => (end * i) / n)
const live = (cs: ToastCircle[]) => cs.filter((c) => c.r > 0.3)

describe('toastDropPose', () => {
  it('starts as a small round blob on the toaster-side edge', () => {
    const { body } = toastDropPose(0.01, rect, 'bottom', { radius: 16 })
    expect(body).not.toBeNull()
    expect(body!.w).toBeLessThan(rect.width * 0.3)
    expect(body!.h).toBeLessThan(rect.height)
    // Round: radius is half the smaller side.
    expect(body!.r).toBeCloseTo(Math.min(body!.w, body!.h) / 2, 1)
    // Anchored to the bottom edge (it grows upward, away from the toaster edge).
    expect(body!.y + body!.h).toBeCloseTo(rect.y + rect.height, 3)
  })

  it('anchors to the top edge for a top toaster', () => {
    const { body } = toastDropPose(0.05, rect, 'top')
    expect(body!.y).toBeCloseTo(rect.y, 3)
  })

  it('overshoots past the rect, then settles exactly on it', () => {
    const hs = times(toastDropEnd(), 300).map((s) => toastDropPose(s, rect, 'bottom').body!.h)
    expect(Math.max(...hs)).toBeGreaterThan(rect.height)
    const end = toastDropPose(toastDropEnd() + 0.01, rect, 'bottom', { radius: 12 })
    expect(end.body).toEqual({ x: rect.x, y: rect.y, w: rect.width, h: rect.height, r: 12 })
    expect(end.circles).toEqual([])
  })

  it('trails an ooze neck toward the edge that snaps and recoils', () => {
    const early = live(toastDropPose(0.12, rect, 'bottom').circles)
    expect(early.length).toBeGreaterThanOrEqual(3)
    // Trail hangs below the body's bottom edge (toward the toaster edge).
    expect(Math.max(...early.map((c) => c.y))).toBeGreaterThan(rect.y + rect.height)
    const late = live(toastDropPose(TOAST_FEEL.playful.drop * 0.7, rect, 'bottom').circles)
    expect(late.every((c) => c.y < rect.y + rect.height + 1 || c.r < 3)).toBe(true)
  })

  it('strength 0 is the plain rect', () => {
    expect(toastDropPose(0.1, rect, 'bottom', { strength: 0 }).circles).toEqual([])
  })
})

describe('toastNeck', () => {
  const front: EmergeRect = { x: 100, y: 500, width: 356, height: 56 }
  // Collapsed stack: the back toast peeks out above, narrower.
  const back: EmergeRect = { x: 109, y: 486, width: 338, height: 56 }

  it('gap is negative for overlap and positive when apart', () => {
    expect(toastNeckGap(back, front)).toBeLessThan(0)
    expect(toastNeckGap(front, { ...front, y: 570 })).toBeCloseTo(14)
  })

  it('collapsed: fills the corners where the peeking toast meets the front one', () => {
    const cs = toastNeck(back, front)
    expect(cs.length).toBe(3)
    // Seam is the wider (front) toast's top edge; edge columns sit near the narrower one's sides.
    for (const c of cs) expect(c.y).toBeCloseTo(front.y)
    expect(cs[0]!.x).toBeLessThan(back.x + 20)
    expect(cs[2]!.x).toBeGreaterThan(back.x + back.width - 20)
  })

  it('stretches (thinner, taller) as the gap grows, still reaching both edges', () => {
    const near = toastNeck(front, { ...front, y: 558 })[1]!
    const far = toastNeck(front, { ...front, y: 565 })[1]!
    expect(far.r * (far.sx ?? 1)).toBeLessThan(near.r * (near.sx ?? 1))
    expect(far.sy ?? 1).toBeGreaterThan(near.sy ?? 1)
    const gap = 9
    expect(far.r * (far.sy ?? 1)).toBeGreaterThan(gap / 2)
    // Never a string: still a fat neck at the snap point.
    const snap = toastNeck(front, { ...front, y: 556 + TOAST_FEEL.playful.snapGap })[1]!
    expect(snap.r * (snap.sx ?? 1)).toBeGreaterThan(TOAST_FEEL.playful.neck * 0.5)
  })

  it('after the snap, stubs recoil into both bodies and vanish', () => {
    const lower = { ...front, y: 570 }
    const s0 = toastNeck(front, lower, { snapAge: 0 })
    expect(s0.length).toBe(6)
    expect(s0.some((c) => c.y > front.y + front.height && c.y < lower.y)).toBe(true)
    expect(toastNeck(front, lower, { snapAge: TOAST_FEEL.playful.recoil })).toEqual([])
  })

  it('nothing when the toasts share no width, or strength is 0', () => {
    expect(toastNeck(front, { ...front, x: 600 })).toEqual([])
    expect(toastNeck(back, front, { strength: 0 })).toEqual([])
  })

  it('grows in from nothing', () => {
    expect(toastNeck(back, front, { grow: 0 })).toEqual([])
    expect(toastNeck(back, front, { grow: 0.5 })[1]!.r).toBeLessThan(toastNeck(back, front)[1]!.r)
  })
})

describe('toastLeavePose', () => {
  it('body sags and pinches away; drops fall below and fade by the end', () => {
    const mid = toastLeavePose(TOAST_FEEL.playful.leave * 0.5, rect, { seed: 3 })
    expect(mid.body!.w).toBeLessThan(rect.width)
    expect(mid.body!.h).toBeLessThan(rect.height)
    expect(toastLeavePose(TOAST_FEEL.playful.leave, rect).body).toBeNull()
    const a = live(toastLeavePose(0.3, rect, { seed: 3 }).circles)
    const b = live(toastLeavePose(0.45, rect, { seed: 3 }).circles)
    expect(a.length).toBeGreaterThanOrEqual(2)
    const lowest = (cs: ToastCircle[]) => Math.max(...cs.map((c) => c.y))
    expect(lowest(a)).toBeGreaterThan(rect.y + rect.height)
    expect(lowest(b)).toBeGreaterThan(lowest(a))
    const end = toastLeavePose(toastLeaveEnd(), rect, { seed: 3 })
    expect(end.body).toBeNull()
    expect(live(end.circles)).toEqual([])
  })

  it('swipe right flings the drops to the right', () => {
    const cs = live(toastLeavePose(0.3, rect, { swipe: 'right', seed: 2 }).circles)
    expect(cs.length).toBeGreaterThan(0)
    expect(Math.max(...cs.map((c) => c.x))).toBeGreaterThan(rect.x + rect.width + 60)
    const left = live(toastLeavePose(0.3, rect, { swipe: 'left', seed: 2 }).circles)
    expect(Math.min(...left.map((c) => c.x))).toBeLessThan(rect.x - 60)
  })

  it('drips off: just the pinching body', () => {
    expect(live(toastLeavePose(0.2, rect, { strength: 0 }).circles)).toEqual([])
  })

  it('is deterministic per seed and varies across seeds', () => {
    const a = toastLeavePose(0.25, rect, { seed: 1 })
    expect(toastLeavePose(0.25, rect, { seed: 1 })).toEqual(a)
    expect(toastLeavePose(0.25, rect, { seed: 2 })).not.toEqual(a)
  })
})

describe('toastFadeBody', () => {
  it('is the rect when opaque, nothing when faded out', () => {
    expect(toastFadeBody(rect, 1, 8)).toEqual({ x: 100, y: 500, w: 356, h: 56, r: 8 })
    expect(toastFadeBody(rect, 0)).toBeNull()
  })
  it('inflates from the middle, monotonically, as the toast fades in', () => {
    let prev = 0
    for (let i = 1; i <= 20; i++) {
      const b = toastFadeBody(rect, i / 20)
      if (!b) continue
      expect(b.h).toBeGreaterThanOrEqual(prev)
      expect(b.y + b.h / 2).toBeCloseTo(rect.y + rect.height / 2)
      expect(b.x + b.w / 2).toBeCloseTo(rect.x + rect.width / 2)
      prev = b.h
    }
    expect(prev).toBe(rect.height)
  })
})

describe('attachToaster (DOM)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const mount = () => {
    const section = document.createElement('section')
    section.innerHTML =
      '<ol data-sonner-toaster><li data-sonner-toast data-y-position="bottom" style="background: rgb(255, 255, 255)">Hi</li></ol>'
    document.body.append(section)
    return section
  }

  it('adds one aria-hidden layer to body and paints toast backgrounds as goo', () => {
    const section = mount()
    const h = attachToaster(section, { reducedMotion: false })
    expect(h.layer.getAttribute('aria-hidden')).toBe('true')
    expect(h.layer.parentElement).toBe(document.body)
    const li = section.querySelector('li')!
    expect(li.hasAttribute(TOAST_GOO_ATTR)).toBe(true)
    expect(li.style.getPropertyValue('background')).toBe('transparent')
    expect(h.count).toBe(1)
    h.destroy()
    expect(document.querySelector('[data-goop="toaster"]')).toBeNull()
    expect(li.hasAttribute(TOAST_GOO_ATTR)).toBe(false)
    expect(li.style.getPropertyValue('background')).toBe('rgb(255, 255, 255)')
  })

  it('leaves transparent (unstyled) toasts alone', () => {
    const section = document.createElement('section')
    section.innerHTML = '<ol data-sonner-toaster><li data-sonner-toast>Hi</li></ol>'
    document.body.append(section)
    const h = attachToaster(section)
    expect(section.querySelector('li')!.hasAttribute(TOAST_GOO_ATTR)).toBe(false)
    h.destroy()
  })

  it('tracks toasts added later', async () => {
    const section = mount()
    const h = attachToaster(section, { reducedMotion: true })
    expect(h.reducedMotion).toBe(true)
    const li = document.createElement('li')
    li.setAttribute('data-sonner-toast', '')
    li.setAttribute('style', 'background: rgb(0, 128, 0)')
    section.querySelector('ol')!.append(li)
    await new Promise((r) => setTimeout(r, 0))
    expect(h.count).toBe(2)
    expect(li.hasAttribute(TOAST_GOO_ATTR)).toBe(true)
    h.destroy()
  })

  // Live rects / opacity per toast (happy-dom has no layout).
  const stub = (el: HTMLElement, r: EmergeRect, opacity = 1) => {
    el.getBoundingClientRect = () => ({ left: r.x, top: r.y, width: r.width, height: r.height, right: r.x + r.width, bottom: r.y + r.height, x: r.x, y: r.y, toJSON: () => r }) as DOMRect
    el.style.opacity = String(opacity)
  }
  const translate = (t: string) => {
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(t)!
    return { x: Number(m[1]), y: Number(m[2]) }
  }
  /** Painted bodies in viewport space: top edge and height. */
  const bodies = (h: { layer: HTMLElement }) => {
    const layer = h.layer.querySelector<HTMLElement>('[data-goop="layer"]')!
    const o = translate(layer.style.transform)
    return [...layer.querySelectorAll<HTMLElement>('[data-goop="body"]')]
      .filter((b) => b.style.display !== 'none')
      .map((b) => ({ y: o.y + translate(b.style.transform).y, h: Number.parseFloat(b.style.height) }))
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('a leaving body follows the toast, and stays put (no jump back) once it unmounts', async () => {
    const section = mount()
    const li = section.querySelector('li')!
    stub(li, { x: 0, y: 100, width: 300, height: 50 })
    const h = attachToaster(section, { reducedMotion: false })
    li.setAttribute('data-removed', 'true')
    await flush()
    // Sonner's removal lift moves it 40px down while it fades.
    stub(li, { x: 0, y: 140, width: 300, height: 50 })
    h.refresh()
    const [live] = bodies(h)
    expect(live!.y).toBeGreaterThan(140 - 1)
    li.remove()
    await flush()
    h.refresh()
    const [gone] = bodies(h)
    expect(Math.abs(gone!.y - live!.y)).toBeLessThan(2)
    h.destroy()
  })

  it('follows sonner fading a toast in (no pop), and skips faded-out ones', () => {
    const section = mount()
    const li = section.querySelector('li')!
    stub(li, { x: 0, y: 100, width: 300, height: 50 }, 0)
    const h = attachToaster(section, { reducedMotion: false })
    expect(bodies(h)).toHaveLength(0)
    stub(li, { x: 0, y: 100, width: 300, height: 50 }, 0.3)
    h.refresh()
    const [half] = bodies(h)
    expect(half!.h).toBeGreaterThan(0)
    expect(half!.h).toBeLessThan(50)
    stub(li, { x: 0, y: 100, width: 300, height: 50 }, 1)
    h.refresh()
    expect(bodies(h)[0]).toEqual({ y: 100, h: 50 })
    h.destroy()
  })

  it('a toast that leaves while faded out (past visibleToasts) does not drip', async () => {
    const section = mount()
    const li = section.querySelector('li')!
    stub(li, { x: 0, y: 100, width: 300, height: 50 }, 0)
    const h = attachToaster(section, { reducedMotion: false })
    li.setAttribute('data-removed', 'true')
    await flush()
    h.refresh()
    expect(bodies(h)).toHaveLength(0)
    expect(h.layer.querySelectorAll('[data-goop="blob"]').length).toBe(0)
    h.destroy()
  })
})
