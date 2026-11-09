// @vitest-environment node
// The layout batch renders on the server with no DOM: shadcn markup, deterministic, no goo layer.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('layout batch SSR', () => {
  it('renders AspectRatio, ScrollArea and Resizable without a DOM', async () => {
    const { GoopAspectRatio, GoopScrollArea, GoopResizablePanelGroup, GoopResizablePanel, GoopResizableHandle } = await import('../src')
    const view = () =>
      createSSRApp({
        render: () => [
          h(GoopAspectRatio, { ratio: 16 / 9 }, () => h('span', 'media')),
          h(GoopScrollArea, { class: 'h-20' }, () => h('p', 'content')),
          h(GoopResizablePanelGroup, { direction: 'horizontal', id: 'g' }, () => [
            h(GoopResizablePanel, { defaultSize: 50, id: 'a' }, () => 'One'),
            h(GoopResizableHandle, { withHandle: true, id: 'h' }),
            h(GoopResizablePanel, { defaultSize: 50, id: 'b' }, () => 'Two'),
          ]),
        ],
      })
    const html = await renderToString(view())
    expect(await renderToString(view())).toBe(html)
    expect(html).toContain('data-slot="aspect-ratio"')
    expect(html).toContain('data-slot="scroll-area"')
    expect(html).toContain('data-goop-host="scroll-area"')
    expect(html).toContain('data-goop-scroll-viewport')
    expect(html).toContain('data-slot="resizable-panel-group"')
    expect(html).toContain('data-slot="resizable-handle"')
    expect(html).toContain('data-goop-grip')
    expect(html).not.toContain('data-goop="resizable"')
    expect(html).not.toContain('data-goop-scroll-root')
    expect(html).not.toContain('transform')
  })
})
