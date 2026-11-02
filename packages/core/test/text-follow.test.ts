import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACCORDION_FLOODED_ATTR,
  ACCORDION_TRIGGER_ATTR,
  GOOP_PART_ATTR,
  TEXT_COPY_PART,
  TEXT_FOLLOW_ATTR,
  attachAccordion,
  attachToggle,
  gooClipPath,
  gooVanishRadius,
  toggleGooParams,
  type GooCircle,
} from '../src'

const tick = () => new Promise((r) => setTimeout(r, 0))
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const box = (x: number, y: number, w: number, h: number) =>
  ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/** A laid-out button host (happy-dom has no layout). */
const button = (w: number, h: number, text: string, attrs: Record<string, string> = {}): HTMLButtonElement => {
  const b = document.createElement('button')
  b.className = 'inline-flex px-2'
  for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v)
  b.id = 'real'
  const span = document.createElement('span')
  span.textContent = text
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  b.append(span, icon)
  b.getBoundingClientRect = () => box(0, 0, w, h)
  span.getBoundingClientRect = () => box(8, h / 2 - 8, 60, 16)
  Object.defineProperty(b, 'offsetWidth', { value: w })
  Object.defineProperty(b, 'offsetHeight', { value: h })
  document.body.append(b)
  return b
}
const copyOf = (el: Element): HTMLElement | null => el.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="${TEXT_COPY_PART}"]`)
const press = (b: HTMLElement, on: boolean): void => {
  b.setAttribute('data-state', on ? 'on' : 'off')
  b.setAttribute('aria-pressed', String(on))
}

describe('gooClipPath', () => {
  const c = (x: number, y: number, r: number, sx = 1, sy = 1): GooCircle => ({ x, y, r, sx, sy })
  it('is empty when no goo reaches the box', () => {
    expect(gooClipPath([], { x: 0, y: 0, w: 100, h: 40 })).toBe('')
    expect(gooClipPath([c(300, 20, 10), c(50, 20, 0)], { x: 0, y: 0, w: 100, h: 40 })).toBe('')
  })
  it('is the union of the circles in the box coordinates', () => {
    const d = gooClipPath([c(30, 20, 10), c(45, 20, 10)], { x: 10, y: 5, w: 100, h: 40 })
    expect(d).toBe('M10 15a10 10 0 1 0 20 0a10 10 0 1 0 -20 0ZM25 15a10 10 0 1 0 20 0a10 10 0 1 0 -20 0Z')
  })
  it('shrinks circles the way the goo filter does, dropping ones below the vanish radius', () => {
    const d = gooClipPath([c(50, 20, 5), c(20, 20, 3, 2, 1)], { x: 0, y: 0, w: 100, h: 40 }, 4)
    // sqrt(25 - 16) = 3; the r = 3 circle vanishes.
    expect(d).toBe('M47 20a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z')
  })
})

describe('text follows the goo', () => {
  it('a flood puts up an aria-hidden, inert copy clipped to the fill; it goes once drained', async () => {
    const b = button(120, 36, 'Bold')
    const h = attachToggle(b, { speed: 8 })
    expect(copyOf(b)).toBeNull()
    press(b, true)
    await tick()
    const copy = copyOf(b)!
    expect(copy).not.toBeNull()
    expect(copy.getAttribute('aria-hidden')).toBe('true')
    expect(copy.hasAttribute('inert')).toBe(true)
    expect(copy.hasAttribute('id')).toBe(false)
    expect(copy.querySelector('[id]')).toBeNull()
    expect(copy.style.getPropertyValue('pointer-events')).toBe('none')
    expect(copy.style.getPropertyValue('user-select')).toBe('none')
    expect(copy.textContent).toBe('Bold')
    expect(copy.querySelector('svg')).not.toBeNull()
    expect(copy.className).toBe(b.className)
    expect(b.hasAttribute(TEXT_FOLLOW_ATTR)).toBe(true)
    // The copy sits exactly over the button and is clipped to the goo the engine just drew.
    expect(copy.style.getPropertyValue('width')).toBe('120px')
    expect(copy.style.getPropertyValue('height')).toBe('36px')
    const vanish = gooVanishRadius(toggleGooParams(36))
    const path = gooClipPath(h.pose!.circles, { x: 0, y: 0, w: 120, h: 36 }, vanish)
    expect(path).not.toBe('')
    expect(copy.style.getPropertyValue('clip-path')).toBe(`path("${path}")`)
    // Only one copy, and the engine's own layer is not in it.
    expect(b.querySelectorAll(`[${GOOP_PART_ATTR}="${TEXT_COPY_PART}"]`)).toHaveLength(1)
    expect(copy.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    press(b, false)
    await wait(250)
    expect(h.running).toBe(false)
    expect(copyOf(b)).toBeNull()
    // Still following: the real label keeps its normal color.
    expect(b.hasAttribute(TEXT_FOLLOW_ATTR)).toBe(true)
    h.destroy()
  })

  it('the clip tracks the fill frame by frame', async () => {
    const b = button(160, 36, 'Italic')
    const h = attachToggle(b, { speed: 0.5 })
    press(b, true)
    await wait(40)
    const first = copyOf(b)!.style.getPropertyValue('clip-path')
    await wait(60)
    const later = copyOf(b)!.style.getPropertyValue('clip-path')
    expect(later).not.toBe(first)
    const vanish = gooVanishRadius(toggleGooParams(36))
    expect(later).toBe(`path("${gooClipPath(h.pose!.circles, { x: 0, y: 0, w: 160, h: 36 }, vanish)}")`)
    h.destroy()
  })

  it('keeps the copy in step with the real label', async () => {
    const b = button(120, 36, 'Bold')
    const h = attachToggle(b, { speed: 0.5 })
    press(b, true)
    await wait(40)
    b.querySelector('span')!.textContent = 'Heavy'
    b.setAttribute('data-size', 'lg')
    await tick()
    const copy = copyOf(b)!
    expect(copy.textContent).toBe('Heavy')
    expect(copy.getAttribute('data-state')).toBe('on')
    expect(copy.getAttribute('data-size')).toBe('lg')
    expect(copy.hasAttribute('aria-pressed')).toBe(false)
    h.destroy()
  })

  it('cleans up on detach', async () => {
    const b = button(120, 36, 'Bold')
    const h = attachToggle(b, { speed: 0.5 })
    press(b, true)
    await wait(40)
    expect(copyOf(b)).not.toBeNull()
    h.destroy()
    expect(copyOf(b)).toBeNull()
    expect(b.hasAttribute(TEXT_FOLLOW_ATTR)).toBe(false)
  })

  it('switching it off mid-flood drops the copy', async () => {
    const b = button(120, 36, 'Bold')
    const h = attachToggle(b, { speed: 0.5 })
    press(b, true)
    await wait(40)
    expect(copyOf(b)).not.toBeNull()
    h.update({ textFollow: false })
    expect(copyOf(b)).toBeNull()
    expect(b.hasAttribute(TEXT_FOLLOW_ATTR)).toBe(false)
    h.destroy()
  })

  describe('accordion trigger', () => {
    const trigger = (open: boolean): { host: HTMLElement; trigger: HTMLButtonElement } => {
      const host = document.createElement('div')
      host.setAttribute('data-goop-accordion', '')
      host.setAttribute('data-state', open ? 'open' : 'closed')
      const t = button(400, 52, 'Details', { [ACCORDION_TRIGGER_ATTR]: '', 'data-state': open ? 'open' : 'closed' })
      host.append(t)
      document.body.append(host)
      return { host, trigger: t }
    }
    const setOpen = (i: { host: HTMLElement; trigger: HTMLElement }, open: boolean): void => {
      i.host.setAttribute('data-state', open ? 'open' : 'closed')
      i.trigger.setAttribute('data-state', open ? 'open' : 'closed')
    }

    it('follows by default: a copy instead of the all-at-once flip', async () => {
      const i = trigger(false)
      const h = attachAccordion(i.host, { speed: 0.5 })
      setOpen(i, true)
      await wait(80)
      expect(copyOf(i.trigger)).not.toBeNull()
      expect(i.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(false)
      h.destroy()
      expect(copyOf(i.trigger)).toBeNull()
    })

    it('an open row at rest keeps its full copy, no ticker', () => {
      const i = trigger(true)
      const h = attachAccordion(i.host)
      expect(h.running).toBe(false)
      expect(copyOf(i.trigger)).not.toBeNull()
      expect(copyOf(i.trigger)!.getAttribute('data-state')).toBe('open')
      h.destroy()
    })

    it('textFollow off restores the flip', () => {
      const i = trigger(true)
      const h = attachAccordion(i.host, { textFollow: false })
      expect(copyOf(i.trigger)).toBeNull()
      expect(i.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
      h.destroy()
    })

    it('reduced motion uses the flip', async () => {
      const i = trigger(false)
      const h = attachAccordion(i.host, { reducedMotion: true })
      setOpen(i, true)
      await tick()
      expect(copyOf(i.trigger)).toBeNull()
      expect(i.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
      h.destroy()
    })

    it('without clip-path: path() support it flips', () => {
      const win = document.defaultView!
      const prev = Object.getOwnPropertyDescriptor(win, 'CSS')
      Object.defineProperty(win, 'CSS', { value: { supports: () => false }, configurable: true, writable: true })
      try {
        const i = trigger(true)
        const h = attachAccordion(i.host)
        expect(copyOf(i.trigger)).toBeNull()
        expect(i.trigger.hasAttribute(ACCORDION_FLOODED_ATTR)).toBe(true)
        h.destroy()
      } finally {
        if (prev) Object.defineProperty(win, 'CSS', prev)
        else delete (win as unknown as { CSS?: unknown }).CSS
      }
    })
  })
})
