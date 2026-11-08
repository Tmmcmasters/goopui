// @vitest-environment node
// Server render with no DOM at all (react-dom/server, as Next.js does for client components).
// The trap goes in after importing: any `document` / `window` access from goopUI's own code
// (packages/react, packages/core) during render then throws. Dependencies may feature-detect
// (Radix's Primitive does `typeof window`), so for them the globals just read as undefined. Also checks the markup is
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

async function render(view: () => React.ReactElement): Promise<string> {
  for (const name of TRAPPED) trap(name)
  try {
    const a = renderToString(view())
    const b = renderToString(view())
    expect(a).toBe(b)
    expect(a).not.toContain('data-goop-active')
    expect(a).not.toContain('data-goop="layer"')
    return a
  } finally {
    untrap()
  }
}

describe('SSR (react-dom/server)', () => {
  it('GoopButton renders shadcn markup with the label wrapper', async () => {
    const { GoopButton } = await import('../src')
    const html = await render(() =>
      h('div', null, h(GoopButton, { variant: 'destructive', shockwave: false }, 'Delete'), h(GoopButton, { variant: 'outline', asChild: true }, h('a', { href: '/' }, 'Home'))),
    )
    expect(html).toContain('data-slot="button"')
    expect(html).toContain('data-goop-label')
    expect(html).toContain('data-goop-host="fill"')
    expect(html).toContain('<a href="/"')
    expect(html).toContain('data-goop-host="stroke"')
    expect(html).not.toContain('shockwave')
    expect(html).not.toContain('background-color:transparent')
  })

  it('GoopSwitch and GoopCheckbox render plain shadcn controls', async () => {
    const { GoopSwitch, GoopCheckbox } = await import('../src')
    const html = await render(() =>
      h('div', null, h(GoopSwitch), h(GoopSwitch, { defaultChecked: true, size: 'sm', bridge: false }), h(GoopCheckbox, { defaultChecked: true }), h(GoopCheckbox, { checked: 'indeterminate' })),
    )
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('data-size="sm"')
    expect(html).toContain('role="checkbox"')
    expect(html).toContain('aria-checked="mixed"')
    expect(html).toContain('data-goop-mark')
    expect(html).not.toContain('bridge')
  })

  it('GoopTabs renders shadcn tabs; the active trigger keeps its look until the blob attaches', async () => {
    const { GoopTabs, GoopTabsList, GoopTabsTrigger, GoopTabsContent } = await import('../src')
    const html = await render(() =>
      h(
        GoopTabs,
        { defaultValue: 'a' },
        h(GoopTabsList, { wobble: false }, h(GoopTabsTrigger, { value: 'a' }, 'A'), h(GoopTabsTrigger, { value: 'b' }, 'B')),
        h(GoopTabsContent, { value: 'a' }, 'Panel A'),
      ),
    )
    expect(html).toContain('data-goop-tabs=""')
    expect(html).toContain('role="tablist"')
    expect(html).toContain('data-state="active"')
    expect(html).toContain('Panel A')
    expect(html).not.toContain('wobble')
  })

  it('GoopDialog renders its trigger (content is portalled on open, client-only)', async () => {
    const { GoopDialog, GoopDialogTrigger, GoopDialogContent, GoopDialogTitle, GoopButton } = await import('../src')
    const html = await render(() =>
      h(
        GoopDialog,
        null,
        h(GoopDialogTrigger, { asChild: true }, h(GoopButton, { variant: 'outline' }, 'Edit profile')),
        h(GoopDialogContent, null, h(GoopDialogTitle, null, 'Edit profile')),
      ),
    )
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('data-slot="dialog-trigger"')
    expect(html).toContain('data-goop-host="stroke"')
  })

  it('sound: cue attributes render with <GoopProvider sound>, and nothing loads Cuelume', async () => {
    const { GoopButton, GoopProvider, GoopSwitch } = await import('../src')
    const core = await import('@goopui/core')
    const view = () => h('div', null, h(GoopButton, null, 'Save'), h(GoopSwitch))
    const plain = await render(view)
    const sounding = await render(() => h(GoopProvider, { sound: true }, view()))
    expect(plain).not.toContain('data-cuelume')
    expect(sounding).toContain('data-cuelume-tap')
    expect(sounding).toContain('data-cuelume-toggle')
    expect(core.isSoundEnabled()).toBe(false)
  })
})
