// @vitest-environment node
// Tags Input and Field render on the server with no DOM: shadcn's markup, no goo layers.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('Tags Input / Field SSR', () => {
  it('renders without a DOM', async () => {
    const m = await import('../src')
    const app = createSSRApp({
      render: () =>
        h('div', [
          h(m.GoopTagsInput, { defaultValue: ['vue'] }, () => [
            h(m.GoopTagsInputItem, { value: 'vue' }, () => [h(m.GoopTagsInputItemText), h(m.GoopTagsInputItemDelete)]),
            h(m.GoopTagsInputInput, { placeholder: 'Add…' }),
          ]),
          h(m.GoopFieldSet, null, () => [
            h(m.GoopFieldLegend, null, () => 'Profile'),
            h(m.GoopField, { 'data-invalid': 'true' }, () => [
              h(m.GoopFieldLabel, { for: 'n' }, () => 'Name'),
              h(m.GoopFieldDescription, null, () => 'Your name'),
              h(m.GoopFieldError, { errors: ['Required', 'Too short'] }),
            ]),
            h(m.GoopFieldSeparator),
          ]),
        ]),
    })
    const html = await renderToString(app)
    expect(html).toContain('data-slot="tags-input-goo"')
    expect(html).toContain('data-slot="tags-input"')
    expect(html).toContain('data-slot="tags-input-item"')
    expect(html).toContain('>vue<')
    expect(html).toContain('data-slot="field-set"')
    expect(html).toContain('role="group"')
    expect(html).toContain('role="alert"')
    expect(html).toContain('<li>Required</li>')
    expect(html).not.toContain('data-goop-part')
    expect(html).not.toContain('data-goop-active')
  })
})
