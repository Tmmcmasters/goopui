// Goo accordion / collapsible: a toggle-style flood on the trigger row.
//
//   open:  the trigger row floods with goo from the click point (its centre for keyboard
//          opens): GoopToggle's own engine (`attachToggleFill`), so the same crest against the
//          walls, jelly wobble once full and a few droplets off the top edge. Once the row is
//          half full the trigger is marked `data-goop-flooded` (goop.css switches its text to
//          a contrasting color). The content opens at the same time with a jelly spring
//          height: an under-damped spring (overshoot, then settle), as a CSS `linear()` easing.
//   close: the row drains back into the click point; the content closes on a short, critically
//          damped spring.
//   single accordion: each item has its own trigger fill, so the old row drains while the new
//          one floods.
// The open row stays filled. At rest nothing animates (the fill engine only ticks while a
// flood, drain or wobble is running). Reduced motion: the open row is a static fill and the
// content uses a plain height animation (the host gets `data-goop-still`).
//
// The content's height animation is CSS (reka's `--reka-accordion-content-height` /
// `--reka-collapsible-content-height` keyframes in @goopui/vue's goop.css). Core publishes the
// timing on the host (ACCORDION_TIMING_VARS) and re-publishes it when the content is measured
// (the overshoot is soft-capped in px, so it depends on the content's height).
//
// Host parts (found by attribute, nested accordions keep their own):
//   [data-goop-accordion-trigger]  the trigger row that floods
//   [data-goop-accordion-content]  the collapsible content
// No DOM access until `attachAccordion` (SSR-safe).

import type { GoopPreset } from './constants'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { attachToggleFill, type ToggleHandle, type ToggleOptions } from './toggle'
import { readPreset } from './tuning'

/** CSS var the goo paints with (default `--primary`). */
export const ACCORDION_COLOR_VAR = '--goop-accordion-fill'
/** CSS var of the trigger's text color while its row is flooded (default `--primary-foreground`). */
export const ACCORDION_TEXT_VAR = '--goop-accordion-text'
/** Host attributes of the parts core finds. */
export const ACCORDION_TRIGGER_ATTR = 'data-goop-accordion-trigger'
export const ACCORDION_CONTENT_ATTR = 'data-goop-accordion-content'
/** Set on the trigger while its row is at least half flooded. */
export const ACCORDION_FLOODED_ATTR = 'data-goop-flooded'
/** Host attribute present under reduced motion (plain shadcn height animation). */
export const ACCORDION_STILL_ATTR = 'data-goop-still'
/** CSS vars core publishes on the host for the content's height animation. */
export const ACCORDION_TIMING_VARS = Object.freeze({
  open: '--goop-accordion-open',
  openEase: '--goop-accordion-open-ease',
  close: '--goop-accordion-close',
  closeEase: '--goop-accordion-close-ease',
})
/** How far the flooded row reaches past the trigger box, px per side (x: sideways so the text
 *  isn't flush with the goo edge; y: pulled in so the fill clears the content below). */
export const ACCORDION_BLEED = Object.freeze({ x: 10, y: -3 })

/** Individually toggleable effects (boolean or 0..2 strength). `flood`, `wobble`, `droplets`
 *  are GoopToggle's; `jelly` is the content's spring overshoot. */
export const ACCORDION_EFFECTS = ['flood', 'wobble', 'droplets', 'jelly'] as const
export type AccordionEffect = (typeof ACCORDION_EFFECTS)[number]
export type AccordionEffects = Record<AccordionEffect, number>
export const ACCORDION_ALL_EFFECTS: Readonly<AccordionEffects> = Object.freeze({ flood: 1, wobble: 1, droplets: 1, jelly: 1 })

export interface AccordionFeel {
  /** Natural frequency of the open spring, rad/s. */
  stiffness: number
  /** Damping ratio of the open spring at jelly 1 (< 1: overshoot). */
  damping: number
  /** Largest overshoot, px (soft cap at jelly 1; also at most a quarter of the content). */
  overshoot: number
  /** Natural frequency of the (critically damped) close spring, rad/s. */
  close: number
}

export const ACCORDION_FEEL: Readonly<Record<GoopPreset, Readonly<AccordionFeel>>> = Object.freeze({
  subtle: Object.freeze({ stiffness: 20, damping: 0.6, overshoot: 10, close: 28 }),
  playful: Object.freeze({ stiffness: 16, damping: 0.42, overshoot: 20, close: 24 }),
  wild: Object.freeze({ stiffness: 13, damping: 0.3, overshoot: 32, close: 20 }),
})

/** Damping ratio of the open spring at `jelly` strength: 1 (no overshoot) at 0, the preset's at
 *  1, bouncier beyond (floor 0.15). */
export function accordionDamping(feel: AccordionFeel, jelly: number): number {
  const j = Math.max(0, Math.min(2, jelly))
  return Math.max(0.15, Math.min(1, 1 - (1 - feel.damping) * j))
}

/** Step response of a spring (0 -> 1) at `t` seconds: natural frequency `omega`, damping `zeta`. */
export function accordionSpring(t: number, omega: number, zeta: number): number {
  if (t <= 0) return 0
  if (zeta >= 1) return 1 - (1 + omega * t) * Math.exp(-omega * t)
  const wd = omega * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
}

/** Seconds until a spring stays within `tol` of 1. */
export function accordionSettle(omega: number, zeta: number, tol = 0.004): number {
  const dt = 0.002
  let last = 0
  for (let t = dt; t < 4; t += dt) if (Math.abs(1 - accordionSpring(t, omega, zeta)) > tol) last = t
  return Math.max(dt, last + dt)
}

/** A CSS `linear()` easing sampled from `f` (0..1 -> progress, may overshoot 1). */
export function accordionEasing(f: (p: number) => number, samples = 40): string {
  const n = Math.max(2, Math.round(samples))
  const v: string[] = []
  for (let i = 0; i <= n; i++) {
    const y = i === 0 ? 0 : i === n ? 1 : f(i / n)
    v.push(String(Math.round(y * 10000) / 10000))
  }
  return `linear(${v.join(', ')})`
}

/** The content's height timing: open / close durations (s) and their progress curves (0..1 of
 *  the duration -> 0..1 of the height, the open one overshooting). `height` = content px (0 if
 *  unknown: no px cap). Pure. */
export function accordionCurves(
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
  height = 0,
): { open: number; openCurve: (q: number) => number; close: number; closeCurve: (q: number) => number } {
  const zeta = accordionDamping(feel, effects.jelly)
  const open = accordionSettle(feel.stiffness, zeta)
  const cap = Math.max(0.5, Math.min(feel.overshoot * Math.max(0.5, Math.min(2, effects.jelly)), height * 0.25))
  const openCurve = (q: number): number => {
    const x = accordionSpring(q * open, feel.stiffness, zeta)
    return x <= 1 || !(height > 0) ? x : 1 + (cap * Math.tanh(((x - 1) * height) / cap)) / height
  }
  const close = accordionSettle(feel.close, 1, 0.01)
  const closeCurve = (q: number): number => accordionSpring(q * close, feel.close, 1)
  return { open, openCurve, close, closeCurve }
}

export interface AccordionOptions {
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** The trigger row floods from the click point on open and drains back into it on close.
   *  Off: the fill snaps. Default true. */
  flood?: boolean | number
  /** Crest of the flood front and a jelly wobble of the row once full. Default true. */
  wobble?: boolean | number
  /** A few droplets splash off the row's top edge as it floods. Default true. */
  droplets?: boolean | number
  /** The content opens on a jelly spring (overshoot + settle). Off: no overshoot. Default true. */
  jelly?: boolean | number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface AccordionHandle {
  update(opts?: AccordionOptions): void
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The trigger row's fill (GoopToggle's engine), null when there is no trigger part. */
  readonly fill: ToggleHandle | null
  destroy(): void
}

const effectsOf = (o: AccordionOptions): AccordionEffects => ({
  flood: gooEffectValue(o.flood),
  wobble: gooEffectValue(o.wobble),
  droplets: gooEffectValue(o.droplets),
  jelly: gooEffectValue(o.jelly),
})

const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}

/** The first `sel` inside `host` whose nearest goo-accordion host is `host` (nested accordions
 *  keep their own parts). */
const ownPart = (host: HTMLElement, sel: string): HTMLElement | null => {
  const scoped = host.hasAttribute('data-goop-accordion')
  for (const el of host.querySelectorAll<HTMLElement>(sel)) {
    if (!scoped || el.parentElement?.closest('[data-goop-accordion]') === host) return el
  }
  return null
}

/** The centre of a trigger's label (its first visible child: the text, or an icon), in the
 *  trigger's padding box. */
function labelAt(trigger: HTMLElement): { x: number; y: number } | null {
  const doc = trigger.ownerDocument
  const tr = trigger.getBoundingClientRect()
  for (const n of trigger.childNodes) {
    let r: DOMRect | null = null
    if (n.nodeType === 3 && n.textContent?.trim()) {
      const range = doc.createRange()
      range.selectNodeContents(n)
      r = range.getBoundingClientRect?.() ?? null
    } else if (n.nodeType === 1 && !(n as Element).hasAttribute('data-goop')) r = (n as Element).getBoundingClientRect()
    if (r && (r.width > 0 || r.height > 0)) {
      return { x: r.left + r.width / 2 - tr.left - trigger.clientLeft, y: r.top + r.height / 2 - tr.top - trigger.clientTop }
    }
  }
  return null
}

/** Attach goo to an accordion item or collapsible root `host`. */
export function attachAccordion(host: HTMLElement, options: AccordionOptions = {}): AccordionHandle {
  const doc = host.ownerDocument
  let opts: AccordionOptions = { ...options }
  let feel = ACCORDION_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let trigger: HTMLElement | null = null
  let fill: ToggleHandle | null = null
  let lastHeight = 0
  let published = ''
  let destroyed = false

  const readReduced = (): boolean => {
    const o = opts.reducedMotion
    return o === true || (o !== false && isReducedMotion(doc))
  }

  const fillOptions = (): ToggleOptions => ({
    speed: opts.speed,
    preset: opts.preset,
    renderer: opts.renderer,
    flood: opts.flood,
    wobble: opts.wobble,
    droplets: opts.droplets,
    reducedMotion: opts.reducedMotion,
  })

  /** (Re)attach the fill to the trigger part, or update it. */
  const attachFill = (): void => {
    const t = ownPart(host, `[${ACCORDION_TRIGGER_ATTR}]`)
    if (t && t === trigger && fill) {
      fill.update(fillOptions())
      return
    }
    fill?.destroy()
    trigger = t
    fill = t
      ? attachToggleFill(t, fillOptions(), {
          part: 'accordion',
          color: `var(${ACCORDION_COLOR_VAR}, var(--primary, currentColor))`,
          isOn: (el) => el.getAttribute('data-state') === 'open',
          attrs: ['data-state'],
          bleed: ACCORDION_BLEED,
          fullAttr: ACCORDION_FLOODED_ATTR,
          labelAt,
        })
      : null
  }

  const contentHeight = (): number => {
    const content = ownPart(host, `[${ACCORDION_CONTENT_ATTR}]`)
    if (content && !content.hidden) {
      const cs = doc.defaultView?.getComputedStyle(content)
      const natural =
        px(cs?.getPropertyValue('--reka-accordion-content-height')) ||
        px(cs?.getPropertyValue('--reka-collapsible-content-height')) ||
        content.scrollHeight
      if (natural > 0) lastHeight = natural
    }
    return lastHeight
  }

  const publish = (): void => {
    if (destroyed) return
    const reduced = readReduced()
    host.toggleAttribute(ACCORDION_STILL_ATTR, reduced)
    const k = 1 / Math.max(0.05, opts.speed ?? 1)
    const c = accordionCurves(feel, effects, contentHeight())
    const vals: [string, string][] = [
      [ACCORDION_TIMING_VARS.open, `${(c.open * k).toFixed(3)}s`],
      [ACCORDION_TIMING_VARS.openEase, accordionEasing(c.openCurve, 48)],
      [ACCORDION_TIMING_VARS.close, `${(c.close * k).toFixed(3)}s`],
      [ACCORDION_TIMING_VARS.closeEase, accordionEasing(c.closeCurve, 16)],
    ]
    const key = vals.map((v) => v[1]).join('|')
    if (key === published) return
    published = key
    for (const [name, v] of vals) host.style.setProperty(name, v)
  }

  attachFill()
  publish()

  // Re-publish when the content is measured (reka sets its height var on the content's style),
  // and re-find the trigger if it is swapped out.
  const MO = doc.defaultView?.MutationObserver
  const mo = MO
    ? new MO((records) => {
        let measure = false
        let parts = false
        for (const r of records) {
          if (r.type === 'childList') parts = true
          else if ((r.target as Element).hasAttribute?.(ACCORDION_CONTENT_ATTR)) measure = true
        }
        if (parts && (!trigger || !trigger.isConnected)) attachFill()
        if (measure || parts) publish()
      })
    : undefined
  mo?.observe(host, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true })
  const unwatch = watchReducedMotion(doc, publish)

  return {
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      feel = ACCORDION_FEEL[readPreset(host, opts.preset)]
      effects = effectsOf(opts)
      attachFill()
      publish()
    },
    resize() {
      fill?.resize()
    },
    get running() {
      return !!fill?.running
    },
    get reducedMotion() {
      return readReduced()
    },
    get fill() {
      return fill
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      mo?.disconnect()
      unwatch()
      fill?.destroy()
      fill = null
      trigger = null
      for (const v of Object.values(ACCORDION_TIMING_VARS)) host.style.removeProperty(v)
      host.removeAttribute(ACCORDION_STILL_ATTR)
    },
  }
}
