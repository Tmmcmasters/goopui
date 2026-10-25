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

// ---- oil finish (thin-film iridescence) ---------------------------------------------
//
// Same goo pipeline, plus a sheen: a band image (repeating thin-film palette, rendered once
// from a data: URI SVG gradient) is slid along its band direction (flow), bent by the
// blurred goo alpha with feDisplacementMap (so bands follow the contours of the body, necks
// and drops like a real film does), clipped to the goo shape, and blended over the base
// color (screen on dark bases, multiply on light ones). Unlike plain goo filters these are
// per element (their flow state is per element), so they are not shared.

export interface OilFinishParams {
  /** 0..1 strength of the sheen. */
  intensity: number
  /** Band size in px (one color cycle). */
  scale: number
  /** True when the base color is dark (blend with screen), false for light (multiply). */
  dark: boolean
}

export interface OilFilter {
  readonly id: string
  /** Layer size in px (the filtered element), so the band image covers it. */
  setBox(width: number, height: number): void
  /** Slide the bands `phase` px along their direction; `swirl` (0..~2) bends them harder;
   *  (ox, oy) moves the whole film with the goo body. */
  setFlow(phase: number, swirl: number, ox?: number, oy?: number): void
  setFinish(p: OilFinishParams): void
  release(): void
}

/** Thin-film palette as [offset, color] stops (cycled with reflect). Black stops are gaps:
 *  under the screen blend they leave the base untouched, so the film reads as thin colored
 *  fringes over a dark, rich base instead of a full rainbow. */
export const OIL_PALETTE: readonly (readonly [number, string])[] = [
  [0, '#000000'],
  [0.12, '#7d2a5e'],
  [0.26, '#8f6f2a'],
  [0.38, '#000000'],
  [0.55, '#25704f'],
  [0.68, '#1f6a82'],
  [0.8, '#463087'],
  [1, '#000000'],
]
/** Band direction (deg). */
const OIL_ANGLE = 22

let oilSeq = 0

function oilImage(w: number, h: number, scale: number): string {
  const a = (OIL_ANGLE * Math.PI) / 180
  const L = Math.max(4, scale)
  const stops = OIL_PALETTE.map(([o, c]) => '<stop offset="' + o + '" stop-color="' + c + '"/>').join('')
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="0" y1="0" ' +
    'x2="' + (Math.cos(a) * L).toFixed(2) + '" y2="' + (Math.sin(a) * L).toFixed(2) + '">' + stops +
    '</linearGradient>' +
    // Bake a soft fractal warp into the band image once (static, decoded once), so the film
    // reads as swirled oil instead of straight stripes. No per-frame turbulence cost.
    '<filter id="w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" ' +
    'baseFrequency="' + (0.35 / L).toFixed(4) + ' ' + (0.6 / L).toFixed(4) + '" numOctaves="2" seed="7"/>' +
    '<feDisplacementMap in="SourceGraphic" scale="' + (L * 1.6).toFixed(1) + '" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter></defs><rect width="100%" height="100%" fill="url(#g)" filter="url(#w)"/></svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

/** Create a per-element oil filter in `doc` (released with `release()`). */
export function createOilFilter(doc: Document, params: GooFilterParams, finish: OilFinishParams): OilFilter {
  const p = normalize(params)
  const id = 'goop-oil-' + ++oilSeq
  const reg = getRegistry(doc)
  const el = (tag: string, attrs: Record<string, string>): Element => {
    const node = doc.createElementNS(SVG_NS, tag)
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
    return node
  }
  const r = GOO_FILTER_REGION
  const filter = el('filter', {
    id,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    'color-interpolation-filters': 'sRGB',
  }) as SVGFilterElement
  const image = el('feImage', { result: 'film', preserveAspectRatio: 'none' })
  const offset = el('feOffset', { in: 'film', dx: '0', dy: '0', result: 'flow' })
  const disp = el('feDisplacementMap', {
    in: 'flow',
    in2: 'blur',
    scale: '10',
    xChannelSelector: 'A',
    yChannelSelector: 'A',
    result: 'bent',
  })
  const strength = el('feColorMatrix', { in: 'sheen', type: 'matrix', result: 'sheenA' })
  const blend = el('feBlend', { in: 'sheenA', in2: 'base', mode: 'screen' })
  filter.append(
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: String(p.blur), result: 'blur' }),
    el('feColorMatrix', { in: 'blur', mode: 'matrix', values: gooColorMatrix(p), result: 'goo' }),
    el('feComposite', { in: 'SourceGraphic', in2: 'goo', operator: 'atop', result: 'base' }),
    image,
    offset,
    disp,
    el('feComposite', { in: 'bent', in2: 'goo', operator: 'in', result: 'sheen' }),
    strength,
    blend,
  )
  reg.defs.append(filter)
  reg.filters.set(id, { count: 1, el: filter })

  let box = { w: 0, h: 0 }
  let rendered = false
  let fin = finish
  let period = 2 * Math.max(4, finish.scale)
  const ang = (OIL_ANGLE * Math.PI) / 180
  const dir = { x: Math.cos(ang), y: Math.sin(ang) }
  const renderImage = (): void => {
    // Oversize so sliding by up to one period (plus the baked warp) never shows an edge.
    const m = Math.ceil(period * 2.5)
    const w = Math.max(1, Math.ceil(box.w)) + m * 2
    const h = Math.max(1, Math.ceil(box.h)) + m * 2
    image.setAttribute('x', String(-m))
    image.setAttribute('y', String(-m))
    image.setAttribute('width', String(w))
    image.setAttribute('height', String(h))
    image.setAttribute('href', oilImage(w, h, fin.scale))
  }
  const applyFinish = (): void => {
    const k = Math.max(0, Math.min(1, fin.intensity))
    strength.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ' + k.toFixed(3) + ' 0')
    blend.setAttribute('mode', fin.dark ? 'screen' : 'multiply')
  }
  applyFinish()
  let last = ''
  return {
    id,
    setBox(w, h) {
      if (rendered && Math.abs(w - box.w) < 1 && Math.abs(h - box.h) < 1) return
      rendered = true
      box = { w, h }
      renderImage()
    },
    setFlow(phase, swirl, ox = 0, oy = 0) {
      // The baked warp makes the image non-periodic, so instead of wrapping (a visible jump)
      // the accumulated phase ping-pongs over +/- one period: always continuous.
      const span = period * 2
      const t = (((phase % (2 * span)) + 2 * span) % (2 * span)) / span
      const ph = (t < 1 ? t : 2 - t) * span - period
      const dx = (dir.x * ph + ox).toFixed(1)
      const dy = (dir.y * ph + oy).toFixed(1)
      const sc = (6 + Math.max(0, swirl) * 14).toFixed(1)
      const s = dx + '|' + dy + '|' + sc
      if (s === last) return
      last = s
      offset.setAttribute('dx', dx)
      offset.setAttribute('dy', dy)
      disp.setAttribute('scale', sc)
    },
    setFinish(next) {
      const rescale = next.scale !== fin.scale
      fin = next
      period = 2 * Math.max(4, next.scale)
      applyFinish()
      if (rescale && rendered) renderImage()
    },
    release() {
      if (!reg.filters.has(id)) return
      releaseGooFilter(doc, id)
    },
  }
}
