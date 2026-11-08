import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import {
  BREADCRUMB_PROP_KEYS,
  GoopBreadcrumb,
  GoopBreadcrumbEllipsis,
  GoopBreadcrumbItem,
  GoopBreadcrumbLink,
  GoopBreadcrumbList,
  GoopBreadcrumbPage,
  GoopBreadcrumbSeparator,
  goopComponents,
  resolveBreadcrumbProps,
  toBreadcrumbOptions,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const trail = (rootProps: Record<string, unknown> = {}, listProps: Record<string, unknown> = {}) =>
  mount(GoopBreadcrumb, {
    attachTo: document.body,
    props: rootProps,
    slots: {
      default: () =>
        h(GoopBreadcrumbList, listProps, () => [
          h(GoopBreadcrumbItem, null, () => h(GoopBreadcrumbLink, { href: '/' }, () => 'Home')),
          h(GoopBreadcrumbSeparator),
          h(GoopBreadcrumbItem, null, () => h(GoopBreadcrumbEllipsis)),
          h(GoopBreadcrumbSeparator),
          h(GoopBreadcrumbItem, null, () => h(GoopBreadcrumbPage, null, () => 'Breadcrumb')),
        ]),
    },
  })

describe('GoopBreadcrumb', () => {
  it('is in the manifest; props resolve and map to core options', () => {
    for (const n of ['GoopBreadcrumb', 'GoopBreadcrumbEllipsis', 'GoopBreadcrumbItem', 'GoopBreadcrumbLink', 'GoopBreadcrumbList', 'GoopBreadcrumbPage', 'GoopBreadcrumbSeparator'])
      expect(goopComponents).toContain(n)
    expect([...BREADCRUMB_PROP_KEYS]).toEqual(['goo', 'highlight', 'wobble', 'momentum', 'followPointer', 'speed', 'preset', 'renderer'])
    expect(resolveBreadcrumbProps({ wobble: true }, { wobble: false, preset: 'wild' })).toEqual({ wobble: true, preset: 'wild' })
    expect(toBreadcrumbOptions({ goo: false })).toBeNull()
    expect(toBreadcrumbOptions({ highlight: false })).toBeNull()
    expect(toBreadcrumbOptions({ followPointer: false, momentum: false })).toMatchObject({ followPointer: false, momentum: false, wobble: true })
  })

  it("renders shadcn's markup; the list hosts one aria-hidden blob and links get room for it", async () => {
    const w = trail()
    await nextTick()
    const nav = w.get('nav')
    expect(nav.attributes('aria-label')).toBe('breadcrumb')
    const ol = w.get('[data-slot="breadcrumb-list"]')
    expect(ol.element.tagName).toBe('OL')
    expect(ol.attributes('data-goop-breadcrumb')).toBe('')
    expect(ol.findAll('[data-goop="highlight"]')).toHaveLength(1)
    const link = w.get('[data-slot="breadcrumb-link"]')
    expect(link.element.tagName).toBe('A')
    expect(link.classes()).toEqual(expect.arrayContaining(['px-1', '-mx-1']))
    expect(w.get('[data-slot="breadcrumb-page"]').attributes('aria-current')).toBe('page')
    expect(w.findAll('[data-slot="breadcrumb-separator"] svg')).toHaveLength(2)
    expect(w.get('[data-slot="breadcrumb-ellipsis"]').text()).toContain('More')
    w.unmount()
  })

  it('goo=false on the root (or highlight=false on the list) renders plain shadcn', async () => {
    for (const w of [trail({ goo: false }), trail({}, { highlight: false })]) {
      await nextTick()
      expect(w.find('[data-goop="highlight"]').exists()).toBe(false)
      expect(w.get('[data-slot="breadcrumb-list"]').attributes('data-goop-breadcrumb')).toBeUndefined()
      expect(w.get('[data-slot="breadcrumb-link"]').classes()).not.toContain('px-1')
      w.unmount()
    }
  })
})
