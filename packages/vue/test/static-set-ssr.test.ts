// @vitest-environment node
// The static set renders on the server with no DOM, and the markup carries the CSS-only
// effects (so first paint already shimmers / settles) but no card goo layer.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

describe('static set SSR', () => {
  it('renders without a DOM', async () => {
    const { GoopSkeleton, GoopBadge, GoopCard, GoopCardContent, GoopAvatar, GoopAvatarFallback, GoopSeparator, GoopLabel } = await import('../src')
    const app = createSSRApp({
      render: () =>
        h('div', [
          h(GoopSkeleton, { class: 'h-4' }),
          h(GoopBadge, null, () => 'New'),
          h(GoopCard, { goo: true }, () => h(GoopCardContent, null, () => 'Body')),
          h(GoopAvatar, null, () => h(GoopAvatarFallback, null, () => 'TM')),
          h(GoopSeparator),
          h(GoopLabel, null, () => 'Name'),
        ]),
    })
    const html = await renderToString(app)
    expect(html).toContain('data-goop-shimmer')
    expect(html).toContain('--goop-shimmer-period:2.4s')
    expect(html).toContain('data-slot="badge"')
    expect(html).toContain('data-goop-settle')
    expect(html).toContain('TM')
    expect(html).not.toContain('data-goop="card"')
  })

  it('GoopSkeletonReveal renders the slot for its state, with no goo layer', async () => {
    const { GoopSkeleton, GoopSkeletonReveal } = await import('../src')
    const render = (loading: boolean) =>
      renderToString(
        createSSRApp({
          render: () => h(GoopSkeletonReveal, { loading }, { skeleton: () => h(GoopSkeleton, { class: 'h-4' }), default: () => h('p', 'Loaded') }),
        }),
      )
    const busy = await render(true)
    expect(busy).toContain('aria-busy="true"')
    expect(busy).toContain('data-slot="skeleton"')
    expect(busy).not.toContain('Loaded')
    expect(busy).not.toContain('data-goop-skeleton-goo')
    const done = await render(false)
    expect(done).toContain('Loaded')
    expect(done).not.toContain('data-slot="skeleton"')
  })
})

describe('small set SSR', () => {
  it("renders shadcn's markup with no goo layers", async () => {
    const { GoopAlert, GoopAlertTitle, GoopAlertDescription } = await import('../src')
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h('div', [
            h(GoopAlert, { variant: 'destructive' }, () => [h('svg'), h(GoopAlertTitle, null, () => 'Heads up'), h(GoopAlertDescription, null, () => 'Body')]),
          ]),
      }),
    )
    expect(html).toContain('data-slot="alert"')
    expect(html).toContain('role="alert"')
    expect(html).toContain('data-slot="alert-title"')
    expect(html).not.toContain('data-goop="')
  })

  it('kbd renders shadcn markup', async () => {
    const { GoopKbd, GoopKbdGroup } = await import('../src')
    const html = await renderToString(createSSRApp({ render: () => h(GoopKbdGroup, null, () => [h(GoopKbd, { keys: ['Meta', 'K'] }, () => '⌘'), h(GoopKbd, null, () => 'K')]) }))
    expect(html).toContain('<kbd data-slot="kbd-group"')
    expect(html).toContain('data-slot="kbd"')
    expect(html).not.toContain('data-goop-pressed')
  })

  it('breadcrumb renders shadcn markup with no blob', async () => {
    const { GoopBreadcrumb, GoopBreadcrumbList, GoopBreadcrumbItem, GoopBreadcrumbLink, GoopBreadcrumbSeparator, GoopBreadcrumbPage } = await import('../src')
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(GoopBreadcrumb, null, () =>
            h(GoopBreadcrumbList, null, () => [
              h(GoopBreadcrumbItem, null, () => h(GoopBreadcrumbLink, { href: '/' }, () => 'Home')),
              h(GoopBreadcrumbSeparator),
              h(GoopBreadcrumbItem, null, () => h(GoopBreadcrumbPage, null, () => 'Here')),
            ]),
          ),
      }),
    )
    expect(html).toContain('<nav aria-label="breadcrumb" data-slot="breadcrumb"')
    expect(html).toContain('<ol data-slot="breadcrumb-list"')
    expect(html).toContain('aria-current="page"')
    expect(html).not.toContain('data-goop="highlight"')
  })

  it('button group renders shadcn markup, buttons plain', async () => {
    const { GoopButtonGroup, GoopButton, GoopButtonGroupSeparator } = await import('../src')
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(GoopButtonGroup, null, () => [h(GoopButton, { variant: 'outline' }, () => 'A'), h(GoopButtonGroupSeparator), h(GoopButton, { variant: 'outline' }, () => 'B')]),
      }),
    )
    expect(html).toContain('role="group" data-slot="button-group"')
    expect(html).toContain('data-slot="button-group-separator"')
    expect(html).not.toContain('data-goop-host="stroke"')
    expect(html).not.toContain('style="transform')
  })
})
