import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  GOOP_CONFIG_KEY,
  GoopSkeleton,
  GoopSkeletonReveal,
  SKELETON_REVEAL_PROP_KEYS,
  goopComponents,
  goopSkeletonRevealProps,
  toSkeletonRevealOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const slots = {
  skeleton: () => [h(GoopSkeleton, { class: 'h-4 w-full' }), h(GoopSkeleton, { class: 'h-4 w-1/2' })],
  default: () => [h('p', { class: 'real' }, 'Ada Lovelace')],
}

describe('GoopSkeletonReveal', () => {
  it('is in the manifest with its effect props', () => {
    expect(goopComponents).toContain('GoopSkeletonReveal')
    for (const k of ['sheen', 'breathe', 'melt', 'speed', 'preset']) {
      expect(SKELETON_REVEAL_PROP_KEYS).toContain(k)
      expect(goopSkeletonRevealProps).toHaveProperty(k)
    }
  })

  it('maps props over app config', () => {
    expect(toSkeletonRevealOptions({ melt: false, speed: 2 }, { preset: 'wild' })).toMatchObject({ melt: false, speed: 2, preset: 'wild' })
    expect(toSkeletonRevealOptions({ preset: 'subtle' }, { preset: 'wild' }).preset).toBe('subtle')
  })

  it('renders the skeleton while loading, then the content in the same root', async () => {
    const w = mount(GoopSkeletonReveal, { props: { loading: true, class: 'grid gap-4' }, slots, attachTo: document.body })
    const root = w.get('[data-slot="skeleton-reveal"]')
    expect(root.classes()).toContain('grid')
    expect(root.attributes('aria-busy')).toBe('true')
    expect(w.findAll('[data-slot="skeleton"]').length).toBe(2)
    expect(w.find('.real').exists()).toBe(false)
    await w.setProps({ loading: false })
    await nextTick()
    expect(w.find('[data-slot="skeleton"]').exists()).toBe(false)
    expect(w.get('.real').text()).toBe('Ada Lovelace')
    expect(w.get('[data-slot="skeleton-reveal"]').attributes('aria-busy')).toBeUndefined()
    w.unmount()
  })

  it('melt off: emits revealed right after the swap and leaves no goo layer', async () => {
    const w = mount(GoopSkeletonReveal, { props: { loading: true, melt: false }, slots, attachTo: document.body })
    await w.setProps({ loading: false })
    await nextTick()
    await nextTick()
    expect(w.emitted('revealed')).toHaveLength(1)
    expect(document.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    w.unmount()
  })

  it('reduced motion (app config): no goo layer while loading', async () => {
    const w = mount(GoopSkeletonReveal, {
      props: { loading: true },
      slots,
      attachTo: document.body,
      global: { provide: { [GOOP_CONFIG_KEY as symbol]: { reducedMotion: true } } },
    })
    await nextTick()
    expect(document.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    w.unmount()
  })

  it('starts with content when not loading (no reveal on mount)', () => {
    const w = mount(GoopSkeletonReveal, { props: { loading: false }, slots, attachTo: document.body })
    expect(w.find('.real').exists()).toBe(true)
    expect(w.find('[data-slot="skeleton"]').exists()).toBe(false)
    w.unmount()
  })
})
