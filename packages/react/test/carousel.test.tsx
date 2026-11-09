// Client tests for GoopCarousel: shadcn/ui's Carousel markup on embla-carousel-react, with the
// same slide goo (core attachCarousel), squishy Previous / Next and the dots blob as
// @goopui/vue's GoopCarousel.
import { CAROUSEL_DOTS_FEEL, CAROUSEL_EFFECTS, type CarouselHandle } from '@goopui/core'
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CAROUSEL_PROP_KEYS,
  GoopCarousel,
  GoopCarouselContent,
  GoopCarouselDots,
  GoopCarouselItem,
  GoopCarouselNext,
  GoopCarouselPrevious,
  goopComponents,
  toCarouselOptions,
  useCarousel,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

/** shadcn's docs example: card slides, Previous / Next, plus the dots. */
const Demo = (root: Record<string, unknown> = {}) =>
  h(
    GoopCarousel,
    root,
    h(
      GoopCarouselContent,
      null,
      [1, 2, 3].map((i) => h(GoopCarouselItem, { key: i }, h('div', { className: 'p-1' }, h('div', { style: { backgroundColor: 'rgb(255, 255, 255)' } }, String(i))))),
    ),
    h(GoopCarouselPrevious),
    h(GoopCarouselNext),
    h(GoopCarouselDots),
  )

const mount = async (root: Record<string, unknown> = {}) => {
  const r = render(Demo(root))
  await act(async () => {})
  return r
}

describe('GoopCarousel props', () => {
  it('every core effect is a prop, plus goo / speed / preset / renderer', () => {
    for (const e of CAROUSEL_EFFECTS) expect(CAROUSEL_PROP_KEYS).toContain(e)
    expect(CAROUSEL_PROP_KEYS).toEqual(expect.arrayContaining(['goo', 'speed', 'preset', 'renderer']))
  })

  it('defaults turn everything on; each toggle turns its effect off; goo: false is plain shadcn', () => {
    const o = toCarouselOptions({})
    expect(o.slides).toMatchObject({ stretch: true, slosh: true, rubberBand: true, speed: 1 })
    expect(o.dots).toMatchObject({ feel: CAROUSEL_DOTS_FEEL, wobble: true, momentum: true })
    expect(o.button.goo).toBeUndefined()
    expect(toCarouselOptions({ stretch: false, slosh: false, rubberBand: 0 }).slides).toBeNull()
    expect(toCarouselOptions({ dots: false }).dots).toBeNull()
    expect(toCarouselOptions({ squish: false }).button.goo).toBe(false)
    const off = toCarouselOptions({ goo: false })
    expect(off.slides).toBeNull()
    expect(off.dots).toBeNull()
    expect(off.button.goo).toBe(false)
    const cfg = toCarouselOptions({ preset: 'wild', speed: 2 }, { renderer: 'canvas', reducedMotion: true })
    expect(cfg.slides).toMatchObject({ preset: 'wild', speed: 2, reducedMotion: true })
    expect(cfg.dots).toMatchObject({ preset: 'wild', renderer: 'canvas' })
    expect(cfg.button).toMatchObject({ preset: 'wild', timeScale: 2 })
  })

  it('is in the manifest', () => {
    for (const n of ['GoopCarousel', 'GoopCarouselContent', 'GoopCarouselItem', 'GoopCarouselPrevious', 'GoopCarouselNext', 'GoopCarouselDots'])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopCarousel (mounted)', () => {
  it("renders shadcn's markup, labels the slides and hands out the embla api", async () => {
    const setApi = vi.fn()
    await mount({ setApi, className: 'w-64', speed: 2 })
    const root = document.querySelector<HTMLElement>('[data-slot="carousel"]')!
    expect(root.getAttribute('role')).toBe('region')
    expect(root.getAttribute('aria-roledescription')).toBe('carousel')
    expect(root.className).toContain('relative')
    expect(root.className).toContain('w-64')
    expect(root.hasAttribute('speed')).toBe(false)
    expect(document.querySelector('[data-slot="carousel-content"]')!.className).toBe('overflow-hidden')
    const items = document.querySelectorAll('[data-slot="carousel-item"]')
    expect(items).toHaveLength(3)
    expect(items[0]!.getAttribute('aria-roledescription')).toBe('slide')
    expect(items[0]!.getAttribute('aria-label')).toBe('1 of 3')
    expect(items[0]!.className).toContain('basis-full')
    expect(document.querySelector('[data-slot="carousel-next"] .sr-only')!.textContent).toBe('Next slide')
    expect(setApi).toHaveBeenCalled()
    expect(typeof setApi.mock.calls[0]![0].scrollNext).toBe('function')
  })

  it('puts the aria-hidden goo into each slide surface; Previous / Next are squishy GoopButtons', async () => {
    const goopRef = createRef<CarouselHandle>()
    await mount({ goopRef })
    const slosh = document.querySelectorAll('[data-goop="carousel-slosh"]')
    expect(slosh.length).toBe(3)
    expect(slosh[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(goopRef.current).not.toBeNull()
    const next = document.querySelector<HTMLElement>('[data-slot="carousel-next"]')!
    expect(next.getAttribute('data-goop-host')).toBe('stroke')
    expect(next.className).toContain('rounded-full')
    expect(document.querySelector('[data-slot="carousel-dots"]')!.hasAttribute('data-goop-carousel-dots')).toBe(true)
  })

  it("goo={false} leaves shadcn alone (no slide goo, plain buttons, flat dots)", async () => {
    await mount({ goo: false })
    expect(document.querySelectorAll('[data-goop="carousel-slosh"]').length).toBe(0)
    expect(document.querySelector('[data-slot="carousel-next"]')!.hasAttribute('data-goop-host')).toBe(false)
    expect(document.querySelector('[data-slot="carousel-dots"]')!.hasAttribute('data-goop-carousel-dots')).toBe(false)
  })

  it('squish={false} keeps the slide goo but plain buttons; the goo detaches on unmount', async () => {
    const r = await mount({ squish: false })
    expect(document.querySelectorAll('[data-goop="carousel-slosh"]').length).toBe(3)
    expect(document.querySelector('[data-slot="carousel-previous"]')!.hasAttribute('data-goop-host')).toBe(false)
    r.unmount()
    expect(document.querySelector('[data-goop="carousel-slosh"]')).toBeNull()
  })

  it('arrow keys scroll; reduced motion jumps (embla scroll with jump=true)', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    let api: { scrollNext: (jump?: boolean) => void } | undefined
    await mount({ setApi: (a: typeof api) => (api = a) })
    const spy = vi.spyOn(api!, 'scrollNext')
    const root = document.querySelector<HTMLElement>('[data-slot="carousel"]')!
    await act(async () => {
      root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(spy).toHaveBeenCalledWith(true)
  })

  it('useCarousel throws outside a carousel', () => {
    const Bad = () => (useCarousel(), null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(h(Bad))).toThrow(/within a <GoopCarousel/)
  })
})
