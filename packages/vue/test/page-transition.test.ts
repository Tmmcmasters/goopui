import { PAGE_TRANSITION_ATTR } from '@goopui/core'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { GoopPageTransition, goopRouterTransition, toPageTransitionOptions, useGoopPageTransition } from '../src'

const overlay = () => document.querySelector(`svg[${PAGE_TRANSITION_ATTR}]`)

describe('toPageTransitionOptions', () => {
  it('maps props and app config onto core options', () => {
    expect(toPageTransitionOptions({ direction: 'up', bulge: false, duration: 500 }, { preset: 'wild', reducedMotion: true })).toEqual({
      enabled: true,
      preset: 'wild',
      reducedMotion: true,
      direction: 'up',
      bulge: false,
      duration: 500,
    })
    expect(toPageTransitionOptions({ goo: false }).enabled).toBe(false)
  })
})

describe('GoopPageTransition', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('renders nothing, covers and reveals through the exposed API, and cleans up', async () => {
    vi.useFakeTimers()
    const w = mount(GoopPageTransition, { props: { accent: false }, attachTo: document.body })
    expect(overlay()).toBeNull()
    const vm = w.vm as unknown as { cover(): Promise<void>; reveal(): Promise<void> }
    const covered = vm.cover()
    expect(overlay()?.getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(600)
    await covered
    const revealed = vm.reveal()
    vi.advanceTimersByTime(600)
    await revealed
    expect(overlay()?.getAttribute(PAGE_TRANSITION_ATTR)).toBe('idle')
    w.unmount()
    expect(overlay()).toBeNull()
  })

  it('goo off: resolves at once with no overlay', async () => {
    const w = mount(GoopPageTransition, { props: { goo: false } })
    await (w.vm as unknown as { cover(): Promise<void> }).cover()
    expect(overlay()).toBeNull()
    w.unmount()
  })

  it('hooks a router: cover before a path change, reveal after', async () => {
    type Guard = (to: { path: string; matched: unknown[] }, from: { path: string; matched: unknown[] }, failure?: unknown) => unknown
    const before: Guard[] = []
    const after: Guard[] = []
    const router = {
      beforeEach: (g: Guard) => (before.push(g), () => before.splice(before.indexOf(g), 1)),
      afterEach: (g: Guard) => (after.push(g), () => after.splice(after.indexOf(g), 1)),
    }
    const calls: string[] = []
    const off = goopRouterTransition(router, {
      cover: async () => void calls.push('cover'),
      reveal: async () => void calls.push('reveal'),
    })
    const a = { path: '/', matched: [{}] }
    const b = { path: '/docs', matched: [{}] }
    // First navigation (nothing matched yet) and same-path changes skip the cover.
    await before[0]!(a, { path: '/', matched: [] })
    await before[0]!(a, a)
    expect(calls).toEqual([])
    await before[0]!(b, a)
    await after[0]!(b, a)
    expect(calls).toEqual(['cover', 'reveal'])
    off()
    expect(before).toHaveLength(0)
    expect(after).toHaveLength(0)
  })

  it('useGoopPageTransition creates on mount and destroys on unmount', async () => {
    let api: ReturnType<typeof useGoopPageTransition> | null = null
    const C = defineComponent({
      setup() {
        api = useGoopPageTransition()
        return () => h('div')
      },
    })
    const w = mount(C)
    await nextTick()
    expect(api!.handle.value).not.toBeNull()
    w.unmount()
    expect(api!.handle.value).toBeNull()
    await api!.cover()
  })
})
