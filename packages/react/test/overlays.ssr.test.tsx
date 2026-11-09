// @vitest-environment node
// Server render of the bloom overlays with no DOM (react-dom/server, as Next.js does): any
// `document` / `window` access from goopUI's own code throws. The panels are portalled on open
// (client only), so the server markup is shadcn's triggers; a defaultOpen overlay renders no
// portal on the server either.
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
    return a
  } finally {
    untrap()
  }
}

describe('SSR: bloom overlays', () => {
  it("render shadcn's triggers and no goo", async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        m.GoopProvider,
        { sound: true },
        h(m.GoopPopover, null, h(m.GoopPopoverTrigger, { asChild: true }, h(m.GoopButton, { variant: 'outline' }, 'Open popover')), h(m.GoopPopoverContent, null, 'Body')),
        h(
          m.GoopTooltipProvider,
          null,
          h(m.GoopTooltip, null, h(m.GoopTooltipTrigger, { asChild: true }, h(m.GoopButton, { variant: 'outline' }, 'Hover me')), h(m.GoopTooltipContent, null, 'Tip')),
        ),
        h(m.GoopHoverCard, { defaultOpen: true }, h(m.GoopHoverCardTrigger, { href: '#' }, '@nextjs'), h(m.GoopHoverCardContent, null, 'Card')),
        h(
          m.GoopAlertDialog,
          null,
          h(m.GoopAlertDialogTrigger, { asChild: true }, h(m.GoopButton, { variant: 'outline' }, 'Delete')),
          h(m.GoopAlertDialogContent, { size: 'sm' }, h(m.GoopAlertDialogTitle, null, 'Sure?'), h(m.GoopAlertDialogFooter, null, h(m.GoopAlertDialogCancel, null, 'Cancel'))),
        ),
        h(m.GoopSheet, null, h(m.GoopSheetTrigger, { asChild: true }, h(m.GoopButton, { variant: 'outline' }, 'Open sheet')), h(m.GoopSheetContent, { side: 'left' }, h(m.GoopSheetTitle, null, 'Sheet'))),
      ),
    )
    expect(html).toContain('data-slot="popover-trigger"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('data-slot="tooltip-trigger"')
    expect(html).toContain('data-slot="hover-card-trigger"')
    expect(html).toContain('data-slot="alert-dialog-trigger"')
    expect(html).toContain('data-slot="sheet-trigger"')
    expect(html).toContain('data-cuelume-open')
    expect(html).not.toContain('data-goop="surface"')
    expect(html).not.toContain('data-goop-emerge')
    expect(html).not.toMatch(/openDrips|bloomFrom|flowStyle/)
  })

  it("'use client' on every overlay component file, not on its styles", async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src', f), 'utf8'))
    for (const f of [
      'bloom-surface.tsx',
      'components/popover/GoopPopover.tsx',
      'components/tooltip/GoopTooltip.tsx',
      'components/hover-card/GoopHoverCard.tsx',
      'components/alert-dialog/GoopAlertDialog.tsx',
      'components/sheet/GoopSheet.tsx',
    ])
      expect(client(f), f).toBe(true)
    expect(client('components/alert-dialog/styles.ts')).toBe(false)
  })
})
