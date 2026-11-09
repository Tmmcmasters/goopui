// @vitest-environment node
// Layout batch server render with no DOM at all (react-dom/server, as Next.js does for client
// components). Any `document` / `window` access from goopUI's own code during render throws
// (dependencies may feature-detect). Checks the markup is deterministic, is shadcn's, and has no
// goo layer; and that the component modules carry 'use client'.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const TRAPPED = ['document', 'window'] as const
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

describe('SSR (react-dom/server): layout batch', () => {
  it('renders AspectRatio, ScrollArea and Resizable deterministically with no goo layer', async () => {
    const { GoopAspectRatio, GoopScrollArea, GoopResizablePanelGroup, GoopResizablePanel, GoopResizableHandle } = await import('../src')
    const view = () =>
      h(
        'div',
        null,
        h(GoopAspectRatio, { ratio: 16 / 9 }, h('span', null, 'media')),
        h(GoopScrollArea, { className: 'h-20' }, h('p', null, 'content')),
        h(
          GoopResizablePanelGroup,
          { orientation: 'horizontal', id: 'g' },
          h(GoopResizablePanel, { defaultSize: 50, id: 'a' }, 'One'),
          h(GoopResizableHandle, { withHandle: true, id: 'h' }),
          h(GoopResizablePanel, { defaultSize: 50, id: 'b' }, 'Two'),
        ),
      )
    for (const name of TRAPPED) trap(name)
    let html = ''
    try {
      html = renderToString(view())
      expect(renderToString(view())).toBe(html)
    } finally {
      untrap()
    }
    expect(html).toContain('data-slot="aspect-ratio"')
    expect(html).toContain('data-slot="scroll-area"')
    expect(html).toContain('data-goop-host="scroll-area"')
    expect(html).toContain('data-goop-scroll-viewport')
    expect(html).toContain('data-slot="resizable-panel-group"')
    expect(html).toContain('data-slot="resizable-handle"')
    expect(html).toContain('data-goop-grip')
    expect(html).not.toContain('data-goop="resizable"')
    expect(html).not.toContain('data-goop-scroll-root')
    expect(html).not.toContain('data-goop-active')
  })

  it("'use client' on the component modules; their class files stay server-safe", () => {
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src/components', f), 'utf8'))
    for (const f of ['aspect-ratio/GoopAspectRatio.tsx', 'scroll-area/GoopScrollArea.tsx', 'resizable/GoopResizable.tsx']) expect(client(f)).toBe(true)
    for (const f of ['scroll-area/styles.ts', 'resizable/styles.ts']) expect(client(f)).toBe(false)
  })
})
