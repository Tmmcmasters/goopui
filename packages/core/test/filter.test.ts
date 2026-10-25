import { afterEach, describe, expect, it } from 'vitest'
import {
  GOO_DEFS_ATTR,
  acquireGooFilter,
  gooColorMatrix,
  gooFilterId,
  gooFilterMarkup,
  gooFilterRefCount,
} from '../src'

const A = { blur: 4, contrast: 20, threshold: 0.4 }
const B = { blur: 6.5, contrast: 18, threshold: 0.35 }
const defsSvg = () => document.querySelectorAll(`svg[${GOO_DEFS_ATTR}]`)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('goo filter markup', () => {
  it('builds blur -> alpha contrast -> composite atop source', () => {
    const m = gooFilterMarkup(A)
    expect(m).toContain(`id="${gooFilterId(A)}"`)
    expect(m).toContain('<feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>')
    expect(m).toContain(`values="${gooColorMatrix(A)}"`)
    expect(m).toContain('<feComposite in="SourceGraphic" in2="goo" operator="atop"/>')
    expect(m).toContain('color-interpolation-filters="sRGB"')
    // padded region so blur/drips are never clipped at the region edge
    expect(m).toMatch(/x="-\d+%" y="-\d+%" width="1\d\d%" height="1\d\d%"/)
  })

  it('alpha row is contrast * a - contrast * threshold', () => {
    expect(gooColorMatrix(A).trim().endsWith('0 0 0 20 -8')).toBe(true)
  })

  it('ids are deterministic, CSS-safe, and unique per param set', () => {
    expect(gooFilterId(A)).toBe(gooFilterId({ ...A }))
    expect(gooFilterId(A)).not.toBe(gooFilterId(B))
    expect(gooFilterId(B)).toMatch(/^[a-zA-Z][\w-]*$/)
  })
})

describe('filter injection + ref counting', () => {
  it('injects one hidden svg per document and ref-counts each filter', () => {
    const a1 = acquireGooFilter(document, A)
    const a2 = acquireGooFilter(document, A)
    const b1 = acquireGooFilter(document, B)
    expect(defsSvg()).toHaveLength(1)
    const svg = defsSvg()[0]!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelectorAll('filter')).toHaveLength(2)
    const f = document.getElementById(a1.id)
    expect(f?.tagName.toLowerCase()).toBe('filter')
    expect(f?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation')).toBe('4')
    expect(f?.querySelector('feComposite')?.getAttribute('operator')).toBe('atop')
    expect(gooFilterRefCount(document, a1.id)).toBe(2)

    a1.release()
    a1.release() // idempotent
    expect(gooFilterRefCount(document, a1.id)).toBe(1)
    expect(document.getElementById(a1.id)).not.toBeNull()

    a2.release()
    expect(document.getElementById(a1.id)).toBeNull()
    expect(defsSvg()).toHaveLength(1) // B still in use

    b1.release()
    expect(defsSvg()).toHaveLength(0)
  })

  it('re-creates the svg after it was removed', () => {
    const a = acquireGooFilter(document, A)
    a.release()
    const again = acquireGooFilter(document, A)
    expect(defsSvg()).toHaveLength(1)
    expect(document.getElementById(again.id)).not.toBeNull()
    again.release()
    expect(defsSvg()).toHaveLength(0)
  })
})
