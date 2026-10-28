// Surface color for emerging panels (popover, dropdown): which color the goo panel, bridge and
// burst drops paint with, and which color the panel's content text uses.
//
// The rule ('trigger', the default): the emerged surface is ONE color, the trigger's visible
// background, and the content text is the trigger's text color. So a black button gives a
// black panel with white text, a secondary button a secondary panel, and so on.
//   - The trigger's background is what the user sees: a goop host (`data-goop-host`) paints
//     with `--goop-color` at `--goop-opacity` ('fill'), or is an outline / ghost / link with
//     no fill of its own ('stroke' / 'hover' / 'none': counted as transparent, whatever its
//     hover / expanded tint is at the moment); any other element uses its computed
//     `background-color`. Translucent backgrounds are composited over the page backdrop (goo
//     can't paint translucent color).
//   - Fallback: when that background is (nearly) transparent, or (nearly) the page backdrop
//     itself (ghost / outline / link buttons, plain text triggers), there is no trigger color
//     to borrow, and the panel would vanish into the page. Then the panel uses the theme's
//     `--primary` / `--primary-foreground`, and failing those, the trigger's text color on
//     the page backdrop color (inverted, still readable).
// 'popover' keeps the panel's own CSS (shadcn's popover tokens); any other string is a CSS
// color used as-is, with black or white text picked by luminance.

/** A resolved surface: goo / panel background and content text color (CSS colors). */
export interface EmergeSurfaceColors {
  background: string
  foreground: string
}

/** 'trigger' (default): the anchor's background. 'popover': the panel's own CSS. A CSS color
 *  string, a resolved pair, or a getter (e.g. a submenu borrowing its parent's colors;
 *  returning null means 'popover'). */
export type EmergeSurfaceColor =
  | 'trigger'
  | 'popover'
  | (string & {})
  | EmergeSurfaceColors
  | (() => EmergeSurfaceColors | null | undefined)

/** CSS custom properties published on the host when a surface color applies. */
export const EMERGE_SURFACE_VAR = '--goop-surface'
export const EMERGE_SURFACE_FOREGROUND_VAR = '--goop-surface-foreground'
/** Attribute on the host while `--goop-surface*` are set (goop.css retints the tokens). */
export const EMERGE_TINT_ATTR = 'data-goop-tint'

/** sRGB 0..255 channels, alpha 0..1. */
export type Rgba = [number, number, number, number]

/** Below this alpha a background counts as transparent. */
const CLEAR_ALPHA = 0.05
/** RGB distance (0..441) under which a background counts as the page backdrop. */
const SAME_AS_PAGE = 6

const num = (s: string | undefined, pct = 1): number => {
  if (!s || s === 'none') return 0
  const v = parseFloat(s)
  return s.endsWith('%') ? (v / 100) * pct : v
}
const alphaOf = (s: string | undefined): number => (s === undefined ? 1 : Math.min(1, Math.max(0, num(s, 1))))
const clamp255 = (v: number): number => Math.min(255, Math.max(0, v))
const gamma = (x: number): number => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    clamp255(gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp255(gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp255(gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ]
}

/** Parse a CSS color as browsers serialize computed colors (rgb/rgba, hex, oklch, oklab,
 *  color(srgb ...), transparent). Null for anything else (names, var(), color-mix...). */
export function parseCssColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase()
  if (s === 'transparent') return [0, 0, 0, 0]
  if (s.startsWith('#')) {
    const h = s.slice(1)
    if (!/^[0-9a-f]+$/.test(h)) return null
    const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h
    if (full.length !== 6 && full.length !== 8) return null
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16)
    return [n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1]
  }
  const m = /^([a-z]+)\((.*)\)$/.exec(s)
  if (!m) return null
  const fn = m[1]!
  let body = m[2]!
  let space = ''
  if (fn === 'color') {
    const sp = /^\s*([a-z-]+)\s+(.*)$/.exec(body)
    if (!sp) return null
    space = sp[1]!
    body = sp[2]!
  }
  const [main, alphaPart] = body.split('/').map((p) => p.trim())
  const parts = main!.split(/[\s,]+/).filter(Boolean)
  const commaAlpha = parts.length === 4 ? parts[3] : undefined
  const alpha = alphaOf(alphaPart ?? commaAlpha)
  if (parts.length < 3) return null
  switch (fn) {
    case 'rgb':
    case 'rgba':
      return [clamp255(num(parts[0], 255)), clamp255(num(parts[1], 255)), clamp255(num(parts[2], 255)), alpha]
    case 'oklab':
      return [...oklabToRgb(num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)), alpha]
    case 'oklch': {
      const L = num(parts[0], 1)
      const C = num(parts[1], 0.4)
      const H = (num(parts[2]) * Math.PI) / 180
      return [...oklabToRgb(L, C * Math.cos(H), C * Math.sin(H)), alpha]
    }
    case 'color':
      if (space !== 'srgb') return null
      return [clamp255(num(parts[0], 1) * 255), clamp255(num(parts[1], 1) * 255), clamp255(num(parts[2], 1) * 255), alpha]
    default:
      return null
  }
}

/** Resolve any CSS color (var(), names, color-mix...) to sRGB via a probe element's computed
 *  `color`, then a canvas pixel. Null when it can't be resolved. */
export function resolveCssColor(value: string, probe?: Element | null): Rgba | null {
  const direct = parseCssColor(value)
  if (direct || !value.trim()) return direct
  const doc = probe?.ownerDocument
  const win = doc?.defaultView
  if (doc && win && probe) {
    const span = doc.createElement('span')
    span.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;'
    span.style.color = value
    probe.appendChild(span)
    const computed = win.getComputedStyle(span).color
    span.remove()
    const parsed = computed ? parseCssColor(computed) : null
    if (parsed) return parsed
    try {
      const ctx = doc.createElement('canvas').getContext('2d', { willReadFrequently: true })
      if (ctx && computed) {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = computed
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        return [d[0]!, d[1]!, d[2]!, d[3]! / 255]
      }
    } catch {
      // no canvas (tests, locked-down contexts)
    }
  }
  return null
}

/** `top` composited over an opaque `bottom`. */
export function compositeColor(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3]
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1]
}

const dist = (a: Rgba, b: Rgba): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const css = (c: Rgba): string => `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`
/** Relative luminance (0..1). */
const luminance = (c: Rgba): number => {
  const lin = (v: number) => {
    const x = v / 255
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
}
/** Black or white text, whichever reads better on `bg`. */
const readableOn = (bg: Rgba): string => (luminance(bg) > 0.18 ? 'rgb(10 10 10)' : 'rgb(255 255 255)')

const WHITE: Rgba = [255, 255, 255, 1]

/** The opaque color behind `el`: the nearest ancestor with a (mostly) opaque background,
 *  translucent ancestors composited on top; white when nothing paints. */
export function pageBackdrop(el: Element): Rgba {
  const win = el.ownerDocument?.defaultView
  const layers: Rgba[] = []
  let base: Rgba = WHITE
  for (let p = el.parentElement; p && win; p = p.parentElement) {
    const c = parseCssColor(win.getComputedStyle(p).backgroundColor || 'transparent')
    if (!c || c[3] < CLEAR_ALPHA) continue
    if (c[3] >= 0.999) {
      base = c
      break
    }
    layers.push(c)
  }
  for (let i = layers.length - 1; i >= 0; i--) base = compositeColor(layers[i]!, base)
  return base
}

/** The background the user sees on `el` (may be translucent), per the rule at the top. */
function visibleBackground(el: Element): Rgba | null {
  const win = el.ownerDocument?.defaultView
  const cs = win?.getComputedStyle(el)
  if (!cs) return null
  const style = el.getAttribute('data-goop-host')
  if (style === 'hover' || style === 'none' || style === 'stroke') return [0, 0, 0, 0]
  if (style !== null) {
    const color = resolveCssColor(cs.getPropertyValue('--goop-color').trim(), el)
    if (!color) return null
    const op = parseFloat(cs.getPropertyValue('--goop-opacity'))
    return [color[0], color[1], color[2], color[3] * (Number.isFinite(op) ? Math.min(1, Math.max(0, op)) : 1)]
  }
  return parseCssColor(cs.backgroundColor || 'transparent') ?? resolveCssColor(cs.backgroundColor, el)
}

/**
 * Resolve the panel's surface colors. `trigger` is what the panel emerges from; `host` (the
 * panel) is where theme tokens (`--primary`) and the probe live. Null: keep the panel's CSS.
 */
export function resolveSurfaceColors(
  mode: EmergeSurfaceColor | undefined,
  trigger: Element | null | undefined,
  host: Element,
): EmergeSurfaceColors | null {
  const m = mode ?? 'trigger'
  if (typeof m === 'function') return m() ?? null
  if (typeof m === 'object') return m
  if (m === 'popover') return null
  const win = host.ownerDocument?.defaultView
  if (m !== 'trigger') {
    const c = resolveCssColor(m, host)
    return { background: m, foreground: c ? readableOn(compositeColor(c, WHITE)) : 'rgb(10 10 10)' }
  }
  if (!trigger || !win) return null
  const page = pageBackdrop(trigger)
  const bg = visibleBackground(trigger)
  const tcs = win.getComputedStyle(trigger)
  const text = parseCssColor(tcs.color || '') ?? resolveCssColor(tcs.color || '', trigger)
  if (bg && bg[3] >= CLEAR_ALPHA) {
    const solid = compositeColor(bg, page)
    if (dist(solid, page) >= SAME_AS_PAGE) {
      return { background: css(solid), foreground: text ? css(compositeColor(text, solid)) : readableOn(solid) }
    }
  }
  // Fallback: the theme's primary pair, then the trigger's text color on the page color.
  const hcs = win.getComputedStyle(host)
  const primary = hcs.getPropertyValue('--primary').trim()
  const primaryFg = hcs.getPropertyValue('--primary-foreground').trim()
  const p = primary ? resolveCssColor(primary, host) : null
  if (p) {
    const solid = compositeColor(p, page)
    const fg = primaryFg ? resolveCssColor(primaryFg, host) : null
    return { background: css(solid), foreground: fg ? css(compositeColor(fg, solid)) : readableOn(solid) }
  }
  if (text) {
    const solid = compositeColor(text, page)
    if (dist(solid, page) >= SAME_AS_PAGE) return { background: css(solid), foreground: css(page) }
  }
  return null
}
