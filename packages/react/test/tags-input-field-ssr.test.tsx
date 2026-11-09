// @vitest-environment node
// Server render of Tags Input and Field with no DOM at all (react-dom/server, as Next.js does):
// any `document` / `window` access from goopUI's own code during render throws. The markup is
// deterministic, is shadcn's, and has no goo layer.
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const TRAPPED = ['document', 'window', 'AudioContext'] as const
const trap = (name: string) =>
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() {
      const caller = new Error().stack?.split('\n')[2] ?? ''
      if (caller.includes('node_modules')) return undefined
      throw new Error(`${name} accessed during SSR`)
    },
  })
const untrap = () => {
  for (const name of TRAPPED) delete (globalThis as Record<string, unknown>)[name]
}

describe('SSR (react-dom/server): Tags Input and Field', () => {
  it('renders without a DOM, deterministically, with no goo', async () => {
    const m = await import('../src')
    const view = () =>
      h(
        'div',
        null,
        h(
          m.GoopTagsInput,
          { defaultValue: ['react'], name: 'tags', merge: false },
          h(m.GoopTagsInputItem, { value: 'react' }, h(m.GoopTagsInputItemText), h(m.GoopTagsInputItemDelete)),
          h(m.GoopTagsInputInput, { placeholder: 'Add…' }),
        ),
        h(
          m.GoopFieldSet,
          null,
          h(m.GoopFieldLegend, null, 'Profile'),
          h(
            m.GoopField,
            { 'data-invalid': true, drip: false },
            h(m.GoopFieldLabel, { htmlFor: 'n' }, 'Name'),
            h(m.GoopFieldDescription, null, 'Your name'),
            h(m.GoopFieldError, { errors: ['Required', 'Too short'] }),
          ),
          h(m.GoopFieldSeparator),
        ),
      )
    for (const name of TRAPPED) trap(name)
    let a = ''
    try {
      a = renderToString(view())
      expect(renderToString(view())).toBe(a)
    } finally {
      untrap()
    }
    expect(a).toContain('data-slot="tags-input-goo"')
    expect(a).toContain('data-slot="tags-input"')
    expect(a).toContain('data-slot="tags-input-item"')
    expect(a).toContain('>react</span>')
    expect(a).toContain('type="hidden" name="tags" value="react"')
    expect(a).toContain('data-slot="field-set"')
    expect(a).toContain('role="group"')
    expect(a).toContain('role="alert"')
    expect(a).toContain('<li>Required</li>')
    expect(a).not.toContain('merge')
    expect(a).not.toContain('drip')
    expect(a).not.toContain('data-goop-part')
    expect(a).not.toContain('data-goop-active')
    expect(a).not.toContain('focus-within:ring-0')
  })
})
