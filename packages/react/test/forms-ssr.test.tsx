// @vitest-environment node
// Server render of the forms batch with no DOM at all (react-dom/server, as Next.js does for
// client components), like ssr.test.tsx: any `document` / `window` access from goopUI's own
// code during render throws. The markup is deterministic, is shadcn's, and has no goo layer.
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
    expect(a).not.toContain('background-color:transparent')
    return a
  } finally {
    untrap()
  }
}

describe('SSR (react-dom/server): forms batch', () => {
  it('GoopInput / GoopTextarea render the goo wrapper around shadcn fields', async () => {
    const { GoopInput, GoopTextarea } = await import('../src')
    const html = await render(() =>
      h('div', null, h(GoopInput, { type: 'email', placeholder: 'you@example.com', ripple: false }), h(GoopInput, { goo: false }), h(GoopTextarea, { rows: 2, drips: true })),
    )
    expect(html).toContain('data-slot="input-goo"')
    expect(html).toContain('data-goop-host="input"')
    expect(html).toContain('data-slot="input"')
    expect(html).toContain('type="email"')
    expect(html).toContain('data-slot="textarea-goo"')
    expect(html).toContain('data-slot="textarea"')
    expect(html.match(/data-slot="input-goo"/g)).toHaveLength(1)
    expect(html).not.toContain('ripple')
    expect(html).not.toContain('drips')
    // The goo ring only replaces shadcn's focus ring once it is attached.
    expect(html).not.toContain('focus-visible:ring-0')
  })

  it('GoopRadioGroup renders Radix radios with shadcn fills (until the blob attaches)', async () => {
    const { GoopRadioGroup, GoopRadioGroupItem } = await import('../src')
    const html = await render(() => h(GoopRadioGroup, { defaultValue: 'b', bridge: false }, h(GoopRadioGroupItem, { value: 'a' }), h(GoopRadioGroupItem, { value: 'b' })))
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('data-slot="radio-group"')
    expect(html).toContain('data-goop-host="radio-group"')
    expect(html.match(/role="radio"/g)).toHaveLength(2)
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('data-goop-mark')
    expect(html).not.toContain('data-[state=checked]:bg-transparent')
    expect(html).not.toContain('bridge')
  })

  it('GoopSlider renders shadcn parts and one thumb per value', async () => {
    const { GoopSlider } = await import('../src')
    const html = await render(() => h('div', null, h(GoopSlider, { defaultValue: [25, 75], jelly: false }), h(GoopSlider, { defaultValue: [40], orientation: 'vertical' })))
    expect(html).toContain('data-slot="slider"')
    expect(html).toContain('data-slot="slider-track"')
    expect(html).toContain('data-slot="slider-range"')
    expect(html.match(/data-slot="slider-thumb"/g)).toHaveLength(3)
    expect(html).toContain('data-orientation="vertical"')
    expect(html).not.toContain('jelly')
  })

  it('GoopProgress renders the shadcn bar with the indicator transform', async () => {
    const { GoopProgress } = await import('../src')
    const html = await render(() => h('div', null, h(GoopProgress, { value: 40, seed: 3 }), h(GoopProgress, { value: null })))
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="40"')
    expect(html).toContain('translateX(-60%)')
    expect(html).toContain('data-state="indeterminate"')
    expect(html).not.toContain('seed')
  })

  it('GoopToggle / GoopToggleGroup render shadcn toggles with their pressed bg', async () => {
    const { GoopToggle, GoopToggleGroup, GoopToggleGroupItem } = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(GoopToggle, { defaultPressed: true, variant: 'outline', flood: false }, 'B'),
        h(GoopToggleGroup, { type: 'single', defaultValue: 'a', variant: 'outline' }, h(GoopToggleGroupItem, { value: 'a' }, 'A'), h(GoopToggleGroupItem, { value: 'b' }, 'B')),
        h(GoopToggleGroup, { type: 'multiple', defaultValue: ['x'], merge: false }, h(GoopToggleGroupItem, { value: 'x' }, 'X')),
      ),
    )
    expect(html).toContain('data-slot="toggle"')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('data-slot="toggle-group"')
    expect(html).toContain('data-slot="toggle-group-item"')
    expect(html).toContain('data-variant="outline"')
    expect(html).toContain('--gap:0')
    expect(html).not.toContain('data-[state=on]:bg-transparent')
    expect(html).not.toContain('flood')
    expect(html).not.toContain('merge')
  })

  it("every forms component module starts with 'use client'; variants stay server-safe", async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src/components', f), 'utf8'))
    for (const f of [
      'input/GoopInput.tsx',
      'textarea/GoopTextarea.tsx',
      'radio-group/GoopRadioGroup.tsx',
      'slider/GoopSlider.tsx',
      'progress/GoopProgress.tsx',
      'toggle/GoopToggle.tsx',
      'toggle-group/GoopToggleGroup.tsx',
    ])
      expect(client(f), f).toBe(true)
    for (const f of ['input/variants.ts', 'radio-group/variants.ts', 'slider/variants.ts', 'progress/variants.ts', 'toggle/variants.ts', 'toggle-group/variants.ts'])
      expect(client(f), f).toBe(false)
  })
})
