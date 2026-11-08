import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  EMPTY_PROP_KEYS,
  GoopEmpty,
  GoopEmptyContent,
  GoopEmptyDescription,
  GoopEmptyHeader,
  GoopEmptyMedia,
  GoopEmptyTitle,
  emptyMediaVariants,
  goopComponents,
  resolveEmptyProps,
  toEmptyOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const empty = (rootProps: Record<string, unknown> = {}, mediaProps: Record<string, unknown> = {}) =>
  mount(GoopEmpty, {
    attachTo: document.body,
    props: rootProps,
    slots: {
      default: () => [
        h(GoopEmptyHeader, null, () => [
          h(GoopEmptyMedia, { variant: 'icon', ...mediaProps }, () => h('svg', { 'data-icon': '' })),
          h(GoopEmptyTitle, null, () => 'No projects'),
          h(GoopEmptyDescription, null, () => 'Create one.'),
        ]),
        h(GoopEmptyContent, null, () => h('button', 'Create')),
      ],
    },
  })

describe('GoopEmpty', () => {
  it('is in the manifest; props resolve and map to core options', () => {
    for (const n of ['GoopEmpty', 'GoopEmptyContent', 'GoopEmptyDescription', 'GoopEmptyHeader', 'GoopEmptyMedia', 'GoopEmptyTitle'])
      expect(goopComponents).toContain(n)
    expect([...EMPTY_PROP_KEYS]).toEqual(['goo', 'puddle', 'breathe', 'speed', 'preset'])
    expect(resolveEmptyProps({ breathe: false }, { breathe: true, preset: 'wild' })).toEqual({ breathe: false, preset: 'wild' })
    expect(toEmptyOptions({ goo: false })).toBeNull()
    expect(toEmptyOptions({ puddle: false })).toBeNull()
    expect(toEmptyOptions({ breathe: 0.5, speed: 2 }, { preset: 'subtle' })).toMatchObject({ breathe: 0.5, speed: 2, preset: 'subtle' })
  })

  it("renders shadcn's markup; the media hosts one aria-hidden puddle", async () => {
    const w = empty()
    await nextTick()
    expect(w.get('[data-slot="empty"]').classes()).toContain('border-dashed')
    const media = w.get('[data-slot="empty-icon"]')
    expect(media.attributes('data-variant')).toBe('icon')
    for (const c of emptyMediaVariants({ variant: 'icon' }).split(' ')) expect(media.classes()).toContain(c)
    expect(media.findAll('[data-goop="empty-puddle"]')).toHaveLength(1)
    expect(media.get('[data-goop="empty-puddle"]').attributes('aria-hidden')).toBe('true')
    expect(w.get('[data-slot="empty-description"]').element.tagName).toBe('P')
    expect(w.find('[data-slot="empty-header"]').exists()).toBe(true)
    expect(w.find('[data-slot="empty-content"]').exists()).toBe(true)
    w.unmount()
  })

  it('goo=false on the root, or puddle=false on the media, renders plain shadcn', async () => {
    for (const w of [empty({ goo: false }), empty({}, { puddle: false })]) {
      await nextTick()
      expect(w.find('[data-goop="empty-puddle"]').exists()).toBe(false)
      w.unmount()
    }
  })
})
