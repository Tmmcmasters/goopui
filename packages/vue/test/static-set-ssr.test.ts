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
