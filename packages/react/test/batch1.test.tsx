// Client tests for React batch 1: Skeleton (+ Reveal), Badge, Card, Avatar, Separator, Label,
// Spinner. Each renders shadcn/ui's markup, keeps engine props off the DOM, and attaches the
// same core engine as @goopui/vue.
import type { CardHandle, SkeletonRevealHandle, SpinnerHandle } from '@goopui/core'
import { act, render, screen } from '@testing-library/react'
import { createElement as h, createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GoopAvatar,
  GoopAvatarBadge,
  GoopAvatarFallback,
  GoopAvatarGroup,
  GoopAvatarGroupCount,
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
  GoopProvider,
  GoopSeparator,
  GoopSkeleton,
  GoopSkeletonReveal,
  GoopSpinner,
  goopComponents,
} from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const noEngineAttrs = (el: Element, re: RegExp) => expect(el.getAttributeNames().some((n) => re.test(n))).toBe(false)

describe('GoopSkeleton', () => {
  it("is shadcn's skeleton with the goo shimmer instead of the pulse", () => {
    const ref = createRef<HTMLDivElement>()
    render(h(GoopSkeleton, { ref, className: 'h-4 w-20', speed: 2, 'aria-label': 'x' } as never))
    const el = ref.current!
    expect(el.dataset.slot).toBe('skeleton')
    expect(el.hasAttribute('data-goop-shimmer')).toBe(true)
    expect(el.className).toContain('bg-muted')
    expect(el.className).toContain('h-4')
    expect(el.className).not.toContain('animate-pulse')
    expect(el.style.getPropertyValue('--goop-shimmer-period')).not.toBe('')
    noEngineAttrs(el, /^(speed|shimmer)$/)
  })

  it("shimmer={false} is shadcn's pulse; reduced motion (app config) keeps it still", () => {
    render(h('div', null, h(GoopSkeleton, { shimmer: false, 'data-testid': 'off' } as never), h(GoopProvider, { reducedMotion: true }, h(GoopSkeleton, { 'data-testid': 'rm' } as never))))
    const off = screen.getByTestId('off')
    expect(off.className).toContain('animate-pulse')
    expect(off.hasAttribute('data-goop-shimmer')).toBe(false)
    expect(screen.getByTestId('rm').hasAttribute('data-goop-still')).toBe(true)
  })
})

describe('GoopSkeletonReveal', () => {
  const skeleton = h('div', { className: 'flex h-5 items-center' }, h(GoopSkeleton, { className: 'h-4 w-24' }))
  const content = h('p', { className: 'text-sm leading-5' }, 'Ada Lovelace')
  const view = (loading: boolean, extra: Record<string, unknown> = {}) => h(GoopSkeletonReveal, { loading, skeleton, className: 'grid gap-4', ...extra }, content)

  it('pools the skeleton, then measures it before the swap and melts into the content', async () => {
    const api = createRef<SkeletonRevealHandle>()
    const onRevealed = vi.fn()
    const r = render(view(true, { goopRef: api, onRevealed }))
    const root = document.querySelector('[data-slot="skeleton-reveal"]') as HTMLElement
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(root.className).toContain('grid')
    expect(root.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(screen.queryByText('Ada Lovelace')).toBeNull()
    const handle = api.current!
    expect(handle).not.toBeNull()

    const seen: string[] = []
    vi.spyOn(handle, 'capture').mockImplementation(() => void seen.push(`capture:${!!root.querySelector('[data-slot="skeleton"]')}`))
    vi.spyOn(handle, 'reveal').mockImplementation(async (el: Element) => void seen.push(`reveal:${el.textContent}`))
    await act(async () => r.rerender(view(false, { goopRef: api, onRevealed })))
    expect(seen).toEqual(['capture:true', 'reveal:Ada Lovelace'])
    expect(root.hasAttribute('aria-busy')).toBe(false)
    expect(root.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(onRevealed).toHaveBeenCalledOnce()

    // Loading again pools the new skeleton.
    const pool = vi.spyOn(handle, 'pool')
    await act(async () => r.rerender(view(true, { goopRef: api, onRevealed })))
    expect(pool).toHaveBeenCalledWith(root.querySelector('[data-slot="skeleton-reveal-skeleton"]'))
    r.unmount()
    expect(document.querySelector('[data-goop]')).toBeNull()
  })

  it('reduced motion: the real engine cross-fades and still reports revealed', async () => {
    const onRevealed = vi.fn()
    const r = render(h(GoopProvider, { reducedMotion: true }, view(true, { onRevealed })))
    await act(async () => r.rerender(h(GoopProvider, { reducedMotion: true }, view(false, { onRevealed }))))
    await act(async () => new Promise((res) => setTimeout(res, 600)))
    expect(screen.getByText('Ada Lovelace')).toBeTruthy()
    expect(onRevealed).toHaveBeenCalledOnce()
  })
})

describe('GoopBadge', () => {
  it("is shadcn's badge; a link badge (asChild) gets the swell on the link", () => {
    render(
      h(
        'div',
        null,
        h(GoopBadge, { variant: 'secondary' }, 'Plain'),
        h(GoopBadge, { asChild: true, swell: 2 }, h('a', { href: '/x' }, 'Link')),
        h(GoopBadge, { swell: false, variant: 'outline' }, 'Off'),
      ),
    )
    const plain = screen.getByText('Plain')
    expect(plain.tagName).toBe('SPAN')
    expect(plain.dataset.slot).toBe('badge')
    expect(plain.dataset.variant).toBe('secondary')
    expect(plain.className).toContain('rounded-4xl')
    const link = screen.getByRole('link')
    expect(link.dataset.slot).toBe('badge')
    expect(link.hasAttribute('data-goop-swell')).toBe(true)
    expect(link.className).toContain('[--goop-badge-fill:')
    expect(link.style.getPropertyValue('--goop-badge-swell-size')).not.toBe('')
    noEngineAttrs(link, /^swell$/)
    const off = screen.getByText('Off')
    expect(off.hasAttribute('data-goop-swell')).toBe(false)
    expect(off.className).not.toContain('--goop-badge-fill')
  })
})

describe('GoopCard', () => {
  const card = (props: Record<string, unknown> = {}) =>
    h(
      GoopCard,
      props,
      h(GoopCardHeader, null, h(GoopCardTitle, null, 'Title'), h(GoopCardDescription, null, 'Desc'), h(GoopCardAction, null, 'A')),
      h(GoopCardContent, null, 'Body'),
      h(GoopCardFooter, null, 'Foot'),
    )

  it("is shadcn's card, static by default", () => {
    const { container } = render(card({ className: 'max-w-sm', size: 'sm' }))
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.slot).toBe('card')
    expect(root.dataset.size).toBe('sm')
    expect(root.className).toContain('ring-foreground/10')
    expect(root.className).toContain('max-w-sm')
    expect(root.hasAttribute('data-goop-host')).toBe(false)
    expect(root.querySelector('[data-goop="card"]')).toBeNull()
    for (const s of ['card-header', 'card-title', 'card-description', 'card-action', 'card-content', 'card-footer'])
      expect(root.querySelector(`[data-slot="${s}"]`)).not.toBeNull()
  })

  it('goo attaches the edge layer after mount and detaches when turned off', () => {
    const api = createRef<CardHandle>()
    const r = render(card({ goo: true, swell: 2, goopRef: api }))
    const root = document.querySelector('[data-slot="card"]') as HTMLElement
    expect(root.dataset.goopHost).toBe('card')
    expect(root.className).toContain('overflow-visible')
    const svg = root.querySelector(':scope > svg[data-goop="card"]')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(api.current).not.toBeNull()
    noEngineAttrs(root, /^(goo|swell)$/)
    r.rerender(card({ goo: false }))
    expect(root.querySelector('[data-goop="card"]')).toBeNull()
  })

  it('is in the manifest with every part', () => {
    for (const n of ['GoopCard', 'GoopCardHeader', 'GoopCardTitle', 'GoopCardDescription', 'GoopCardAction', 'GoopCardContent', 'GoopCardFooter'])
      expect(goopComponents).toContain(n)
  })
})

describe('GoopAvatar', () => {
  it("is shadcn's avatar with the settle on; the fallback shows until the image loads", () => {
    render(
      h(
        GoopAvatarGroup,
        null,
        h(GoopAvatar, { size: 'lg', 'data-testid': 'a' } as never, h(GoopAvatarImage, { src: 'data:,', alt: 'Ada' }), h(GoopAvatarFallback, null, 'AL'), h(GoopAvatarBadge)),
        h(GoopAvatar, { settle: false, 'data-testid': 'b' } as never, h(GoopAvatarFallback, null, 'GH')),
        h(GoopAvatarGroupCount, null, '+3'),
      ),
    )
    const a = screen.getByTestId('a')
    expect(a.dataset.slot).toBe('avatar')
    expect(a.dataset.size).toBe('lg')
    expect(a.hasAttribute('data-goop-settle')).toBe(true)
    expect(a.style.getPropertyValue('--goop-settle-duration')).not.toBe('')
    expect(screen.getByText('AL').dataset.slot).toBe('avatar-fallback')
    expect(a.querySelector('[data-slot="avatar-badge"]')).not.toBeNull()
    expect(screen.getByTestId('b').hasAttribute('data-goop-settle')).toBe(false)
    expect(screen.getByText('+3').dataset.slot).toBe('avatar-group-count')
    expect(a.parentElement!.dataset.slot).toBe('avatar-group')
  })
})

describe('GoopSeparator and GoopLabel', () => {
  it("are shadcn's (Radix) with no goo", () => {
    render(
      h(
        'div',
        null,
        h(GoopSeparator, { 'data-testid': 'h' } as never),
        h(GoopSeparator, { orientation: 'vertical', decorative: false }),
        h(GoopLabel, { htmlFor: 'email' }, 'Email'),
        h('input', { id: 'email' }),
      ),
    )
    const sep = screen.getByTestId('h')
    expect(sep.dataset.slot).toBe('separator')
    expect(sep.dataset.orientation).toBe('horizontal')
    expect(sep.getAttribute('role')).toBe('none')
    expect(sep.className).toContain('data-[orientation=horizontal]:h-px')
    const v = screen.getByRole('separator')
    expect(v.getAttribute('aria-orientation')).toBe('vertical')
    const label = screen.getByText('Email')
    expect(label.tagName).toBe('LABEL')
    expect(label.dataset.slot).toBe('label')
    expect(screen.getByLabelText('Email').id).toBe('email')
  })
})

describe('GoopSpinner', () => {
  it('swaps its static goo pose for the live engine after mount, and cleans up', () => {
    const api = createRef<SpinnerHandle>()
    const r = render(h(GoopSpinner, { className: 'size-10', variant: 'comet', blobs: 5, goopRef: api }))
    const el = screen.getByRole('status')
    expect(el.getAttribute('aria-label')).toBe('Loading')
    expect(el.dataset.slot).toBe('spinner')
    expect(el.dataset.variant).toBe('comet')
    expect(el.className).toContain('size-10')
    expect(el.hasAttribute('data-goop-active')).toBe(true)
    expect(el.querySelector(':scope > svg filter')).toBeNull()
    expect(el.querySelector('[data-goop="layer"]')).not.toBeNull()
    expect(api.current).not.toBeNull()
    noEngineAttrs(el, /^(blobs|variant)$/)
    r.unmount()
    expect(document.querySelector('[data-goop="layer"]')).toBeNull()
  })

  it('interactive={false} lets pointer events through', () => {
    render(h(GoopSpinner, { interactive: false }))
    expect(screen.getByRole('status').className).toContain('pointer-events-none')
  })

  it('every batch-1 component is in the manifest', () => {
    for (const n of ['GoopSkeleton', 'GoopSkeletonReveal', 'GoopBadge', 'GoopAvatar', 'GoopAvatarImage', 'GoopAvatarFallback', 'GoopSeparator', 'GoopLabel', 'GoopSpinner'])
      expect(goopComponents).toContain(n)
  })
})
