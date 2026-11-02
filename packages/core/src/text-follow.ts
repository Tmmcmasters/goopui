// Text that follows the goo's edge (flood-style fills: GoopToggle, GoopToggleGroup, the
// accordion / collapsible trigger row).
//
// A flood crosses a label over several frames, so flipping the label's color all at once (when
// the goo reaches its centre) leaves part of it the wrong color: light text on pale goo before
// the flip, dark text on the dark page after it. Instead, while an item has goo on it, an
// aria-hidden, inert copy of its content in the "on goo" color is stacked exactly over the real
// one and clipped (`clip-path: path(...)`) to the goo shape the engine draws, so the text is the
// on-goo color wherever the goo is and the normal color everywhere else. The real label keeps
// its normal color; screen readers only ever read it.
//
// The copy is a shallow twin of the item (same classes and data attributes, so the same padding,
// flex layout, wrapping and per-state styles such as a rotated chevron) holding deep clones of
// its children (minus goo parts), absolutely positioned over the item at its border box. A
// MutationObserver keeps it in step with the real item (attributes, text, children) in the same
// microtask, so CSS transitions on both start together.
//
// The clip is the union of the goo circles, each shrunk the way the goo filter shrinks it (a
// lone circle vanishes below `gooVanishRadius`), so the split sits on the goo's visible edge.
// No DOM access until `createTextCopy` / `textFollowSupported` is called (SSR-safe).

import type { GooCircle } from './liquid'
import { GOOP_PART_ATTR } from './renderer'

/** Set on every item of an engine whose text follows the goo: its real label keeps its normal
 *  color (the on-goo color comes from the clipped copy, up while goo is on the item). */
export const TEXT_FOLLOW_ATTR = 'data-goop-text-follow'
/** `data-goop` value of the copy. */
export const TEXT_COPY_PART = 'text'

/** Can this document clip an element to an arbitrary path (`clip-path: path()`)? */
export function textFollowSupported(doc: Document): boolean {
  const css = (doc.defaultView as (Window & { CSS?: { supports?: (p: string, v: string) => boolean } }) | null)?.CSS
  try {
    return !!css?.supports?.('clip-path', 'path("M0 0H1V1Z")')
  } catch {
    return false
  }
}

/** A box in the host's padding box. */
export interface TextBox {
  x: number
  y: number
  w: number
  h: number
}

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString()

/**
 * The goo's shape over `box` as a CSS `path()` string in the box's own coordinates: the union
 * (nonzero) of every circle that reaches the box, each shrunk to its visible size under the goo
 * filter (radius sqrt(r^2 - vanish^2): gone below `vanish`, ~r for big circles). Empty string
 * when no goo reaches the box. Pure.
 */
export function gooClipPath(circles: readonly GooCircle[], box: TextBox, vanish = 0): string {
  let d = ''
  const v2 = vanish * vanish
  for (const c of circles) {
    if (!(c.r > 0)) continue
    const k = c.r * c.r > v2 ? Math.sqrt(c.r * c.r - v2) / c.r : 0
    if (!(k > 0)) continue
    const rx = c.r * k * (c.sx || 1)
    const ry = c.r * k * (c.sy || 1)
    if (rx < 0.05 || ry < 0.05) continue
    const x = c.x - box.x
    const y = c.y - box.y
    if (x + rx < 0 || y + ry < 0 || x - rx > box.w || y - ry > box.h) continue
    // Two half arcs, same winding for every circle: nonzero fill = the union.
    d += `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`
  }
  return d
}

/** Is a node part of goopUI's own decoration (goo layers, text copies)? */
const isGoopPart = (n: Node): boolean => n.nodeType === 1 && (n as Element).hasAttribute(GOOP_PART_ATTR)

/** Attributes of the item the copy carries (styling hooks), never ids, ARIA or form state. */
const copyable = (name: string): boolean =>
  name === 'class' || name === 'style' || name === 'dir' || name === 'lang' || (name.startsWith('data-') && !name.startsWith('data-goop'))

// Inline overrides on the copy: an invisible, inert box over the item; only its glyphs show.
const COPY_CSS: [string, string][] = [
  ['position', 'absolute'],
  ['margin', '0'],
  ['box-sizing', 'border-box'],
  ['pointer-events', 'none'],
  ['user-select', 'none'],
  ['-webkit-user-select', 'none'],
  ['background', 'none'],
  ['border-color', 'transparent'],
  ['box-shadow', 'none'],
  ['outline', 'none'],
  ['transition', 'none'],
  ['animation', 'none'],
  ['transform', 'none'],
  ['translate', 'none'],
  ['rotate', 'none'],
  ['scale', 'none'],
  ['filter', 'none'],
  ['opacity', '1'],
  ['isolation', 'auto'],
  ['min-width', '0'],
  ['min-height', '0'],
  ['max-width', 'none'],
  ['max-height', 'none'],
  ['z-index', '2147483000'],
]

// Properties a CSS transition on the real content may be animating when the copy appears.
const MOTION_PROPS = ['transform', 'rotate', 'translate', 'scale', 'opacity'] as const

export interface TextCopy {
  readonly el: HTMLElement
  /** Place the copy over the item (its border box, in the parent's padding box). */
  place(box: TextBox): void
  /** Clip to the goo (`gooClipPath` output, in the copy's own coordinates). */
  clip(path: string): void
  destroy(): void
}

/**
 * An aria-hidden, inert copy of `item`'s content in `color`, appended to `parent` (the item
 * itself, or a positioned ancestor). Call `place` and `clip` before it is first painted.
 */
export function createTextCopy(item: HTMLElement, parent: HTMLElement, color: string): TextCopy {
  const doc = item.ownerDocument
  const win = doc.defaultView
  const el = doc.createElement('span')
  let placed = ''
  let clipped: string | null = null
  let destroyed = false

  const paint = (): void => {
    for (const [p, v] of COPY_CSS) el.style.setProperty(p, v, 'important')
    el.style.setProperty('color', color, 'important')
    el.style.setProperty('clip-path', clipped ? `path("${clipped}")` : 'inset(50%)', 'important')
    if (placed) {
      const [x, y, w, h] = placed.split(',')
      el.style.setProperty('left', `${x}px`, 'important')
      el.style.setProperty('top', `${y}px`, 'important')
      el.style.setProperty('width', `${w}px`, 'important')
      el.style.setProperty('height', `${h}px`, 'important')
    }
  }

  const syncAttrs = (): void => {
    for (const a of Array.from(el.attributes)) {
      if (copyable(a.name) && !item.hasAttribute(a.name)) el.removeAttribute(a.name)
    }
    for (const a of Array.from(item.attributes)) {
      if (copyable(a.name) && el.getAttribute(a.name) !== a.value) el.setAttribute(a.name, a.value)
    }
    el.setAttribute(GOOP_PART_ATTR, TEXT_COPY_PART)
    el.setAttribute('aria-hidden', 'true')
    el.setAttribute('inert', '')
    paint()
  }

  /** Re-clone the item's content (minus goo parts) and match any transition in progress. */
  const syncContent = (): void => {
    const pairs: [Element, Element][] = []
    const kids: Node[] = []
    for (const n of Array.from(item.childNodes)) {
      if (isGoopPart(n) || n === el) continue
      const c = n.cloneNode(true)
      kids.push(c)
      if (n.nodeType === 1) pairs.push([n as Element, c as Element])
    }
    el.replaceChildren(...kids)
    const walk = (a: Element, b: Element): void => {
      b.removeAttribute('id')
      b.removeAttribute('tabindex')
      ;(b as HTMLElement).style?.setProperty('color', color, 'important')
      const ak = a.children
      const bk = b.children
      for (let i = 0; i < ak.length && i < bk.length; i++) walk(ak[i]!, bk[i]!)
    }
    for (const [a, b] of pairs) walk(a, b)
    // A transition running on the real content (e.g. the chevron rotating as the row opens)
    // starts the copy from the same point, so both finish together.
    if (!el.isConnected || !win?.getComputedStyle) return
    const match = (a: Element, b: Element): void => {
      const ca = win.getComputedStyle(a)
      if (ca.transitionDuration && ca.transitionDuration.split(',').some((d) => Number.parseFloat(d) > 0)) {
        const cb = win.getComputedStyle(b)
        const diff = MOTION_PROPS.filter((p) => ca.getPropertyValue(p) !== cb.getPropertyValue(p))
        if (diff.length) {
          const s = (b as HTMLElement).style
          s.setProperty('transition', 'none', 'important')
          for (const p of diff) s.setProperty(p, ca.getPropertyValue(p), 'important')
          void win.getComputedStyle(b).getPropertyValue(diff[0]!)
          s.removeProperty('transition')
          for (const p of diff) s.removeProperty(p)
        }
      }
      const ak = a.children
      const bk = b.children
      for (let i = 0; i < ak.length && i < bk.length; i++) match(ak[i]!, bk[i]!)
    }
    for (const [a, b] of pairs) match(a, b)
  }

  /** Hover underline etc. on the real item: text decoration doesn't reach a positioned copy. */
  const syncDeco = (): void => {
    if (destroyed || !win?.getComputedStyle) return
    const line = win.getComputedStyle(item).textDecorationLine
    if (line && line !== 'none') el.style.setProperty('text-decoration-line', line)
    else el.style.removeProperty('text-decoration-line')
  }
  let raf = 0
  const onHover = (): void => {
    if (!win?.requestAnimationFrame || raf) return
    raf = win.requestAnimationFrame(() => {
      raf = 0
      syncDeco()
    })
  }

  syncAttrs()
  parent.append(el)
  syncContent()
  syncDeco()

  // Keep the copy in step with the real item (same microtask as the change, so transitions on
  // both start in the same frame).
  const MO = win?.MutationObserver
  const mo = MO
    ? new MO((records) => {
        if (destroyed) return
        let attrs = false
        let content = false
        for (const r of records) {
          const t = r.target
          if (t === el || el.contains(t)) continue
          if (r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].every((n) => n === el || isGoopPart(n))) continue
          let goo = false
          for (let n: Node | null = t; n && n !== item; n = n.parentNode) if (isGoopPart(n)) goo = true
          if (goo) continue
          if (t === item && r.type === 'attributes') attrs = true
          else content = true
        }
        if (attrs) syncAttrs()
        if (content) syncContent()
        if (attrs || content) syncDeco()
      })
    : undefined
  mo?.observe(item, { attributes: true, childList: true, characterData: true, subtree: true })
  item.addEventListener('pointerenter', onHover)
  item.addEventListener('pointerleave', onHover)

  return {
    el,
    place(box) {
      const key = [box.x, box.y, box.w, box.h].map(f1).join(',')
      if (key === placed) return
      placed = key
      paint()
    },
    clip(path) {
      if (path === clipped) return
      clipped = path
      el.style.setProperty('clip-path', path ? `path("${path}")` : 'inset(50%)', 'important')
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      mo?.disconnect()
      item.removeEventListener('pointerenter', onHover)
      item.removeEventListener('pointerleave', onHover)
      if (raf) win?.cancelAnimationFrame(raf)
      el.remove()
    },
  }
}
