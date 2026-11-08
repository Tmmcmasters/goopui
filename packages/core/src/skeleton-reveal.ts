// Skeleton goo group + reveal: a group of skeleton blocks pools into one soft body of goo
// while it loads, then melts into the real content when it arrives.
//
// Loading (`pool()`): every skeleton block in the group is redrawn as a blob in one
// aria-hidden, goo-filtered layer over the host (the real blocks are hidden but keep the
// layout). A slow sheen flows through the whole group in the host's own space, so it passes
// from block to block like one wave: a low mound of lighter goo inside each blob (the same
// mound as the standalone shimmer) plus a faint, wide band of the blocks' own colour. The
// band alone is under the filter's edge level, so it never shows by itself; where it passes
// close neighbours it lifts the alpha between them over the edge and they bridge with goo,
// then part again. Each blob also breathes: a tiny scale wobble, out of phase per block.
// No script runs per frame while loading (Web Animations only).
//
// Reveal (`capture()` before the skeleton leaves the DOM, `reveal(content)` once the real
// content is in): each block is paired with the element replacing it by overlap (an avatar
// circle with the image, text bars with the text's line boxes, a button block with the
// button: see `revealTargets`). In top-to-bottom order with a small stagger, each blob's goo
// flows into its target's box and corner radius on a jelly spring (width leads, height
// follows), taking the target's fill colour when it has one (a button turns its own colour).
// Then it drains: it sags a little and its alpha falls, so under the filter its edge erodes
// inward and it pulls apart, while the target fades in beneath it. Blocks with no target
// drain in place. When the last blob is gone the layer and filter are removed.
//
// Rules kept: the layer is `inset: 0` with `overflow: hidden` and every blob is clamped
// inside the host, so the goo never changes the page's scroll size; only the filter's blur
// (ink overflow) reaches past the host edge, so it is never clipped by it. The skeleton and
// the content swap in place (the adapter keeps them in the same box), so nothing jumps.
// Reduced motion: no layer, no simulation; the content cross-fades in. `melt: false` does
// the same cross-fade with motion allowed. No DOM access until `attachSkeletonReveal` runs.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { acquireGooFilter, type GooFilterLease } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { clamp, smoothstep, springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'

/** Individually toggleable effects (boolean or multiplier). */
export const SKELETON_REVEAL_EFFECTS = ['sheen', 'breathe', 'melt'] as const
export type SkeletonRevealEffect = (typeof SKELETON_REVEAL_EFFECTS)[number]

export interface SkeletonRevealFeel {
  /** Goo filter blur (px). Small: blocks keep their shape and only near neighbours bridge. */
  blur: number
  /** Seconds for the sheen to flow through the group once (plus `sheenRest`). */
  sheenPeriod: number
  /** Fraction of the period the sheen rests off the group between passes. */
  sheenRest: number
  /** Peak alpha of the sheen's band (bridging). Must stay under the filter's edge (~0.53). */
  sheenBridge: number
  /** Brightness of the mound inside each blob, as a multiplier of the theme's shimmer base. */
  sheenLift: number
  /** Breathing: how far each edge swells out (px) at the peak, and the period (s). */
  breathe: number
  breathePeriod: number
  /** Reveal: delay between blocks (s), top to bottom. */
  stagger: number
  /** Morph spring (jelly): response (s) and damping ratio of the width; height lags. */
  response: number
  damping: number
  /** Pause on the target shape before draining (s). */
  hold: number
  /** Drain duration (s) and how far the goo sags while it drains (fraction of its height). */
  drain: number
  sag: number
  /** While a blob flows into its target it swells (px each side, a low raised-cosine pulse
   *  over the morph), so close neighbours run together for a moment and part again. */
  swell: number
}

export const SKELETON_REVEAL_FEEL: Readonly<Record<GoopPreset, Readonly<SkeletonRevealFeel>>> = Object.freeze({
  subtle: Object.freeze({
    blur: 2.6, sheenPeriod: 3.2, sheenRest: 0.25, sheenBridge: 0.3, sheenLift: 0.7, breathe: 0.5, breathePeriod: 3.8,
    stagger: 0.045, response: 0.46, damping: 0.82, hold: 0.06, drain: 0.42, sag: 0.12, swell: 1.8,
  }),
  playful: Object.freeze({
    blur: 3, sheenPeriod: 2.8, sheenRest: 0.25, sheenBridge: 0.38, sheenLift: 1, breathe: 0.8, breathePeriod: 3.2,
    stagger: 0.06, response: 0.44, damping: 0.64, hold: 0.08, drain: 0.46, sag: 0.18, swell: 2.8,
  }),
  wild: Object.freeze({
    blur: 3.6, sheenPeriod: 2.3, sheenRest: 0.2, sheenBridge: 0.45, sheenLift: 1.3, breathe: 1.3, breathePeriod: 2.7,
    stagger: 0.075, response: 0.42, damping: 0.5, hold: 0.1, drain: 0.5, sag: 0.26, swell: 4,
  }),
})

export interface SkeletonRevealOptions {
  /** The flowing sheen (and the goo bridges it makes). `false`: off; a number scales it. */
  sheen?: boolean | number
  /** The breathing wobble while loading. A number scales its size. */
  breathe?: boolean | number
  /** The melt into the content. `false`: a plain cross-fade. A number scales the jelly. */
  melt?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` forces the still skeleton and a cross-fade; 'auto' (default) follows the page. */
  reducedMotion?: boolean | 'auto'
}

/** A box in the host's padding-box space (px), with one corner radius. */
export interface RevealRect {
  x: number
  y: number
  w: number
  h: number
  r: number
}

/** The resolved feel for options: preset values with strengths and speed applied. */
export interface ResolvedSkeletonReveal extends SkeletonRevealFeel {
  sheenOn: boolean
  breatheOn: boolean
  meltOn: boolean
}

/** The edge level of the reveal filter (alpha a blob needs to show). */
export const SKELETON_REVEAL_GOO = Object.freeze({ contrast: 18, threshold: 0.5 })

/** Preset feel with the effect strengths and speed applied. Pure. */
export function resolveSkeletonReveal(options: SkeletonRevealOptions = {}): ResolvedSkeletonReveal {
  const base = SKELETON_REVEAL_FEEL[options.preset ?? GOOP_DEFAULT_PRESET] ?? SKELETON_REVEAL_FEEL[GOOP_DEFAULT_PRESET]
  const speed = options.speed && options.speed > 0 ? options.speed : 1
  const sheen = effectStrength(options.sheen)
  const breathe = effectStrength(options.breathe)
  const melt = effectStrength(options.melt)
  return {
    ...base,
    sheenPeriod: base.sheenPeriod / speed,
    // The band must stay under the edge level or it would show as a ghost bar by itself.
    sheenBridge: Math.min(0.5, base.sheenBridge * sheen),
    sheenLift: Math.min(2, base.sheenLift * sheen),
    breathe: base.breathe * breathe,
    breathePeriod: base.breathePeriod / speed,
    stagger: base.stagger / speed,
    response: base.response / speed,
    // A number above 1 loosens the jelly (more overshoot), below 1 firms it.
    damping: clamp(base.damping + (1 - Math.min(2, melt)) * 0.25, 0.35, 1),
    hold: base.hold / speed,
    drain: base.drain / speed,
    sag: base.sag * Math.min(2, melt),
    swell: base.swell * Math.min(2, melt),
    sheenOn: sheen > 0,
    breatheOn: breathe > 0,
    meltOn: melt > 0,
  }
}

const area = (r: RevealRect): number => Math.max(0, r.w) * Math.max(0, r.h)

/** Intersection over union of two boxes (0..1). */
export function rectOverlap(a: RevealRect, b: RevealRect): number {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const inter = ix * iy
  const union = area(a) + area(b) - inter
  return union > 0 ? inter / union : 0
}

/** How far (px) a block may be from a target it doesn't overlap and still flow into it. */
export const REVEAL_REACH = 56

function pairScore(a: RevealRect, b: RevealRect): number {
  const iou = rectOverlap(a, b)
  if (iou > 0) return 1 + iou
  const dx = a.x + a.w / 2 - (b.x + b.w / 2)
  const dy = a.y + a.h / 2 - (b.y + b.h / 2)
  const d = Math.hypot(dx, dy)
  return d < REVEAL_REACH ? 1 - d / REVEAL_REACH : 0
}

/**
 * Pair each skeleton block with the target that replaces it (index into `targets`, or -1).
 * Greedy by score (overlap first, then nearness within REVEAL_REACH), one block per target;
 * then a leftover block that overlaps an already-taken target well shares it (two bars that
 * melt into one paragraph). Pure.
 */
export function matchRevealTargets(blocks: readonly RevealRect[], targets: readonly RevealRect[]): number[] {
  const out = blocks.map(() => -1)
  const pairs: [number, number, number][] = []
  for (let i = 0; i < blocks.length; i++) {
    for (let j = 0; j < targets.length; j++) {
      const s = pairScore(blocks[i]!, targets[j]!)
      if (s > 0) pairs.push([s, i, j])
    }
  }
  pairs.sort((a, b) => b[0] - a[0] || a[1] - b[1] || a[2] - b[2])
  const taken = new Set<number>()
  for (const [, i, j] of pairs) {
    if (out[i] !== -1 || taken.has(j)) continue
    out[i] = j
    taken.add(j)
  }
  for (const [s, i, j] of pairs) {
    if (out[i] === -1 && s > 1.25) out[i] = j
  }
  return out
}

/** Reveal order: top to bottom, then left to right (rows within a few px count as one). */
export function revealOrder(blocks: readonly RevealRect[]): number[] {
  return blocks
    .map((b, i) => i)
    .sort((a, b) => {
      const A = blocks[a]!
      const B = blocks[b]!
      const dy = A.y + A.h / 2 - (B.y + B.h / 2)
      return Math.abs(dy) > 6 ? dy : A.x - B.x || a - b
    })
}

/** Timing of one blob's reveal (s from the start): morph, then drain. */
export interface RevealTiming {
  start: number
  drainStart: number
  end: number
}

/** Per-block timing for `count` blocks in reveal order. Pure. */
export function revealTimings(count: number, feel: SkeletonRevealFeel): RevealTiming[] {
  const morph = feel.response * 1.1
  return Array.from({ length: count }, (_, k) => {
    const start = k * feel.stagger
    const drainStart = start + morph + feel.hold
    return { start, drainStart, end: drainStart + feel.drain }
  })
}

/**
 * The goo blur for a group: the preset's, but never more than about a third of the thinnest
 * block, so small skeletons (a 6px bar) keep their shape instead of eroding. Pure.
 */
export function skeletonGooBlur(blur: number, blocks: readonly RevealRect[]): number {
  const thinnest = blocks.reduce((m, b) => Math.min(m, b.h, b.w), Infinity)
  const cap = Number.isFinite(thinnest) ? thinnest / 3.2 : blur
  return Math.round(clamp(Math.min(blur, cap), 1.2, Math.max(1.2, blur)) * 5) / 5
}

/** Radius (px) from a computed border radius, clamped to the box (`rounded-full` is huge). */
function radiusOf(cs: CSSStyleDeclaration, w: number, h: number): number {
  const raw = cs.borderTopLeftRadius || '0'
  const n = parseFloat(raw)
  const px = raw.trim().endsWith('%') ? (n / 100) * Math.min(w, h) : n
  return clamp(Number.isFinite(px) ? px : 0, 0, Math.min(w, h) / 2)
}

/** Elements that count as one reveal target as a whole (their text isn't split into lines). */
export const REVEAL_BOX_SELECTOR =
  'img,svg,video,canvas,picture,input,textarea,select,button,[role="img"],[data-goop-reveal],' +
  '[data-slot="avatar"],[data-slot="button"],[data-slot="badge"],[data-slot="switch"],[data-slot="checkbox"]'

/** A reveal target: its box, the element to fade in, and its fill (null: keep the goo's). */
export interface RevealTarget extends RevealRect {
  el: HTMLElement
  fill: string | null
}

const isOpaqueColor = (c: string): boolean =>
  !!c && c !== 'transparent' && !/rgba?\([^)]*,\s*0\s*\)$/.test(c) && !/\/\s*0\s*\)$/.test(c)

/**
 * Measure the reveal targets inside `content`, relative to `host`'s padding box: whole
 * elements matching REVEAL_BOX_SELECTOR (outermost only), and the line boxes of every other
 * piece of text (one per parent element per line, trimmed to the glyphs' height).
 */
export function revealTargets(host: HTMLElement, content: Element): RevealTarget[] {
  const view = host.ownerDocument.defaultView
  if (!view) return []
  const hr = host.getBoundingClientRect()
  const ox = hr.left + host.clientLeft
  const oy = hr.top + host.clientTop
  const out: RevealTarget[] = []
  const boxes: Element[] = []
  for (const el of Array.from(content.querySelectorAll(REVEAL_BOX_SELECTOR))) {
    if (boxes.some((b) => b.contains(el))) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    boxes.push(el)
    const cs = view.getComputedStyle(el)
    const target = (el instanceof view.HTMLElement ? el : el.parentElement) as HTMLElement | null
    if (!target) continue
    out.push({
      x: r.left - ox,
      y: r.top - oy,
      w: r.width,
      h: r.height,
      r: radiusOf(cs, r.width, r.height),
      el: target,
      fill: isOpaqueColor(cs.backgroundColor) ? cs.backgroundColor : null,
    })
  }
  const doc = host.ownerDocument
  const walker = doc.createTreeWalker(content, 4 /* NodeFilter.SHOW_TEXT */)
  const lines = new Map<HTMLElement, RevealRect[]>()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    const parent = node.parentElement
    if (!parent || boxes.some((b) => b.contains(node))) continue
    const range = doc.createRange()
    range.selectNodeContents(node)
    const list = lines.get(parent) ?? []
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 1 || r.height < 1) continue
      const rect = { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: 0 }
      const same = list.find((l) => Math.abs(l.y - rect.y) < 3)
      if (same) {
        const x1 = Math.max(same.x + same.w, rect.x + rect.w)
        same.x = Math.min(same.x, rect.x)
        same.w = x1 - same.x
        same.h = Math.max(same.h, rect.h)
      } else list.push(rect)
    }
    lines.set(parent, list)
  }
  for (const [el, list] of lines) {
    for (const l of list) {
      // The glyphs, not the whole line box: about the x-height-to-descender band.
      const h = Math.max(6, l.h * 0.72)
      out.push({ x: l.x, y: l.y + (l.h - h) / 2, w: l.w, h, r: Math.min(h / 2, 5), el, fill: null })
    }
  }
  return out
}

/** The skeleton blocks inside `root`: `[data-slot="skeleton"]`, else its leaf elements. */
export function skeletonBlocks(root: Element): HTMLElement[] {
  const marked = Array.from(root.querySelectorAll<HTMLElement>('[data-slot="skeleton"]'))
  if (marked.length) return marked
  return Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => el.childElementCount === 0)
}

export interface SkeletonRevealHandle {
  /** Pool the skeleton blocks inside `skeleton` into the loading goo (null: unpool). */
  pool(skeleton: Element | null): void
  /** Measure the blocks now, while they are still in the DOM (call just before the swap). */
  capture(): void
  /** Melt the captured blocks into `content` (already in the DOM). Resolves when done. */
  reveal(content: Element): Promise<void>
  /** Stop a reveal and the pooled goo at once; the content is left fully visible. */
  cancel(): void
  update(options: SkeletonRevealOptions): void
  destroy(): void
}

interface Blob {
  el: HTMLDivElement
  rect: RevealRect
  fill: string
}

interface Live {
  blob: Blob
  timing: RevealTiming
  to: RevealTarget | null
  fill: string | null
  x: SpringState
  y: SpringState
  w: SpringState
  h: SpringState
  r: SpringState
}

const LAYER_ATTR = 'data-goop-skeleton-goo'

/** Web Animations when the engine has them (not in every test DOM); null otherwise. */
const animate = (el: Element, keys: Keyframe[], opts: KeyframeAnimationOptions): Animation | null =>
  typeof (el as HTMLElement).animate === 'function' ? (el as HTMLElement).animate(keys, opts) : null
const px = (n: number): string => `${Math.round(n * 100) / 100}px`

/**
 * Attach the pooled loading goo and the melt reveal to `host` (the element both the skeleton
 * and the content render in). See the file header.
 */
export function attachSkeletonReveal(host: HTMLElement, options: SkeletonRevealOptions = {}): SkeletonRevealHandle {
  const doc = host.ownerDocument
  const view = doc.defaultView
  let opts = { ...options }
  let feel = resolveSkeletonReveal(opts)
  let skeleton: Element | null = null
  let hidden: { el: HTMLElement; visibility: string }[] = []
  let blocks: HTMLElement[] = []
  let captured: Blob[] = []
  let layer: HTMLDivElement | null = null
  let sheen: HTMLDivElement | null = null
  let lease: GooFilterLease | null = null
  let ro: ResizeObserver | null = null
  let ticker: Ticker | null = null
  let finish: (() => void) | null = null
  let fades: Animation[] = []
  let destroyed = false

  const reduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  const unwatch = watchReducedMotion(doc, () => {
    if (skeleton && !ticker) pool(skeleton)
  })

  const hostSize = (): { w: number; h: number } => ({ w: host.clientWidth, h: host.clientHeight })

  const measure = (els: HTMLElement[]): Blob[] => {
    if (!view) return []
    const hr = host.getBoundingClientRect()
    const ox = hr.left + host.clientLeft
    const oy = hr.top + host.clientTop
    return els.flatMap((el) => {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return []
      const cs = view.getComputedStyle(el)
      return [{ el: el as unknown as HTMLDivElement, rect: { x: r.left - ox, y: r.top - oy, w: r.width, h: r.height, r: radiusOf(cs, r.width, r.height) }, fill: cs.backgroundColor }]
    })
  }

  let layerBlur = 0
  const ensureLayer = (blur: number): HTMLDivElement => {
    if (layer && layerBlur === blur) return layer
    removeLayer()
    if (view && view.getComputedStyle(host).position === 'static') host.style.position = 'relative'
    layerBlur = blur
    lease = acquireGooFilter(doc, { blur, ...SKELETON_REVEAL_GOO })
    const el = doc.createElement('div')
    el.setAttribute(LAYER_ATTR, '')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = `position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:1;filter:url(#${lease.id});`
    host.append(el)
    layer = el
    return el
  }

  const removeLayer = (): void => {
    layer?.remove()
    layer = null
    sheen = null
    lease?.release()
    lease = null
  }

  const restoreBlocks = (): void => {
    for (const { el, visibility } of hidden) el.style.visibility = visibility
    hidden = []
  }

  /** A blob div that looks like block `src` (its classes give the colour live with the theme). */
  const makeBlob = (src: HTMLElement, rect: RevealRect): HTMLDivElement => {
    const el = doc.createElement('div')
    el.className = typeof src.className === 'string' ? src.className : ''
    el.style.cssText = 'position:absolute;margin:0;box-sizing:border-box;border:0;animation:none;transition:none;'
    placeBlob(el, rect)
    return el
  }

  const placeBlob = (el: HTMLElement, r: RevealRect): void => {
    const { w: W, h: H } = hostSize()
    const w = clamp(r.w, 0, W)
    const h = clamp(r.h, 0, H)
    el.style.left = px(clamp(r.x, 0, Math.max(0, W - w)))
    el.style.top = px(clamp(r.y, 0, Math.max(0, H - h)))
    el.style.width = px(w)
    el.style.height = px(h)
    el.style.borderRadius = px(clamp(r.r, 0, Math.min(w, h) / 2))
  }

  /** The loading goo: blobs + breathing + the sheen. Rebuilt on resize. */
  const buildPool = (): void => {
    if (!skeleton || destroyed) return
    for (const a of layer?.getAnimations?.({ subtree: true }) ?? []) a.cancel()
    layer?.replaceChildren()
    blocks = skeletonBlocks(skeleton)
    restoreBlocks()
    captured = measure(blocks)
    if (!captured.length || reduced() || !view) {
      removeLayer()
      return
    }
    const root = ensureLayer(skeletonGooBlur(feel.blur, captured.map((b) => b.rect)))
    const { w: W, h: H } = hostSize()
    const band = clamp(W * 0.42, 96, 280)
    const period = feel.sheenPeriod * 1000
    const travel = 1 - feel.sheenRest
    const sheenKeys = (from: number, to: number, unit = 'px'): Keyframe[] => [
      { offset: 0, value: `${from}${unit}` },
      { offset: travel, value: `${to}${unit}`, easing: 'linear' },
      { offset: 1, value: `${to}${unit}` },
    ]
    const timing: KeyframeAnimationOptions = { duration: period, iterations: Infinity, easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)' }
    captured.forEach((b, i) => {
      const el = makeBlob(b.el, b.rect)
      b.el = el
      root.append(el)
      if (feel.sheenOn && feel.sheenLift > 0) {
        // The mound, in host space: the same band position for every blob, so it flows on.
        const lift = Math.round(feel.sheenLift * 150)
        const moundH = Math.min(b.rect.h * 1.35, 44)
        el.style.backgroundImage = `radial-gradient(50% 100% at 50% 100%, color-mix(in oklab, var(--goop-shimmer-color, #fff) calc(var(--goop-shimmer-base, 0.5) * ${lift}%), transparent) 0%, color-mix(in oklab, var(--goop-shimmer-color, #fff) calc(var(--goop-shimmer-base, 0.5) * ${Math.round(lift * 0.5)}%), transparent) 40%, transparent 100%)`
        el.style.backgroundRepeat = 'no-repeat'
        el.style.backgroundSize = `${px(band)} ${px(moundH)}`
        el.style.backgroundPositionY = '100%'
        const keys = sheenKeys(-band - b.rect.x, W - b.rect.x).map(({ offset, value, easing }) => ({ offset, backgroundPositionX: value, ...(easing ? { easing } : {}) }))
        animate(el, keys as Keyframe[], timing)
      }
      if (feel.breatheOn && feel.breathe > 0) {
        const sy = 1 + (2 * feel.breathe) / Math.max(8, b.rect.h)
        const sx = 1 + feel.breathe / Math.max(24, b.rect.w)
        animate(
          el,
          [{ transform: 'scale(1, 1)' }, { transform: `scale(${sx}, ${sy})` }, { transform: 'scale(1, 1)' }],
          { duration: feel.breathePeriod * 1000, iterations: Infinity, easing: 'ease-in-out', delay: -((i * 0.37) % 1) * feel.breathePeriod * 1000 },
        )
      }
    })
    if (feel.sheenOn && feel.sheenBridge > 0) {
      const s = makeBlob(captured[0]!.el, { x: 0, y: 0, w: band, h: H, r: 0 })
      s.style.backgroundImage = 'none'
      const a = feel.sheenBridge
      const mask = `radial-gradient(50% 60% at 50% 50%, rgba(0,0,0,${a}) 0%, rgba(0,0,0,${a * 0.8}) 45%, transparent 100%)`
      s.style.maskImage = mask
      s.style.setProperty('-webkit-mask-image', mask)
      root.append(s)
      sheen = s
      animate(
        s,
        sheenKeys(-band, W).map(({ offset, value, easing }) => ({ offset, left: value, ...(easing ? { easing } : {}) })) as Keyframe[],
        timing,
      )
    }
    for (const b of blocks) {
      hidden.push({ el: b, visibility: b.style.visibility })
      b.style.visibility = 'hidden'
    }
  }

  const stopTicker = (): void => {
    if (ticker) removeTicker(ticker)
    ticker = null
  }

  const clearFades = (finishThem: boolean): void => {
    for (const a of fades) {
      try {
        if (finishThem) a.finish()
        else a.cancel()
      } catch {
        a.cancel()
      }
    }
    fades = []
  }

  function pool(next: Element | null): void {
    if (destroyed) return
    cancel()
    skeleton = next
    ro?.disconnect()
    ro = null
    if (!next) {
      restoreBlocks()
      removeLayer()
      return
    }
    buildPool()
    const RO = view?.ResizeObserver
    if (RO) {
      let first = true
      ro = new RO(() => {
        if (first) {
          first = false
          return
        }
        if (skeleton && !ticker) buildPool()
      })
      ro.observe(host)
    }
  }

  function capture(): void {
    if (destroyed || ticker) return
    if (!skeleton) return
    const els = layer && hidden.length ? hidden.map((h) => h.el) : skeletonBlocks(skeleton)
    restoreBlocks()
    const fresh = measure(els)
    // Keep the pooled blobs as the reveal's bodies (same order); fall back to new ones.
    captured = fresh.map((b, i) => ({ ...b, el: (layer?.children[i] as HTMLDivElement | undefined) ?? b.el }))
    if (layer && captured.length !== blocks.length) captured = fresh
  }

  /** Fade the content's own top-level elements in (skipping ones a blob will reveal). */
  const fadeRoot = (content: Element, ms: number, skip: Set<Element>): void => {
    for (const el of Array.from(content.children)) {
      if (skip.has(el)) continue
      const a = animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out', fill: 'backwards' })
      if (a) fades.push(a)
    }
  }

  function reveal(content: Element): Promise<void> {
    if (destroyed) return Promise.resolve()
    const blobs = captured
    skeleton = null
    ro?.disconnect()
    ro = null
    hidden = []
    captured = []
    stopTicker()
    if (!blobs.length || reduced() || !feel.meltOn || !view) {
      removeLayer()
      if (blobs.length) fadeRoot(content, reduced() ? 160 : 220, new Set())
      return Promise.resolve()
    }
    const root = layer ?? ensureLayer(skeletonGooBlur(feel.blur, blobs.map((b) => b.rect)))
    // Stop the loading motion; the sheen fades so its bridges let go.
    for (const a of root.getAnimations?.({ subtree: true }) ?? []) a.cancel()
    if (sheen) {
      const s = sheen
      const a = animate(s, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
      if (a) a.finished.then(() => s.remove(), () => {})
      else s.remove()
    }
    // Pooled blobs are reused; captured-without-pool ones (melt only) get fresh bodies.
    for (const b of blobs) {
      if (b.el.parentElement !== root) {
        const el = makeBlob(b.el, b.rect)
        root.append(el)
        b.el = el
      }
      b.el.style.backgroundImage = 'none'
    }
    const used = new Set<Element>(blobs.map((b) => b.el))
    for (const child of Array.from(root.children)) if (child !== sheen && !used.has(child)) child.remove()
    const targets = revealTargets(host, content)
    const match = matchRevealTargets(
      blobs.map((b) => b.rect),
      targets,
    )
    const order = revealOrder(blobs.map((b) => b.rect))
    const timings = revealTimings(order.length, feel)
    const lives: Live[] = order.map((i, k) => {
      const b = blobs[i]!
      const t = match[i]! >= 0 ? targets[match[i]!]! : null
      const s = (x: number): SpringState => ({ x, v: 0 })
      return { blob: b, timing: timings[k]!, to: t, fill: t?.fill ?? null, x: s(b.rect.x), y: s(b.rect.y), w: s(b.rect.w), h: s(b.rect.h), r: s(b.rect.r) }
    })
    // Hold each target hidden until its blob drains, then fade it in under the goo.
    const firstDrain = new Map<HTMLElement, number>()
    for (const l of lives) {
      if (!l.to) continue
      const prev = firstDrain.get(l.to.el)
      if (prev === undefined || l.timing.drainStart < prev) firstDrain.set(l.to.el, l.timing.drainStart)
    }
    for (const [el, at] of firstDrain) {
      const a = animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: feel.drain * 900, delay: at * 1000, easing: 'cubic-bezier(0.3, 0, 0.4, 1)', fill: 'backwards' })
      if (a) fades.push(a)
    }
    const covered = new Set<Element>()
    for (const el of Array.from(content.children)) if (firstDrain.has(el as HTMLElement)) covered.add(el)
    fadeRoot(content, Math.max(220, feel.response * 700), covered)
    for (const l of lives) {
      if (!l.fill || l.fill === l.blob.fill) continue
      animate(l.blob.el, [{ backgroundColor: l.blob.fill }, { backgroundColor: l.fill }], {
        duration: feel.response * 900,
        delay: l.timing.start * 1000,
        easing: 'ease-in-out',
        fill: 'both',
      })
    }
    const wide: SpringConfig = springConfig({ response: feel.response, dampingRatio: feel.damping })
    const tall: SpringConfig = springConfig({ response: feel.response * 1.25, dampingRatio: Math.min(1, feel.damping + 0.08) })
    const move: SpringConfig = springConfig({ response: feel.response * 1.1, dampingRatio: Math.min(1, feel.damping + 0.12) })
    const total = Math.max(...lives.map((l) => l.timing.end)) + 0.05
    let t = 0
    return new Promise<void>((resolve) => {
      const done = (): void => {
        stopTicker()
        removeLayer()
        finish = null
        resolve()
      }
      finish = done
      const tick: Ticker = (dt) => {
        t += dt
        for (const l of lives) {
          const { timing } = l
          if (t < timing.start) continue
          const to = l.to ?? { ...l.blob.rect, x: l.blob.rect.x + l.blob.rect.w * 0.1, w: l.blob.rect.w * 0.8 }
          stepSpring(l.x, to.x, move, dt)
          stepSpring(l.w, to.w, wide, dt)
          stepSpring(l.y, to.y, move, dt)
          stepSpring(l.h, to.h, tall, dt)
          stepSpring(l.r, to.r, tall, dt)
          const e = clamp((t - timing.drainStart) / Math.max(0.01, timing.end - timing.drainStart), 0, 1)
          // The swell: a raised-cosine pulse over the morph (zero slope at both ends).
          const p = clamp((t - timing.start) / Math.max(0.01, timing.drainStart - timing.start), 0, 1)
          const sw = feel.swell * 0.5 * (1 - Math.cos(2 * Math.PI * p))
          // The drain: the top surface sinks to the bottom (the content shows from the top
          // down), the bottom sags a little and the body narrows into a meniscus; the last
          // sliver fades, so under the filter it thins and lets go instead of popping.
          const d = smoothstep(0, 1, e)
          const h = l.h.x + 2 * sw
          const w = (l.w.x + sw) * (1 - 0.14 * d)
          const bottom = l.y.x - sw + h + l.h.x * feel.sag * d
          const left = h * (1 - d)
          placeBlob(l.blob.el, { x: l.x.x - sw * 0.5 + (l.w.x + sw - w) / 2, y: bottom - left, w, h: left, r: l.r.x + sw })
          l.blob.el.style.opacity = String(1 - smoothstep(0.55, 1, e))
        }
        if (t >= total) {
          done()
          return false
        }
        return true
      }
      ticker = tick
      wakeTicker(tick)
    })
  }

  function cancel(): void {
    const f = finish
    finish = null
    stopTicker()
    clearFades(true)
    if (f) {
      removeLayer()
      f()
    }
  }

  return {
    pool,
    capture,
    reveal,
    cancel,
    update(next) {
      const before = feel
      opts = { ...next }
      feel = resolveSkeletonReveal(opts)
      if (skeleton && !ticker && JSON.stringify(before) !== JSON.stringify(feel)) {
        buildPool()
      }
    },
    destroy() {
      if (destroyed) return
      cancel()
      destroyed = true
      unwatch()
      ro?.disconnect()
      ro = null
      restoreBlocks()
      removeLayer()
      skeleton = null
    },
  }
}
