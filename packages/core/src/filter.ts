// Goo SVG filter factory.
//
// One hidden <svg> per document holds every goo <filter>. Each distinct parameter set gets
// its own id and is ref-counted: the <filter> is removed when its last user releases it,
// and the <svg> itself is removed when it holds no filters. Nothing here touches
// `document`/`window` until a function is called with a Document (SSR-safe imports).

const SVG_NS = 'http://www.w3.org/2000/svg'

export interface GooFilterParams {
  /** feGaussianBlur stdDeviation (px). */
  blur: number
  /** Alpha multiplier in the feColorMatrix. */
  contrast: number
  /** Alpha level (0..1) that becomes the goo edge. */
  threshold: number
}

/**
 * Filter region, as fractions of the filtered element's box. The goo layer is already
 * padded around the host (so drips below it are inside the box); this extra margin just
 * guarantees the blur never gets clipped at the region edge.
 */
export const GOO_FILTER_REGION = Object.freeze({ x: '-20%', y: '-20%', width: '140%', height: '140%' })

const round = (n: number, d = 2): number => {
  const p = 10 ** d
  return Math.round(n * p) / p
}

function normalize(p: GooFilterParams): GooFilterParams {
  return { blur: round(Math.max(0, p.blur)), contrast: round(Math.max(0, p.contrast)), threshold: round(p.threshold, 3) }
}

const idPart = (n: number): string => String(n).replace('-', 'm').replace('.', '_')

/** Deterministic, CSS-safe id for a parameter set. Same params -> same id. */
export function gooFilterId(params: GooFilterParams): string {
  const p = normalize(params)
  return `goop-goo-b${idPart(p.blur)}-c${idPart(p.contrast)}-t${idPart(p.threshold)}`
}

/** The feColorMatrix `values` string: keep RGB, alpha' = contrast * alpha - contrast * threshold. */
export function gooColorMatrix(params: GooFilterParams): string {
  const p = normalize(params)
  const offset = round(-p.contrast * p.threshold, 3)
  return `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${p.contrast} ${offset}`
}

/**
 * Radius (px) below which a lone circle disappears under the goo filter.
 * A disc of radius r blurred by sigma has center alpha 1 - exp(-r^2 / (2 sigma^2)); it is
 * visible while that clears the edge level (threshold + 0.5 / contrast). Near this radius the
 * visible size collapses very steeply, so free-floating circles must approach it gently
 * (see DripField) or they "pop" out instead of shrinking away.
 */
export function gooVanishRadius(params: GooFilterParams): number {
  const p = normalize(params)
  if (p.blur <= 0) return 0
  const edge = Math.min(0.999, p.threshold + (p.contrast > 0 ? 0.5 / p.contrast : 0))
  return p.blur * Math.sqrt(-2 * Math.log(1 - edge))
}

/**
 * Pure markup for one goo filter (useful for SSR output or snapshot tests).
 * Pipeline: blur the source -> crush alpha to a hard-ish edge (the "goo") -> draw the
 * original pixels atop that shape so color/gradients come from the source, not the blur.
 */
export function gooFilterMarkup(params: GooFilterParams, id: string = gooFilterId(params)): string {
  const p = normalize(params)
  const r = GOO_FILTER_REGION
  return (
    `<filter id="${id}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${p.blur}" result="blur"/>` +
    `<feColorMatrix in="blur" mode="matrix" values="${gooColorMatrix(p)}" result="goo"/>` +
    `<feComposite in="SourceGraphic" in2="goo" operator="atop"/>` +
    `</filter>`
  )
}

function buildFilterElement(doc: Document, id: string, params: GooFilterParams): SVGFilterElement {
  const p = normalize(params)
  const r = GOO_FILTER_REGION
  const el = (tag: string, attrs: Record<string, string>): Element => {
    const node = doc.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    return node
  }
  const filter = el('filter', {
    id,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    'color-interpolation-filters': 'sRGB',
  }) as SVGFilterElement
  filter.append(
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: String(p.blur), result: 'blur' }),
    el('feColorMatrix', { in: 'blur', mode: 'matrix', values: gooColorMatrix(p), result: 'goo' }),
    el('feComposite', { in: 'SourceGraphic', in2: 'goo', operator: 'atop' }),
  )
  return filter
}

interface FilterEntry {
  count: number
  el: SVGFilterElement
}
interface DocRegistry {
  svg: SVGSVGElement
  defs: SVGDefsElement
  filters: Map<string, FilterEntry>
}

const registries = new WeakMap<Document, DocRegistry>()

/** Attribute on the shared hidden <svg>, handy for finding it in devtools/tests. */
export const GOO_DEFS_ATTR = 'data-goop-defs'

function getRegistry(doc: Document): DocRegistry {
  let reg = registries.get(doc)
  if (reg && reg.svg.isConnected) return reg
  const svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.setAttribute(GOO_DEFS_ATTR, '')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  // Not display:none: some engines drop filters defined inside a display:none subtree.
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;')
  const defs = doc.createElementNS(SVG_NS, 'defs') as SVGDefsElement
  svg.append(defs)
  ;(doc.body ?? doc.documentElement).append(svg)
  // If an old registry's svg was ripped out of the DOM (e.g. a framework replaced <body>),
  // re-home its filters into the new svg so existing users keep working.
  const filters = reg?.filters ?? new Map<string, FilterEntry>()
  for (const entry of filters.values()) defs.append(entry.el)
  reg = { svg, defs, filters }
  registries.set(doc, reg)
  return reg
}

export interface GooFilterLease {
  /** The filter element id; use as `filter: url(#id)`. */
  readonly id: string
  /** Drop this reference. Idempotent. */
  release(): void
}

/** Get (or create) the goo filter for `params` in `doc` and take a reference on it. */
export function acquireGooFilter(doc: Document, params: GooFilterParams): GooFilterLease {
  const id = gooFilterId(params)
  const reg = getRegistry(doc)
  let entry = reg.filters.get(id)
  if (!entry) {
    entry = { count: 0, el: buildFilterElement(doc, id, params) }
    reg.filters.set(id, entry)
    reg.defs.append(entry.el)
  }
  entry.count++
  let released = false
  return {
    id,
    release() {
      if (released) return
      released = true
      releaseGooFilter(doc, id)
    },
  }
}

function releaseGooFilter(doc: Document, id: string): void {
  const reg = registries.get(doc)
  const entry = reg?.filters.get(id)
  if (!reg || !entry) return
  entry.count--
  if (entry.count > 0) return
  entry.el.remove()
  reg.filters.delete(id)
  if (reg.filters.size === 0) {
    reg.svg.remove()
    registries.delete(doc)
  }
}

/** For tests / devtools: current ref count of a filter id in `doc` (0 if absent). */
export function gooFilterRefCount(doc: Document, id: string): number {
  return registries.get(doc)?.filters.get(id)?.count ?? 0
}
