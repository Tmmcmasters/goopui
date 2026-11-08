import { CAROUSEL_DOTS_FEEL, CAROUSEL_EFFECTS } from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, type PropType } from 'vue'
import { renderToString } from 'vue/server-renderer'
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

/** shadcn's docs example: five card slides, Previous / Next, plus the dots. */
const Demo = defineComponent({
  props: { root: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) } },
  setup(props) {
    return () =>
      h(GoopCarousel, props.root, () => [
        h(GoopCarouselContent, null, () =>
          [1, 2, 3].map((i) => h(GoopCarouselItem, { key: i }, () => h('div', { class: 'p-1' }, h('div', { style: 'background-color: rgb(255, 255, 255)' }, String(i))))),
        ),
        h(GoopCarouselPrevious),
        h(GoopCarouselNext),
        h(GoopCarouselDots),
      ])
  },
})

describe('GoopCarousel props', () => {
  it('every core effect is a prop, plus goo / speed / preset / renderer', () => {
    for (const e of CAROUSEL_EFFECTS) expect(CAROUSEL_PROP_KEYS).toContain(e)
    expect(CAROUSEL_PROP_KEYS).toEqual(expect.arrayContaining(['goo', 'speed', 'preset', 'renderer']))
  })

  it('defaults turn everything on', () => {
    const o = toCarouselOptions({})
    expect(o.slides).toMatchObject({ stretch: true, slosh: true, rubberBand: true, speed: 1 })
    expect(o.dots).toMatchObject({ feel: CAROUSEL_DOTS_FEEL, wobble: true, momentum: true })
    expect(o.button.goo).toBeUndefined()
  })

  it('each toggle turns its effect off; goo: false is plain shadcn', () => {
    expect(toCarouselOptions({ stretch: false }).slides).toMatchObject({ stretch: false, slosh: true })
    expect(toCarouselOptions({ stretch: false, slosh: false, rubberBand: 0 }).slides).toBeNull()
    expect(toCarouselOptions({ dots: false }).dots).toBeNull()
    expect(toCarouselOptions({ squish: false }).button.goo).toBe(false)
    const off = toCarouselOptions({ goo: false })
    expect(off.slides).toBeNull()
    expect(off.dots).toBeNull()
    expect(off.button.goo).toBe(false)
  })

  it('preset / speed / renderer reach every part; app config fills gaps', () => {
    const o = toCarouselOptions({ preset: 'wild', speed: 2 }, { renderer: 'canvas', reducedMotion: true })
    expect(o.slides).toMatchObject({ preset: 'wild', speed: 2, reducedMotion: true })
    expect(o.dots).toMatchObject({ preset: 'wild', renderer: 'canvas' })
    expect(o.button).toMatchObject({ preset: 'wild', timeScale: 2 })
    expect(o.reducedMotion).toBe(true)
  })

  it('is in the manifest', () => {
    for (const n of ['GoopCarousel', 'GoopCarouselContent', 'GoopCarouselItem', 'GoopCarouselPrevious', 'GoopCarouselNext', 'GoopCarouselDots'])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopCarousel (mounted)', () => {
  afterEach(() => (document.body.innerHTML = ''))

  it("renders shadcn's markup and hands out the embla api", async () => {
    const setApi = vi.fn()
    const w = mount(Demo, { props: { root: { setApi } }, attachTo: document.body })
    await flushPromises()
    const root = w.find('[data-slot="carousel"]')
    expect(root.attributes('role')).toBe('region')
    expect(root.attributes('aria-roledescription')).toBe('carousel')
    expect(w.find('[data-slot="carousel-content"]').classes()).toContain('overflow-hidden')
    const items = w.findAll('[data-slot="carousel-item"]')
    expect(items).toHaveLength(3)
    expect(items[0]!.attributes('aria-roledescription')).toBe('slide')
    expect(items[0]!.attributes('aria-label')).toBe('1 of 3')
    expect(w.find('[data-slot="carousel-previous"]').exists()).toBe(true)
    expect(w.find('[data-slot="carousel-next"] .sr-only').text()).toBe('Next slide')
    expect(setApi).toHaveBeenCalledTimes(1)
    expect(typeof setApi.mock.calls[0]![0].scrollNext).toBe('function')
    w.unmount()
  })

  it('puts the aria-hidden goo into each slide surface; goo: false leaves shadcn alone', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    expect(w.findAll('[data-goop="carousel-slosh"]').length).toBe(3)
    expect(w.find('[data-goop="carousel-slosh"]').attributes('aria-hidden')).toBe('true')
    w.unmount()
    const plain = mount(Demo, { props: { root: { goo: false } }, attachTo: document.body })
    await flushPromises()
    expect(plain.findAll('[data-goop="carousel-slosh"]').length).toBe(0)
    expect(plain.find('[data-slot="carousel-dots"]').attributes('data-goop-carousel-dots')).toBeUndefined()
    plain.unmount()
  })

  it('useCarousel throws outside a carousel', () => {
    const Bad = defineComponent({ setup: () => (useCarousel(), () => null) })
    expect(() => mount(Bad)).toThrow(/within a <GoopCarousel/)
  })
})

describe('GoopCarousel SSR', () => {
  it("renders shadcn's markup on the server, with no goo", async () => {
    const html = await renderToString(createSSRApp(Demo))
    expect(html).toContain('data-slot="carousel"')
    expect(html).toContain('aria-roledescription="carousel"')
    expect(html).toContain('data-slot="carousel-item"')
    expect(html).not.toContain('carousel-slosh')
  })
})
