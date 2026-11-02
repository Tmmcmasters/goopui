import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  GOOP_CONFIG_KEY,
  GoopAvatar,
  GoopAvatarFallback,
  GoopAvatarImage,
  GoopBadge,
  GoopCard,
  GoopCardAction,
  GoopCardContent,
  GoopCardDescription,
  GoopCardFooter,
  GoopCardHeader,
  GoopCardTitle,
  GoopLabel,
  GoopSeparator,
  GoopSkeleton,
  goopAvatarProps,
  goopBadgeProps,
  goopCardProps,
  goopComponents,
  goopSkeletonProps,
  toBadgeOptions,
  toCardOptions,
  toSkeletonOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('static set', () => {
  it('is in the manifest', () => {
    for (const n of [
      'GoopSkeleton',
      'GoopBadge',
      'GoopCard',
      'GoopCardAction',
      'GoopCardContent',
      'GoopCardDescription',
      'GoopCardFooter',
      'GoopCardHeader',
      'GoopCardTitle',
      'GoopAvatar',
      'GoopAvatarFallback',
      'GoopAvatarImage',
      'GoopSeparator',
      'GoopLabel',
    ])
      expect(goopComponents).toContain(n)
  })

  it('every effect is a prop', () => {
    expect(goopSkeletonProps).toHaveProperty('shimmer')
    expect(goopBadgeProps).toHaveProperty('swell')
    expect(goopAvatarProps).toHaveProperty('settle')
    for (const k of ['goo', 'swell', 'speed', 'preset']) expect(goopCardProps).toHaveProperty(k)
    expect(toSkeletonOptions({ shimmer: false }, { preset: 'wild' })).toMatchObject({ shimmer: false, preset: 'wild' })
    expect(toBadgeOptions({ swell: 2, speed: 0.5 })).toMatchObject({ swell: 2, speed: 0.5 })
    expect(toCardOptions({})).toBeNull()
    expect(toCardOptions({ goo: true, swell: 0.5 })).toMatchObject({ swell: 0.5 })
  })
})

describe('GoopSkeleton', () => {
  it('shimmers instead of pulsing, with the preset vars', () => {
    const w = mount(GoopSkeleton, { props: { class: 'h-4 w-40' } })
    const el = w.element as HTMLElement
    expect(el.dataset.slot).toBe('skeleton')
    expect(el.hasAttribute('data-goop-shimmer')).toBe(true)
    expect(el.className).toContain('bg-accent')
    expect(el.className).toContain('h-4 w-40')
    expect(el.className).not.toContain('animate-pulse')
    expect(el.style.getPropertyValue('--goop-shimmer-period')).toBe('2.4s')
  })

  it('shimmer off is shadcn\'s pulse', () => {
    const el = mount(GoopSkeleton, { props: { shimmer: false } }).element as HTMLElement
    expect(el.hasAttribute('data-goop-shimmer')).toBe(false)
    expect(el.className).toContain('animate-pulse')
    expect(el.getAttribute('style') ?? '').not.toContain('--goop')
  })

  it('reducedMotion: true from app config marks it still', () => {
    const el = mount(GoopSkeleton, { global: { provide: { [GOOP_CONFIG_KEY as symbol]: { reducedMotion: true } } } }).element as HTMLElement
    expect(el.hasAttribute('data-goop-still')).toBe(true)
  })
})

describe('GoopBadge', () => {
  it('renders every shadcn variant with class passthrough', () => {
    for (const variant of ['default', 'secondary', 'destructive', 'outline'] as const) {
      const el = mount(GoopBadge, { props: { variant, class: 'extra' }, slots: { default: () => variant } }).element as HTMLElement
      expect(el.tagName).toBe('SPAN')
      expect(el.dataset.slot).toBe('badge')
      expect(el.className).toContain('extra')
      expect(el.textContent).toBe(variant)
    }
    const d = mount(GoopBadge, { props: { variant: 'destructive' } }).element as HTMLElement
    expect(d.className).toContain('bg-destructive')
    expect(d.className).toContain('--goop-badge-fill')
  })

  it('swells only as a link or button (asChild)', () => {
    const w = mount(GoopBadge, { props: { asChild: true }, slots: { default: () => h('a', { href: '#x' }, 'Link') } })
    const a = w.element as HTMLElement
    expect(a.tagName).toBe('A')
    expect(a.hasAttribute('data-goop-swell')).toBe(true)
    expect(a.className).toContain('[&:is(a,button)]:hover:shadow')
    expect(a.style.getPropertyValue('--goop-badge-swell-size')).toBe('1px')
  })

  it('swell off is a plain shadcn badge', () => {
    const el = mount(GoopBadge, { props: { swell: false } }).element as HTMLElement
    expect(el.hasAttribute('data-goop-swell')).toBe(false)
    expect(el.className).not.toContain('hover:shadow')
    expect(el.className).not.toContain('--goop-badge-fill')
  })
})

describe('GoopCard', () => {
  const parts = () =>
    h(GoopCard, { class: 'w-80', goo: true }, () => [
      h(GoopCardHeader, null, () => [h(GoopCardTitle, null, () => 'Title'), h(GoopCardDescription, null, () => 'Desc'), h(GoopCardAction, null, () => 'Act')]),
      h(GoopCardContent, { class: 'c' }, () => 'Body'),
      h(GoopCardFooter, null, () => 'Foot'),
    ])

  it('renders shadcn markup and slots', () => {
    const w = mount({ render: parts }, { attachTo: document.body })
    const el = w.element as HTMLElement
    expect(el.dataset.slot).toBe('card')
    expect(el.className).toContain('rounded-xl')
    expect(el.className).toContain('w-80')
    for (const s of ['card-header', 'card-title', 'card-description', 'card-action', 'card-content', 'card-footer'])
      expect(el.querySelector(`[data-slot="${s}"]`)).toBeTruthy()
    expect(el.querySelector('[data-slot="card-title"]')!.tagName).toBe('H3')
    expect(el.querySelector('[data-slot="card-content"]')!.className).toContain('px-6 c')
    w.unmount()
  })

  it('is static by default: no goo layer', () => {
    const w = mount(GoopCard, { attachTo: document.body, slots: { default: () => 'x' } })
    expect(w.element.querySelector('[data-goop="card"]')).toBeNull()
    expect(w.element.className).not.toContain('isolate')
    w.unmount()
  })

  it('goo adds one aria-hidden svg behind the content, removed when turned off', async () => {
    const w = mount(GoopCard, { props: { goo: true }, attachTo: document.body, slots: { default: () => 'x' } })
    const svg = w.element.querySelector('[data-goop="card"]')!
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(w.element.className).toContain('isolate')
    expect(w.element.textContent).toBe('x')
    await w.setProps({ goo: false })
    await nextTick()
    expect(w.element.querySelector('[data-goop="card"]')).toBeNull()
    w.unmount()
  })

  it('reduced motion: hovering never shows the swell', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(GoopCard, { props: { goo: true }, attachTo: document.body, slots: { default: () => 'x' } })
    w.element.dispatchEvent(new PointerEvent('pointerenter', { clientX: 10, clientY: 1, pointerType: 'mouse' }))
    expect((w.element.querySelector('[data-goop="card"]') as SVGElement).style.display).toBe('none')
    w.unmount()
  })
})

describe('GoopAvatar', () => {
  it('renders the fallback with the settle on, class passthrough', async () => {
    const w = mount(GoopAvatar, {
      props: { class: 'size-12' },
      slots: { default: () => [h(GoopAvatarImage, { src: '' }), h(GoopAvatarFallback, { class: 'fb' }, () => 'TM')] },
      attachTo: document.body,
    })
    await nextTick()
    const el = w.element as HTMLElement
    expect(el.dataset.slot).toBe('avatar')
    expect(el.hasAttribute('data-goop-settle')).toBe(true)
    expect(el.className).toContain('size-12')
    expect(el.className).toContain('overflow-visible')
    expect(el.style.getPropertyValue('--goop-settle-over')).toBe('1.06')
    const fb = el.querySelector('[data-slot="avatar-fallback"]')!
    expect(fb.textContent).toBe('TM')
    expect(fb.className).toContain('fb')
    w.unmount()
  })

  it('settle off is shadcn\'s avatar', () => {
    const el = mount(GoopAvatar, { props: { settle: false } }).element as HTMLElement
    expect(el.hasAttribute('data-goop-settle')).toBe(false)
    expect(el.className).toContain('overflow-hidden')
    expect(el.getAttribute('style') ?? '').not.toContain('--goop')
  })
})

describe('GoopSeparator / GoopLabel', () => {
  it('separator is reka\'s, horizontal and decorative by default', () => {
    const el = mount(GoopSeparator, { props: { class: 'my-4' } }).element as HTMLElement
    expect(el.dataset.slot).toBe('separator')
    expect(el.dataset.orientation).toBe('horizontal')
    expect(el.getAttribute('role')).toBe('none')
    expect(el.className).toContain('my-4')
    const v = mount(GoopSeparator, { props: { orientation: 'vertical', decorative: false } }).element as HTMLElement
    expect(v.dataset.orientation).toBe('vertical')
    expect(v.getAttribute('role')).toBe('separator')
  })

  it('label is reka\'s label', () => {
    const el = mount(GoopLabel, { props: { for: 'email', class: 'x' }, slots: { default: () => 'Email' } }).element as HTMLElement
    expect(el.tagName).toBe('LABEL')
    expect(el.getAttribute('for')).toBe('email')
    expect(el.dataset.slot).toBe('label')
    expect(el.className).toContain('x')
  })
})
