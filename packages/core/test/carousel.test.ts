// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CAROUSEL_EFFECTS,
  CAROUSEL_FEEL,
  CAROUSEL_SLOSH_PART,
  activeTickerCount,
  attachCarousel,
  attachCarouselDots,
  brakeCarouselStretch,
  carouselBandShape,
  carouselBandTarget,
  carouselSlidePath,
  carouselStretchScale,
  carouselStretchTarget,
  createCarouselSlideEdges,
  createCarouselSpring,
  findActiveCarouselDot,
  findCarouselSurface,
  stepCarouselSlide,
  stepCarouselSpring,
  carouselSlideBulge,
  type CarouselHandle,
} from '../src'

const DT = 1 / 60
type Preset = keyof typeof CAROUSEL_FEEL
const PRESETS: Preset[] = ['subtle', 'playful', 'wild']

describe('carousel feel (pure)', () => {
  it('lists every effect', () => {
    expect([...CAROUSEL_EFFECTS]).toEqual(['stretch', 'slosh', 'rubberBand', 'squish', 'dots'])
  })

  it('presets grow from subtle to wild', () => {
    for (const k of ['bulge', 'stretch', 'band', 'stretchKick'] as const) {
      expect(CAROUSEL_FEEL.subtle[k]).toBeLessThan(CAROUSEL_FEEL.playful[k])
      expect(CAROUSEL_FEEL.playful[k]).toBeLessThan(CAROUSEL_FEEL.wild[k])
    }
  })

  it('stretch follows speed, is capped, and is zero when off', () => {
    const f = CAROUSEL_FEEL.playful
    expect(carouselStretchTarget(0, 300, f)).toBe(0)
    expect(carouselStretchTarget(200, 300, f)).toBeGreaterThan(0)
    expect(carouselStretchTarget(-200, 300, f)).toBe(carouselStretchTarget(200, 300, f))
    expect(carouselStretchTarget(1e6, 300, f)).toBe(f.stretch)
    // Small slides stretch less (at most 2.5% of their length per side).
    expect(carouselStretchTarget(1e6, 80, f)).toBeCloseTo(2)
    expect(carouselStretchTarget(1e6, 300, f, 0)).toBe(0)
  })

  it('a fast slide that snaps to a stop overshoots into a squash and settles (the jelly wobble)', () => {
    for (const p of PRESETS) {
      const f = CAROUSEL_FEEL[p]
      const s = createCarouselSpring()
      let target = 0
      let peak = 0
      // Fling at 2000 px/s, then brake to 0 over ~0.25 s (an embla snap).
      for (let t = 0; t < 0.4; t += DT) {
        const next = carouselStretchTarget(2000, 300, f)
        brakeCarouselStretch(s, target, next, f)
        target = next
        stepCarouselSpring(s, DT, target, f.stretchResponse, f.stretchDamping)
        peak = Math.max(peak, s.x)
      }
      let low = 0
      for (let t = 0; t < 0.25; t += DT) {
        const speed = 2000 * Math.max(0, 1 - t / 0.25)
        const next = carouselStretchTarget(speed, 300, f)
        brakeCarouselStretch(s, target, next, f)
        target = next
        stepCarouselSpring(s, DT, target, f.stretchResponse, f.stretchDamping)
        low = Math.min(low, s.x)
      }
      for (let t = 0; t < 3; t += DT) {
        stepCarouselSpring(s, DT, 0, f.stretchResponse, f.stretchDamping)
        low = Math.min(low, s.x)
      }
      expect(peak).toBeGreaterThan(f.stretch * 0.8)
      // Squashes past rest, but gently: well under the stretch.
      expect(low).toBeLessThan(-0.05)
      expect(-low).toBeLessThan(peak)
      expect(Math.abs(s.x)).toBeLessThan(0.01)
    }
  })

  it('stretch scale grows along the axis and thins across', () => {
    expect(carouselStretchScale(0, 300)).toBe('')
    const [a, c] = carouselStretchScale(3, 300, 'x').split(' ').map(Number)
    expect(a).toBeCloseTo(1.02)
    expect(c).toBeLessThan(1)
    const [cy, ay] = carouselStretchScale(3, 300, 'y').split(' ').map(Number)
    expect(ay).toBeCloseTo(1.02)
    expect(cy).toBeLessThan(1)
  })

  it('the rubber band is one low, wide mound (no knob)', () => {
    expect(carouselBandShape(0)).toBe(0)
    expect(carouselBandShape(1)).toBe(0)
    expect(carouselBandShape(0.5)).toBeCloseTo(1)
    // Wide: still more than half height a quarter of the way along.
    expect(carouselBandShape(0.25)).toBeGreaterThan(0.45)
    // Smooth: no step between neighbouring samples anywhere.
    let maxStep = 0
    for (let i = 1; i <= 200; i++) maxStep = Math.max(maxStep, Math.abs(carouselBandShape(i / 200, 0.42) - carouselBandShape((i - 1) / 200, 0.42)))
    expect(maxStep).toBeLessThan(0.03)
  })

  it('the band target stays under the gap and low relative to the edge', () => {
    for (const p of PRESETS) {
      const f = CAROUSEL_FEEL[p]
      for (const over of [1, 10, 40, 120, 400]) {
        const h = carouselBandTarget(over, 300, f)
        expect(h).toBeLessThan(over)
        expect(h).toBeLessThanOrEqual(300 * 0.12)
        expect(h).toBeLessThanOrEqual(f.band)
      }
      expect(carouselBandTarget(0, 300, f)).toBe(0)
      expect(carouselBandTarget(-20, 300, f)).toBe(0)
    }
  })

  it('slosh kicks the leading edge out when a slide brakes, and settles', () => {
    const f = CAROUSEL_FEEL.playful
    const e = createCarouselSlideEdges(300, f, () => 0.5)
    stepCarouselSlide(e, DT, f, 1500, 1500)
    for (let t = 0; t < 0.2; t += DT) stepCarouselSlide(e, DT, f, 1500, 0)
    stepCarouselSlide(e, DT, f, 0, -1500)
    let peak = 0
    for (let t = 0; t < 0.3; t += DT) {
      stepCarouselSlide(e, DT, f, 0, 0)
      peak = Math.max(peak, carouselSlideBulge(e))
    }
    expect(peak).toBeGreaterThan(0.5)
    expect(peak).toBeLessThanOrEqual(f.bulge * 1.01)
    for (let t = 0; t < 4; t += DT) stepCarouselSlide(e, DT, f, 0, 0)
    expect(carouselSlideBulge(e)).toBeLessThan(0.2)
  })

  it('the path is the plain rounded box at rest and bulges out with a band', () => {
    const box = { width: 200, height: 160, radius: 12, border: 1 }
    const rest = carouselSlidePath(box, null, 'x')
    const xs = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]))
    expect(Math.min(...xs(rest))).toBeGreaterThanOrEqual(0)
    const banded = carouselSlidePath(box, null, 'x', { start: { height: 14, centre: 0.5 } })
    expect(Math.min(...xs(banded))).toBeCloseTo(0.5 - 14, 0)
    expect(Math.max(...xs(banded))).toBeLessThanOrEqual(200)
  })
})

// ---- DOM ------------------------------------------------------------------------------------

let frames: FrameRequestCallback[] = []
let now = 0
const realRaf = globalThis.requestAnimationFrame
const realCancel = globalThis.cancelAnimationFrame
const flush = (n: number) => {
  for (let i = 0; i < n; i++) {
    const q = frames
    frames = []
    now += 1000 / 60
    for (const cb of q) cb(now)
  }
}

/** A viewport with `n` slides whose card (`bg-card`) is the surface; `offset()` moves them. */
function carousel(n = 3) {
  const vp = document.createElement('div')
  let x = 0
  const slides: HTMLElement[] = []
  for (let i = 0; i < n; i++) {
    const slide = document.createElement('div')
    slide.setAttribute('data-slot', 'carousel-item')
    const card = document.createElement('div')
    card.style.backgroundColor = 'rgb(255, 255, 255)'
    card.style.borderRadius = '12px'
    card.textContent = String(i + 1)
    slide.append(card)
    vp.append(slide)
    slides.push(slide)
    const left = i * 316
    slide.getBoundingClientRect = () => ({ left: left + x, top: 0, right: left + x + 300, bottom: 300, width: 300, height: 300, x: left + x, y: 0, toJSON() {} }) as DOMRect
    Object.defineProperty(card, 'offsetWidth', { value: 300 })
    Object.defineProperty(card, 'offsetHeight', { value: 300 })
  }
  vp.getBoundingClientRect = () => ({ left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON() {} }) as DOMRect
  document.body.append(vp)
  return { vp, slides, move: (dx: number) => (x += dx) }
}

describe('attachCarousel (DOM)', () => {
  let handle: CarouselHandle | null = null
  beforeEach(() => {
    frames = []
    globalThis.requestAnimationFrame = (cb) => (frames.push(cb), frames.length)
    globalThis.cancelAnimationFrame = () => {}
  })
  afterEach(() => {
    handle?.destroy()
    handle = null
    document.body.innerHTML = ''
    globalThis.requestAnimationFrame = realRaf
    globalThis.cancelAnimationFrame = realCancel
  })

  it('finds each slide surface and puts an aria-hidden goo svg in it, hidden at rest', () => {
    const { vp, slides } = carousel()
    expect(findCarouselSurface(slides[0]!)).toBe(slides[0]!.firstElementChild)
    handle = attachCarousel(vp, { reducedMotion: false, seed: 1 })
    expect(handle.slides).toBe(3)
    const svg = slides[0]!.querySelector(`[data-goop="${CAROUSEL_SLOSH_PART}"]`) as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.style.display).toBe('none')
  })

  it('stretches moving slides with `scale` and puts them back when they settle', () => {
    const { vp, slides, move } = carousel()
    handle = attachCarousel(vp, { reducedMotion: false, seed: 1 })
    handle.track()
    for (let i = 0; i < 15; i++) {
      move(-25)
      flush(1)
    }
    const card = slides[0]!.firstElementChild as HTMLElement
    expect(card.style.scale).not.toBe('')
    expect(Number(card.style.scale.split(' ')[0])).toBeGreaterThan(1)
    expect(handle.active).toBe(true)
    flush(400)
    expect(card.style.scale).toBe('')
    expect(handle.active).toBe(false)
    expect(activeTickerCount()).toBe(0)
  })

  it('reaches back as a rubber band while dragged past the start, never past the wall', () => {
    const { vp, slides } = carousel()
    let over = 0
    handle = attachCarousel(vp, { reducedMotion: false, seed: 2, stretch: false, slosh: false, overscroll: () => over })
    over = 40
    handle.track()
    flush(40)
    expect(handle.band).toBeGreaterThan(5)
    expect(handle.band).toBeLessThan(40)
    const svg = slides[0]!.querySelector('svg') as SVGElement
    expect(svg.style.display).toBe('')
    // Still held: it does not stop following.
    flush(60)
    expect(handle.active).toBe(true)
    over = 0
    flush(300)
    expect(handle.band).toBe(0)
    expect(svg.style.display).toBe('none')
  })

  it('does nothing under reduced motion (plain embla)', () => {
    const { vp, slides, move } = carousel()
    handle = attachCarousel(vp, { reducedMotion: true, overscroll: () => 30 })
    handle.track()
    move(-50)
    flush(10)
    expect(handle.active).toBe(false)
    expect((slides[0]!.firstElementChild as HTMLElement).style.scale).toBe('')
  })

  it('destroy removes the svg and restores the surface', () => {
    const { vp, slides } = carousel()
    handle = attachCarousel(vp, { reducedMotion: false })
    handle.destroy()
    handle = null
    expect(slides[0]!.querySelector('svg')).toBeNull()
    expect((slides[0]!.firstElementChild as HTMLElement).style.isolation).toBe('')
  })
})

describe('carousel dots', () => {
  afterEach(() => (document.body.innerHTML = ''))
  it('finds the active dot and attaches the blob behind the dots', () => {
    const list = document.createElement('div')
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('button')
      b.setAttribute('data-goop-carousel-dot', '')
      b.setAttribute('data-state', i === 1 ? 'active' : 'inactive')
      list.append(b)
    }
    document.body.append(list)
    expect(findActiveCarouselDot(list)).toBe(list.children[1])
    const h = attachCarouselDots(list, { reducedMotion: true })
    expect(list.querySelector('[data-goop="highlight"]')?.getAttribute('aria-hidden')).toBe('true')
    h.destroy()
  })
})
