// Client tests for GoopPageTransition: core's createPageTransition behind a router-free API
// (link clicks held until covered, the reveal on `routeKey` / URL change), so it runs in a
// Next.js App Router app as in any React app.
import { PAGE_TRANSITION_ATTR } from '@goopui/core'
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h, createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GoopPageTransition, goopComponents, toPageTransitionOptions, useGoopPageTransition, type GoopPageTransitionApi } from '../src'

;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const overlay = () => document.querySelector(`svg[${PAGE_TRANSITION_ATTR}]`)
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
})

/** A tiny client router: a Next-style <Link> (preventDefault + push) and the page per path. */
function App({ spy, transition = {} }: { spy: (path: string) => void; transition?: Record<string, unknown> }) {
  const [path, setPath] = useState('/')
  const link = (to: string, extra: Record<string, unknown> = {}) =>
    h(
      'a',
      {
        href: to,
        onClick: (e: MouseEvent & { preventDefault(): void }) => {
          e.preventDefault()
          spy(to)
          history.pushState(null, '', to)
          setPath(to)
        },
        ...extra,
      },
      `to ${to}`,
    )
  return h(GoopPageTransition, { routeKey: path, accent: false, ...transition }, h('main', null, h('h1', null, `Page ${path}`), link('/docs'), link('/', { id: 'same' })))
}

describe('GoopPageTransition', () => {
  it('maps props and app config onto core options; is in the manifest', () => {
    expect(toPageTransitionOptions({ direction: 'up', bulge: false, duration: 500 }, { preset: 'wild', reducedMotion: true })).toEqual({
      enabled: true,
      preset: 'wild',
      reducedMotion: true,
      direction: 'up',
      bulge: false,
      duration: 500,
    })
    expect(toPageTransitionOptions({ goo: false }).enabled).toBe(false)
    expect(goopComponents).toContain('GoopPageTransition')
  })

  it('renders only its children, covers and reveals through goopRef, and cleans up', async () => {
    vi.useFakeTimers()
    const api = createRef<GoopPageTransitionApi>()
    const r = render(h(GoopPageTransition, { goopRef: api, accent: false, split: false }, h('p', null, 'Hello')))
    expect(document.body.textContent).toBe('Hello')
    expect(overlay()).toBeNull()
    expect(api.current!.handle).not.toBeNull()
    const covered = api.current!.cover()
    expect(overlay()?.getAttribute('aria-hidden')).toBe('true')
    await tick(800)
    await covered
    const revealed = api.current!.reveal()
    await tick(2000)
    await revealed
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
    r.unmount()
    expect(overlay()).toBeNull()
  })

  it('holds an in-app link click until the page is covered, then lets it through; reveals on routeKey', async () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    render(h(App, { spy, transition: { split: false } }))
    const docs = document.querySelector<HTMLAnchorElement>('a[href="/docs"]')!
    await act(async () => docs.click())
    // Held: the router's handler hasn't run yet; the goo is pouring in.
    expect(spy).not.toHaveBeenCalled()
    expect(overlay()).not.toBeNull()
    await tick(800)
    expect(spy).toHaveBeenCalledWith('/docs')
    expect(document.querySelector('h1')!.textContent).toBe('Page /docs')
    await tick(2500)
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
  })

  it('split (default): the old page is held as a clone, the click goes through, the band sweeps it off', async () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    render(h(App, { spy }))
    await act(async () => document.querySelector<HTMLAnchorElement>('a[href="/docs"]')!.click())
    expect(spy).toHaveBeenCalledWith('/docs')
    expect(document.querySelector('[data-goop-page-transition-old]')?.textContent).toContain('Page /')
    expect(document.querySelector('main h1')!.textContent).toBe('Page /docs')
    await tick(3000)
    expect(document.querySelector('[data-goop-page-transition-old]')).toBeNull()
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
  })

  it('skips same-path links, modified clicks, other targets and links={false}', async () => {
    const spy = vi.fn()
    const r = render(h(App, { spy }))
    await act(async () => document.getElementById('same')!.click())
    expect(spy).toHaveBeenCalledWith('/')
    const docs = document.querySelector<HTMLAnchorElement>('a[href="/docs"]')!
    await act(async () => {
      docs.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
    })
    expect(spy).toHaveBeenLastCalledWith('/docs')
    expect(overlay()).toBeNull()
    r.unmount()
    spy.mockClear()
    history.replaceState(null, '', '/')
    render(h(App, { spy, transition: { links: false } }))
    await act(async () => document.querySelector<HTMLAnchorElement>('a[href="/docs"]')!.click())
    expect(spy).toHaveBeenCalledWith('/docs')
    expect(overlay()).toBeNull()
  })

  it('goo={false}: no overlay, links pass straight through', async () => {
    const spy = vi.fn()
    render(h(App, { spy, transition: { goo: false } }))
    await act(async () => document.querySelector<HTMLAnchorElement>('a[href="/docs"]')!.click())
    expect(spy).toHaveBeenCalledWith('/docs')
    expect(overlay()).toBeNull()
  })

  it('navigate(): cover, go, then reveal when the URL changes (no routeKey)', async () => {
    vi.useFakeTimers()
    let api: GoopPageTransitionApi | null = null
    const Grab = () => ((api = useGoopPageTransition()), null)
    render(h(GoopPageTransition, { accent: false, split: false }, h(Grab)))
    const go = vi.fn(() => history.pushState(null, '', '/next'))
    await act(async () => void api!.navigate(go))
    expect(go).not.toHaveBeenCalled()
    await tick(800)
    expect(go).toHaveBeenCalledOnce()
    expect(location.pathname).toBe('/next')
    await tick(2500)
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
  })

  it('a navigation that never lands reveals after revealTimeout', async () => {
    vi.useFakeTimers()
    const api = createRef<GoopPageTransitionApi>()
    render(h(GoopPageTransition, { goopRef: api, accent: false, split: false, routeKey: '/', revealTimeout: 1000 }))
    await act(async () => void api.current!.navigate(() => {}))
    await tick(800)
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).not.toBe('idle')
    await tick(1000 + 2500)
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
  })

  it('useGoopPageTransition outside one is a no-op (navigate just goes)', () => {
    let api: GoopPageTransitionApi | null = null
    const Grab = () => ((api = useGoopPageTransition()), null)
    render(h(Grab))
    const go = vi.fn()
    void api!.navigate(go)
    expect(go).toHaveBeenCalledOnce()
    expect(api!.handle).toBeNull()
  })
})
