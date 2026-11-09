// Goo for tags inputs (GoopTagsInput): the Input's goo focus ring around the whole box, plus
// tags that join and leave like droplets.
//
// Two aria-hidden goo layers:
//   ring (on the HOST, a wrapper around the box): core's `attachInput` focus ring, following
//     the box's border (`frame`) while its borderless <input> has focus. Flow, close, ripple,
//     wobble, drain and the invalid drip are the Input's own.
//   tags (inside the box, behind its children): one goo pill per tag that is moving.
//     merge: a new tag plops in like a droplet joining. A small round drop of the tag's own
//       colour swells and spreads into the tag's pill shape with a little jelly overshoot,
//       while a short goo bridge to the tag before it swells and pinches off. The real tag
//       fades in and scales with the goo, so by the end the goo is hidden behind it.
//     melt: a removed tag drains away. Its pill (where it last was) pinches in from both ends,
//       sinks a little and shrinks to nothing.
//
// Cheap on purpose: the tag layer is built on the first animation and only ticks while a tag
// moves; tags only change transform / opacity (no layout shift), and the goo is ink overflow
// (no scroll growth). Reduced motion: no merge or melt, a static ring.
// The poses are pure (`tagMergePose`, `tagMeltPose`); no DOM access until `attachTagsInput`
// (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { attachInput, INPUT_EFFECTS, type InputHandle, type InputOptions } from './input'
import type { GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** The tags' own effects (the ring's come from INPUT_EFFECTS). */
export const TAG_EFFECTS = ['merge', 'melt'] as const
export type TagEffect = (typeof TAG_EFFECTS)[number]
/** Every toggle of a tags input: the ring's, then the tags'. */
export const TAGS_INPUT_EFFECTS = [...INPUT_EFFECTS, ...TAG_EFFECTS] as const
export type TagsInputEffect = (typeof TAGS_INPUT_EFFECTS)[number]

/** A tag inside the box (shadcn-vue's TagsInputItem, `data-slot="tags-input-item"`). */
export const TAGS_INPUT_ITEM = '[data-slot="tags-input-item"]'
/** The text field inside the box. */
export const TAGS_INPUT_FIELD = '[data-slot="tags-input-input"]'
/** CSS vars the tag goo paints with (default: shadcn's `--secondary`, the tags' own fill). */
export const TAG_COLOR_VAR = '--goop-tags-input-tag-color'
export const TAG_OPACITY_VAR = '--goop-tags-input-tag-opacity'

export interface TagFeel {
  /** Seconds a merge-in takes. */
  merge: number
  /** Seconds a melt takes. */
  melt: number
  /** Starting drop radius as a fraction of the tag's half height. */
  drop: number
  /** Jelly overshoot of the spread: decay rate (higher = less overshoot) and frequency (Hz
   *  over the merge's 0..1). */
  decay: number
  freq: number
  /** Bridge to the tag before it: radius as a fraction of the half height. */
  bridge: number
  /** How far a melting tag sinks, as a fraction of its height. */
  sink: number
  /** Goo blur, px. */
  softness: number
}

export const TAG_FEEL: Readonly<Record<GoopPreset, Readonly<TagFeel>>> = Object.freeze({
  subtle: Object.freeze({ merge: 0.3, melt: 0.28, drop: 0.55, decay: 6.5, freq: 0.85, bridge: 0.38, sink: 0.18, softness: 1.4 }),
  playful: Object.freeze({ merge: 0.38, melt: 0.34, drop: 0.5, decay: 5, freq: 0.9, bridge: 0.48, sink: 0.26, softness: 1.6 }),
  wild: Object.freeze({ merge: 0.48, melt: 0.42, drop: 0.42, decay: 3.8, freq: 1, bridge: 0.6, sink: 0.36, softness: 1.8 }),
})

/** A tag's box in the box's own (border-box) coordinates. */
export interface TagBox {
  x: number
  y: number
  w: number
  h: number
}

/** Circles in a tag pill. */
export const TAG_PILL_CIRCLES = 14
/** Circles in the merge bridge. */
export const TAG_BRIDGE_CIRCLES = 2
/** Circles one animation draws. */
export const TAG_ANIM_CIRCLES = TAG_PILL_CIRCLES + TAG_BRIDGE_CIRCLES

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
const smooth = (x: number): number => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}
const none = (x: number, y: number): GooCircle => ({ x, y, r: 0, sx: 1, sy: 1 })

/** A pill of `TAG_PILL_CIRCLES` circles along the box's middle: half-length `half`, radius
 *  `r`, centred at (cx, cy), squashed vertically by `sy`. */
function pill(cx: number, cy: number, half: number, r: number, sy = 1): GooCircle[] {
  const out: GooCircle[] = []
  const n = TAG_PILL_CIRCLES
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    out.push(r > 0 ? { x: cx - half + 2 * half * f, y: cy, r, sx: 1, sy } : none(cx, cy))
  }
  return out
}

export interface TagMergePose {
  /** Pill circles, then bridge circles. */
  circles: GooCircle[]
  /** The real tag's opacity and scale (it rides the goo). */
  opacity: number
  scaleX: number
  scaleY: number
}

/**
 * A new tag's merge-in at progress `u` (0..1). `prev` is the tag before it on the same row (a
 * bridge joins them), if any. `fx` scales the jelly (0 = a plain spread). Pure.
 */
export function tagMergePose(u: number, box: TagBox, prev: TagBox | null, feel: TagFeel = TAG_FEEL.playful, fx = 1): TagMergePose {
  const t = clamp01(u)
  const R = box.h / 2
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const halfFull = Math.max(0, box.w / 2 - R)
  // Spread: a damped spring from 0 to 1 with a small overshoot (the jelly), eased to exactly 1.
  const k = Math.max(0, fx)
  const spring = 1 - Math.exp(-feel.decay * t) * Math.cos(2 * Math.PI * feel.freq * t)
  const spread = t >= 1 ? 1 : (1 - k) * smooth(t / 0.7) + k * spring * (1 - smooth((t - 0.85) / 0.15)) + k * smooth((t - 0.85) / 0.15)
  // Radius: a round drop that swells to the tag's height.
  const grow = smooth(t / 0.4)
  const r = R * (feel.drop + (1 - feel.drop) * grow)
  // Volume-ish: wider than rest = a little flatter.
  const sy = Math.max(0.75, Math.min(1.15, 1 - (spread - 1) * 1.6 * k))
  const half = halfFull * Math.max(0, spread)
  const circles = pill(cx, cy, half, r, sy)
  // The bridge to the tag before it: swells, then pinches off.
  const bridgeR = prev ? R * feel.bridge * Math.sin(Math.PI * clamp01(t / 0.75)) : 0
  if (prev && bridgeR > 0.2) {
    const gx0 = prev.x + prev.w
    const gx1 = cx - half - r * 0.6
    const by = (prev.y + prev.h / 2 + cy) / 2
    circles.push({ x: gx0 + (gx1 - gx0) * 0.3, y: by, r: bridgeR, sx: 1, sy: 1 })
    circles.push({ x: gx0 + (gx1 - gx0) * 0.75, y: by, r: bridgeR * 0.85, sx: 1, sy: 1 })
  } else for (let i = 0; i < TAG_BRIDGE_CIRCLES; i++) circles.push(none(cx, cy))
  const width = 2 * half + 2 * r
  return {
    circles,
    opacity: t >= 1 ? 1 : smooth((t - 0.12) / 0.5),
    scaleX: t >= 1 ? 1 : Math.max(0.2, width / Math.max(1, box.w)),
    scaleY: t >= 1 ? 1 : Math.max(0.2, (r / R) * sy),
  }
}

/** A removed tag's melt at progress `u` (0..1): its pill pinches in from both ends, sinks a
 *  little and shrinks away. Returns pill circles, then (empty) bridge circles, and their
 *  opacity. Pure. */
export function tagMeltPose(u: number, box: TagBox, feel: TagFeel = TAG_FEEL.playful): { circles: GooCircle[]; opacity: number } {
  const t = clamp01(u)
  const R = box.h / 2
  const cx = box.x + box.w / 2
  const halfFull = Math.max(0, box.w / 2 - R)
  const pinch = smooth(t / 0.85)
  const half = halfFull * (1 - pinch)
  const r = t >= 1 ? 0 : R * (1 - smooth((t - 0.2) / 0.8) * 0.92)
  const cy = box.y + R + box.h * feel.sink * smooth(t)
  const circles = pill(cx, cy, half, r, 1 - 0.25 * smooth(t))
  for (let i = 0; i < TAG_BRIDGE_CIRCLES; i++) circles.push(none(cx, cy))
  return { circles, opacity: t >= 1 ? 0 : 1 - smooth((t - 0.55) / 0.45) }
}

export function tagGooParams(feel: TagFeel = TAG_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.45 }
}

// ---- attach --------------------------------------------------------------------------------

export interface TagsInputOptions extends InputOptions {
  /** A new tag plops in like a droplet joining the others. A number scales its jelly. */
  merge?: boolean | number
  /** A removed tag drains away where it was. */
  melt?: boolean | number
}

export interface TagsInputHandle {
  update(opts?: TagsInputOptions): void
  resize(): void
  /** The focus ring (core `attachInput`), or null when the box has no <input>. */
  readonly input: InputHandle | null
  /** Tags merging in or melting away right now. */
  readonly animating: number
  readonly running: boolean
  readonly reducedMotion: boolean
  destroy(): void
}

const inputOptionsOf = (o: TagsInputOptions): InputOptions => {
  const { merge: _m, melt: _l, ...rest } = o
  return rest
}

interface TagAnim {
  kind: 'merge' | 'melt'
  box: TagBox
  prev: TagBox | null
  t: number
  el: HTMLElement | null
  saved: { opacity: string; transform: string; origin: string } | null
}

/**
 * Attach the goo to a tags input. `host` wraps the bordered box `root` (it gets the ring
 * layer); the box holds the tags (`[data-slot=tags-input-item]`) and the <input>. Core makes
 * both `position: relative` if static.
 */
export function attachTagsInput(host: HTMLElement, root: HTMLElement, options: TagsInputOptions = {}): TagsInputHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: TagsInputOptions = { ...options }
  let feel = TAG_FEEL[readPreset(host, opts.preset)]
  const field = root.querySelector<HTMLInputElement>(TAGS_INPUT_FIELD) ?? root.querySelector<HTMLInputElement>('input')
  const input = field ? attachInput(host, field, inputOptionsOf(opts), root) : null
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let anims: TagAnim[] = []
  let destroyed = false
  /** Each tag's last known box (a removed tag melts where it was). */
  let boxes = new Map<Element, TagBox>()

  const readReduced = (): boolean => {
    const o = opts.reducedMotion
    return o === true || (o !== false && isReducedMotion(doc))
  }
  let reduced = readReduced()
  const merge = (): number => gooEffectValue(opts.merge)
  const melt = (): number => gooEffectValue(opts.melt)
  const speed = (): number => Math.max(0.05, opts.speed ?? 1)

  const items = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(TAGS_INPUT_ITEM)]
  const boxOf = (el: Element): TagBox => {
    const rr = root.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // Untransformed size (a merging tag is scaled).
    const w = (el as HTMLElement).offsetWidth || r.width
    const h = (el as HTMLElement).offsetHeight || r.height
    return { x: r.left + r.width / 2 - w / 2 - rr.left, y: r.top + r.height / 2 - h / 2 - rr.top, w, h }
  }
  const remember = (): void => {
    const next = new Map<Element, TagBox>()
    for (const el of items()) next.set(el, boxOf(el))
    boxes = next
  }

  const restore = (a: TagAnim): void => {
    if (a.el && a.saved) {
      a.el.style.opacity = a.saved.opacity
      a.el.style.transform = a.saved.transform
      a.el.style.transformOrigin = a.saved.origin
    }
    a.saved = null
  }

  const prevPosition = root.style.position
  const prevIsolation = root.style.isolation
  let styled = false
  const build = (): void => {
    if (layer) return
    if (!styled) {
      styled = true
      if (win?.getComputedStyle(root).position === 'static') root.style.position = 'relative'
      root.style.isolation = 'isolate'
    }
    layer = resolveRenderer(opts.renderer)(root, tagGooParams(feel))
    layer.layer.setAttribute('data-goop-part', 'tags-input-tag')
    layer.layer.style.setProperty('--goop-color', `var(${TAG_COLOR_VAR}, var(--secondary, currentColor))`)
    layer.layer.style.setProperty('opacity', `var(${TAG_OPACITY_VAR}, 1)`)
    layer.setBodyScale(0, 0)
    layer.setPadding({ side: Math.ceil(feel.softness * 3 + 12), bottom: Math.ceil(feel.softness * 3 + 16) })
  }
  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }

  const draw = (): void => {
    if (!layer) return
    let i = 0
    for (const a of anims) {
      const u = a.kind === 'merge' ? a.t / feel.merge : a.t / feel.melt
      let circles: GooCircle[]
      let alpha = 1
      if (a.kind === 'merge') {
        const pose = tagMergePose(u, a.box, a.prev, feel, merge())
        circles = pose.circles
        if (a.el) {
          a.el.style.opacity = String(Math.round(pose.opacity * 1000) / 1000)
          a.el.style.transform = `scale(${Math.round(pose.scaleX * 1000) / 1000}, ${Math.round(pose.scaleY * 1000) / 1000})`
        }
      } else {
        const pose = tagMeltPose(u, a.box, feel)
        circles = pose.circles
        alpha = pose.opacity
      }
      for (const c of circles) {
        if (i >= blobs.length) blobs.push(layer.createBlob())
        if (c.r > 0) blobs[i]!.set(c.x, c.y, c.r, alpha, c.sx, c.sy)
        else blobs[i]!.set(0, 0, 0)
        i++
      }
    }
    for (; i < blobs.length; i++) blobs[i]!.set(0, 0, 0)
    layer.flush()
  }

  const finish = (a: TagAnim): void => restore(a)
  const tick: Ticker = (dt) => {
    if (destroyed) return false
    const step = dt * speed()
    for (const a of anims) a.t += step
    const done = anims.filter((a) => a.t >= (a.kind === 'merge' ? feel.merge : feel.melt))
    if (done.length) {
      done.forEach(finish)
      anims = anims.filter((a) => !done.includes(a))
    }
    draw()
    return anims.length > 0
  }
  const stopAll = (): void => {
    anims.forEach(finish)
    anims = []
    removeTicker(tick)
    draw()
  }

  const sameRow = (a: TagBox, b: TagBox): boolean => Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) < Math.min(a.h, b.h) / 2

  const onMutations = (records: MutationRecord[]): void => {
    if (destroyed) return
    const added = new Set<HTMLElement>()
    const removed = new Set<Element>()
    const isItem = (n: Node): n is HTMLElement => n.nodeType === 1 && (n as Element).matches(TAGS_INPUT_ITEM)
    for (const rec of records) {
      rec.addedNodes.forEach((n) => isItem(n) && added.add(n))
      rec.removedNodes.forEach((n) => isItem(n) && removed.add(n as Element))
    }
    const animate = !reduced
    let started = false
    for (const el of removed) {
      if (el.isConnected) continue // moved, not removed
      const prior = anims.find((a) => a.el === el)
      if (prior) {
        restore(prior)
        anims = anims.filter((a) => a !== prior)
      }
      const box = boxes.get(el)
      if (animate && box && melt() > 0 && box.w > 0) {
        anims.push({ kind: 'melt', box, prev: null, t: 0, el: null, saved: null })
        started = true
      }
    }
    for (const el of added) {
      if (!el.isConnected || boxes.has(el) || anims.some((a) => a.el === el)) continue
      if (!animate || !(merge() > 0)) continue
      const box = boxOf(el)
      if (!(box.w > 0)) continue
      // The tag before it on the same row (the bridge joins them).
      let prev: TagBox | null = null
      let sib = el.previousElementSibling
      while (sib && !sib.matches(TAGS_INPUT_ITEM)) sib = sib.previousElementSibling
      if (sib) {
        const pb = boxOf(sib)
        if (sameRow(pb, box)) prev = pb
      }
      const saved = { opacity: el.style.opacity, transform: el.style.transform, origin: el.style.transformOrigin }
      el.style.transformOrigin = '50% 50%'
      anims.push({ kind: 'merge', box, prev, t: 0, el, saved })
      started = true
    }
    remember()
    if (started) {
      build()
      draw()
      wakeTicker(tick)
    }
  }

  const MO = win?.MutationObserver
  const mo = MO ? new MO(onMutations) : undefined
  mo?.observe(root, { childList: true, subtree: true })
  // Refresh the boxes just before anything that may remove a tag (a click on its X, Backspace).
  const onBeforeRemove = (): void => {
    if (!destroyed) remember()
  }
  root.addEventListener('pointerdown', onBeforeRemove, true)
  root.addEventListener('keydown', onBeforeRemove, true)
  remember()

  const relayout = (): void => {
    if (destroyed) return
    remember()
    for (const a of anims) if (a.el) a.box = boxOf(a.el)
  }
  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => relayout()) : undefined
  ro?.observe(root)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) stopAll()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = TAG_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      reduced = readReduced()
      input?.update(inputOptionsOf(opts))
      if (reduced) stopAll()
      if (rebuild && layer) {
        teardown()
        if (anims.length) build()
      }
      draw()
    },
    resize() {
      input?.resize()
      relayout()
    },
    get input() {
      return input
    },
    get animating() {
      return anims.length
    },
    get running() {
      return !destroyed && anims.length > 0
    },
    get reducedMotion() {
      return reduced
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      anims.forEach(finish)
      anims = []
      mo?.disconnect()
      ro?.disconnect()
      unwatch()
      root.removeEventListener('pointerdown', onBeforeRemove, true)
      root.removeEventListener('keydown', onBeforeRemove, true)
      teardown()
      input?.destroy()
      if (styled) {
        root.style.position = prevPosition
        root.style.isolation = prevIsolation
      }
    },
  }
}
