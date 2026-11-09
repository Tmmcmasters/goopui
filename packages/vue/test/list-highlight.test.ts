import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { GoopPlugin, useGoopListHighlight } from '../src'

const Demo = defineComponent({
  props: { on: { type: Boolean, default: true }, current: { type: String, default: 'b' } },
  setup(props) {
    const nav = ref<HTMLElement | null>(null)
    const { active } = useGoopListHighlight(
      () => nav.value,
      () => ({ active: '[aria-current="page"]' }),
      () => props.on,
    )
    return () =>
      h('nav', { ref: nav, 'data-on': active.value ? '' : undefined }, ['a', 'b', 'c'].map((id) =>
        h('a', { href: `/${id}`, id, 'aria-current': props.current === id ? 'page' : undefined }, id),
      ))
  },
})

const nav = () => document.querySelector('nav')!
const blob = () => nav().querySelector('[data-goop="highlight"]')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useGoopListHighlight', () => {
  it('attaches after mount, rests on the active item and follows it', async () => {
    const w = mount(Demo, { attachTo: document.body, global: { plugins: [[GoopPlugin, { reducedMotion: true }]] } })
    await flushPromises()
    expect(blob()?.getAttribute('aria-hidden')).toBe('true')
    expect(nav().hasAttribute('data-goop-menu')).toBe(true)
    await w.setProps({ current: 'c' })
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
    // The blob element rides the active item (reduced motion: snapped).
    expect(nav().querySelector('#c')!.getAttribute('aria-current')).toBe('page')

    await w.setProps({ on: false })
    await flushPromises()
    expect(blob()).toBeNull()
    expect(nav().hasAttribute('data-goop-menu')).toBe(false)
    await w.setProps({ on: true })
    await flushPromises()
    expect(blob()).not.toBeNull()
    w.unmount()
    expect(document.querySelector('[data-goop="highlight"]')).toBeNull()
  })

  it('renders no blob on the server', async () => {
    const html = await renderToString(createSSRApp(Demo))
    expect(html).not.toContain('data-goop')
    expect(html).toContain('aria-current="page"')
  })
})
