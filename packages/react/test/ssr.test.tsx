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

  it('batch 1: skeleton, reveal, badge, card, avatar, separator, label render shadcn markup', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(m.GoopSkeleton, { className: 'h-4 w-20' }),
        h(m.GoopSkeleton, { shimmer: false }),
        h(m.GoopSkeletonReveal, { loading: true, skeleton: h(m.GoopSkeleton, { className: 'size-12' }) }, h('p', null, 'Loaded')),
        h(m.GoopBadge, { asChild: true }, h('a', { href: '/x' }, 'Link')),
        h(
          m.GoopCard,
          { goo: true },
          h(m.GoopCardHeader, null, h(m.GoopCardTitle, null, 'Title'), h(m.GoopCardDescription, null, 'Desc')),
          h(m.GoopCardContent, null, 'Body'),
          h(m.GoopCardFooter, null, 'Foot'),
        ),
        h(m.GoopAvatar, null, h(m.GoopAvatarImage, { src: '/a.png', alt: 'A' }), h(m.GoopAvatarFallback, null, 'AL')),
        h(m.GoopSeparator, { orientation: 'vertical' }),
        h(m.GoopLabel, { htmlFor: 'e' }, 'Email'),
      ),
    )
    expect(html).toContain('data-slot="skeleton" data-goop-shimmer=""')
    expect(html).toContain('animate-pulse')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('data-slot="skeleton-reveal-skeleton"')
    expect(html).not.toContain('Loaded')
    expect(html).toContain('<a href="/x" data-slot="badge"')
    expect(html).toContain('data-goop-swell=""')
    expect(html).toContain('data-slot="card" data-size="default" data-goop-host="card"')
    expect(html).not.toContain('data-goop="card"')
    expect(html).toContain('data-slot="card-footer"')
    expect(html).toContain('data-goop-settle=""')
    // Radix renders the fallback on the server (the image waits for its load on the client).
    expect(html).toContain('>AL</span>')
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('<label data-slot="label"')
  })

  it("GoopSpinner renders its static goo pose (inline svg + filter), shadcn's role and label", async () => {
    const { GoopSpinner } = await import('../src')
    const html = await render(() => h('div', null, h(GoopSpinner, { className: 'size-8' }), h(GoopSpinner, { variant: 'dots', interactive: false })))
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Loading"')
    expect(html).toContain('data-variant="orbit"')
    expect(html).toContain('<feColorMatrix')
    expect((html.match(/<circle /g) ?? []).length).toBeGreaterThan(2)
    expect(html).toContain('pointer-events-none')
    expect(html).not.toContain('blobs')
  })

  it("'use client' only where a component needs the client (goo or React context)", async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src/components', f), 'utf8'))
    for (const f of ['skeleton/GoopSkeleton.tsx', 'skeleton/GoopSkeletonReveal.tsx', 'badge/GoopBadge.tsx', 'card/GoopCard.tsx', 'avatar/GoopAvatar.tsx', 'spinner/GoopSpinner.tsx'])
      expect(client(f), f).toBe(true)
    for (const f of ['card/parts.tsx', 'avatar/parts.tsx', 'separator/GoopSeparator.tsx', 'label/GoopLabel.tsx', 'skeleton/variants.ts', 'badge/variants.ts'])
      expect(client(f), f).toBe(false)
  })
})


describe('SSR: menus', () => {
  it('dropdown, context menu, menubar and navigation menu render shadcn markup (panels are client-only)', async () => {
    const m = await import('../src')
    const html = await render(() =>
      h(
        'div',
        null,
        h(m.GoopDropdownMenu, null, h(m.GoopDropdownMenuTrigger, { asChild: true }, h(m.GoopButton, { variant: 'outline' }, 'Open')), h(m.GoopDropdownMenuContent, { wobble: false }, h(m.GoopDropdownMenuItem, null, 'Profile'))),
        h(m.GoopContextMenu, null, h(m.GoopContextMenuTrigger, null, 'Right-click'), h(m.GoopContextMenuContent, null, h(m.GoopContextMenuItem, null, 'Back'))),
        h(
          m.GoopMenubar,
          { wobble: false },
          h(m.GoopMenubarMenu, null, h(m.GoopMenubarTrigger, null, 'File'), h(m.GoopMenubarContent, null, h(m.GoopMenubarItem, null, 'New Tab'))),
        ),
        h(
          m.GoopNavigationMenu,
          { speed: 2 },
          h(
            m.GoopNavigationMenuList,
            null,
            h(m.GoopNavigationMenuItem, null, h(m.GoopNavigationMenuTrigger, null, 'Getting started'), h(m.GoopNavigationMenuContent, null, h(m.GoopNavigationMenuLink, { href: '#' }, 'Intro'))),
          ),
        ),
      ),
    )
    expect(html).toContain('data-slot="dropdown-menu-trigger"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('data-slot="context-menu-trigger"')
    expect(html).toContain('data-slot="menubar" data-goop-menubar=""')
    expect(html).toContain('data-slot="menubar-trigger"')
    expect(html).toContain('data-slot="navigation-menu"')
    expect(html).toContain('data-viewport="true"')
    expect(html).toContain('data-goop-nav-item=""')
    expect(html).toContain('data-slot="navigation-menu-viewport-box"')
    expect(html).not.toContain('data-goop="highlight"')
    expect(html).not.toContain('wobble')
    expect(html).not.toContain('speed')
    expect(html).not.toContain('Profile')
  })

  it("'use client' on every menu module", async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const client = (f: string) => /^\s*['"]use client['"]/.test(readFileSync(join(__dirname, '../src/components', f), 'utf8'))
    for (const f of ['dropdown-menu/GoopDropdownMenu.tsx', 'dropdown-menu/menu-goo.tsx', 'context-menu/GoopContextMenu.tsx', 'menubar/GoopMenubar.tsx', 'navigation-menu/GoopNavigationMenu.tsx'])
      expect(client(f), f).toBe(true)
    for (const f of ['dropdown-menu/styles.ts', 'context-menu/styles.ts', 'menubar/styles.ts', 'navigation-menu/variants.ts']) expect(client(f), f).toBe(false)
  })
})
