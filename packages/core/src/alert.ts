// Alert goo entrance: when an alert mounts (or appears: first on screen, or shown again after
// being hidden) its body blooms down out of its top edge, a little short at first, overshoots
// a couple of px past its bottom edge and settles flat. The leading (bottom) edge bulges in a
// low, wide mound while it travels and dips gently on the rebound; the alert's icon gets one
// gentle jelly wobble. Nothing loops, nothing is left behind.
//
// Cheap on purpose (the trick card.ts uses): one aria-hidden <svg> with a single path behind
// the alert's content. While the entrance plays the alert's own background and border step
// aside (inline, restored afterwards) and the path redraws the alert's rounded box (its
// background colour, border colour and width, corner radius) with the bottom edge moved and
// bulged. No filter. It draws only during the ~0.7s entrance on the shared frame loop, then
// the svg is hidden and the alert is plain again. The alert's box never changes (no layout
// shift): only its paint moves. The path is painted past the svg box (overflow: visible),
// which is ink overflow, so it never grows the page's scroll size.
// Reduced motion: no entrance, a static alert.
// No DOM access until `attachAlert` is called (SSR-safe); `alertPose` / `alertPath` are pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { readPreset } from './tuning'

/** Individually toggleable alert effects (boolean or multiplier). `bloom`: the body blooms out
 *  of its top edge and settles. `wobble`: the icon's jelly wobble. */
export const ALERT_EFFECTS = ['bloom', 'wobble'] as const
export type AlertEffect = (typeof ALERT_EFFECTS)[number]

export interface AlertFeel {
  /** How far short of its bottom edge the body starts (px; capped at 40% of the height). */
  rise: number
  /** Peak height of the leading edge's mound (px). Low. */
  mound: number
  /** Mound half-width as a fraction of the alert's width (wide; at least 48px). */
  width: number
  /** Period (s) and decay time (s) of the body's settle. */
  period: number
  decay: number
  /** Icon wobble: peak tilt (deg), peak scale pop (fraction), period (s), decay (s), delay (s). */
  tilt: number
  pop: number
  iconPeriod: number
  iconDecay: number
  iconDelay: number
}

export const ALERT_FEEL: Readonly<Record<GoopPreset, Readonly<AlertFeel>>> = Object.freeze({
  subtle: Object.freeze({ rise: 10, mound: 1.5, width: 0.42, period: 0.5, decay: 0.12, tilt: 4, pop: 0.04, iconPeriod: 0.4, iconDecay: 0.16, iconDelay: 0.05 }),
  playful: Object.freeze({ rise: 16, mound: 3, width: 0.45, period: 0.46, decay: 0.15, tilt: 7, pop: 0.07, iconPeriod: 0.36, iconDecay: 0.2, iconDelay: 0.05 }),
  wild: Object.freeze({ rise: 22, mound: 4.5, width: 0.48, period: 0.44, decay: 0.19, tilt: 11, pop: 0.1, iconPeriod: 0.34, iconDecay: 0.26, iconDelay: 0.04 }),
})

export interface AlertOptions {
  /** The body's edge bloom. `false`: off; `true`: the preset's; a number scales it. */
  bloom?: boolean | number
  /** The icon's wobble. `false`: off; `true`: the preset's; a number scales it. */
  wobble?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the alert static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface AlertHandle {
  /** Play the entrance again (e.g. when the alert's message changes). */
  replay(): void
  update(options: AlertOptions): void
  /** Is the entrance playing? */
  readonly running: boolean
  destroy(): void
}

/** Where the entrance is at time `t` (s). */
export interface AlertPose {
  /** Bottom edge offset (px): negative = short of the alert's bottom, positive = past it. */
  reach: number
  /** Leading edge mound (px, + = outward / down, - = a gentle dip on the rebound). */
  mound: number
  /** Icon tilt (deg) and scale. */
  tilt: number
  scale: number
}

const REST: AlertPose = Object.freeze({ reach: 0, mound: 0, tilt: 0, scale: 1 })
/** Below this (px / deg) the entrance counts as settled. */
const EPS = 0.05

/** How long the entrance lasts (s) on `feel` at speed 1 for a `rise` px start. */
export function alertDuration(feel: AlertFeel = ALERT_FEEL.playful, rise = feel.rise): number {
  const body = feel.decay * Math.log(Math.max(1, Math.max(rise, feel.mound) / EPS))
  const icon = feel.iconDelay + feel.iconDecay * Math.log(Math.max(1, feel.tilt / EPS))
  return Math.max(body, icon)
}

/**
 * The entrance's pose at `t` seconds (pure, closed form). `bloom` / `wobble` scale the body and
 * the icon (0 = still). `rise` overrides the start shortfall (px; callers cap it to the box).
 */
export function alertPose(t: number, feel: AlertFeel = ALERT_FEEL.playful, bloom = 1, wobble = 1, rise = feel.rise): AlertPose {
  if (!(t > 0) || t >= alertDuration(feel, rise)) return REST
  const w = (2 * Math.PI) / feel.period
  const env = Math.exp(-t / feel.decay)
  const b = bloom > 0 ? bloom : 0
  // Damped cosine: starts `rise` short, overshoots a little past the edge, settles flat.
  const reach = -rise * b * env * Math.cos(w * t)
  // The mound rides the edge's velocity (normalised to 1 at t = 0): out while it travels down,
  // a gentle dip on the way back.
  const mound = feel.mound * b * env * (Math.cos(w * t) + w * feel.decay * Math.sin(w * t)) / (1 + w * feel.decay * 0.6)
  const u = t - feel.iconDelay
  let tilt = 0
  let scale = 1
  if (u > 0 && wobble > 0) {
    const wi = (2 * Math.PI) / feel.iconPeriod
    const ie = Math.exp(-u / feel.iconDecay)
    tilt = feel.tilt * wobble * ie * Math.sin(wi * u)
    scale = 1 + feel.pop * wobble * ie * Math.sin(wi * u + Math.PI / 3)
  }
  return { reach, mound, tilt, scale }
}

export interface AlertShape {
  width: number
  height: number
  radius: number
  /** Border width: the path runs down the middle of the border. */
  border: number
  /** Bottom edge offset (px, + = down). */
  reach: number
  /** Bottom edge mound (px, + = outward), centred `at` px from the left, half-width `spread`. */
  mound: number
  at: number
  spread: number
}

/** Raised cosine bump, 1 at t = 0, 0 at |t| >= 1, smooth both ends (a low, wide mound). */
const bump = (t: number): number => (t <= -1 || t >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t)))
const fmt = (v: number): string => (Math.round(v * 100) / 100).toString()

/**
 * SVG path of the alert's rounded box with its bottom edge moved by `reach` and bulged by the
 * mound, in the alert's own coordinates (0,0 = its top-left border corner). Pure.
 */
export function alertPath(shape: AlertShape): string {
  const { width: w, border } = shape
  const h = Math.max(border + 1, shape.height + shape.reach)
  const i = border / 2
  const r = Math.max(0, Math.min(shape.radius - i, (w - border) / 2, (h - border) / 2))
  const x0 = i
  const y0 = i
  const x1 = w - i
  const y1 = h - i
  const len = Math.max(0, x1 - x0 - 2 * r)
  // The mound fades out before each corner so the corners keep their shape.
  const fade = (s: number): number => {
    const f = Math.min(len / 2, 16)
    return f > 0 ? Math.max(0, Math.min(1, s / f, (len - s) / f)) ** 2 : 0
  }
  const arc = (x: number, y: number): string => (r > 0 ? `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y)}` : `L${fmt(x)} ${fmt(y)}`)
  let d = `M${fmt(x0 + r)} ${fmt(y0)}L${fmt(x1 - r)} ${fmt(y0)}`
  d += arc(x1, y0 + r)
  d += `L${fmt(x1)} ${fmt(y1 - r)}`
  d += arc(x1 - r, y1)
  // Bottom edge, right to left, with the mound.
  const steps = Math.max(12, Math.ceil(len / 4))
  const spread = Math.max(1, shape.spread)
  for (let k = 1; k <= steps; k++) {
    const s = (len * k) / steps
    const x = x1 - r - s
    d += `L${fmt(x)} ${fmt(y1 + shape.mound * bump((x - shape.at) / spread) * fade(s))}`
  }
  d += arc(x0, y1 - r)
  d += `L${fmt(x0)} ${fmt(y0 + r)}`
  d += arc(x0 + r, y0)
  return `${d}Z`
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}
const transparent = (c: string): boolean => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)'

/** `data-goop` value of the entrance layer core inserts into the alert. */
export const ALERT_PART = 'alert'
/** Set on the alert while its entrance plays. */
export const ALERT_BLOOMING_ATTR = 'data-goop-blooming'

/**
 * Attach the goo entrance to an alert element (shadcn's Alert). It plays when the alert is
 * first on screen, and again whenever it is shown after being hidden (`display: none`).
 */
export function attachAlert(host: HTMLElement, initial: AlertOptions = {}): AlertHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let options: AlertOptions = { ...initial }
  const readReduced = (): boolean =>
    options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  // A wrapper span, so the alert's own `has-[>svg]` / `*:[svg]` rules never see the svg.
  const wrap = doc.createElement('span')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.setAttribute('data-goop', ALERT_PART)
  wrap.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:-1;display:none;'
  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('focusable', 'false')
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;'
  const path = doc.createElementNS(SVG_NS, 'path')
  svg.append(path)
  wrap.append(svg)
  host.prepend(wrap)

  const prevPosition = host.style.position
  const prevIsolation = host.style.isolation
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  let feel: AlertFeel = ALERT_FEEL[GOOP_DEFAULT_PRESET]
  let t = 0
  let playing = false
  let box = { w: 0, h: 0, radius: 0, border: 0 }
  let rise = 0
  let at = 0
  let saved: { bg: string; border: string } | null = null
  let icon: SVGElement | HTMLElement | null = null
  let savedIcon: { transform: string; origin: string } | null = null

  const bloom = (): number => effectStrength(options.bloom)
  const wobble = (): number => effectStrength(options.wobble)
  const speed = (): number => (options.speed && options.speed > 0 ? options.speed : 1)
  const active = (): boolean => !reduced && (bloom() > 0 || wobble() > 0)

  /** Read the alert's box and colours, and step its own background and border aside. */
  const begin = (): boolean => {
    const cs = win?.getComputedStyle(host)
    box = {
      w: host.offsetWidth,
      h: host.offsetHeight,
      radius: px(cs?.borderBottomLeftRadius),
      border: px(cs?.borderTopWidth),
    }
    if (!(box.w > 0) || !(box.h > 0)) return false
    feel = ALERT_FEEL[readPreset(host, options.preset)] ?? ALERT_FEEL[GOOP_DEFAULT_PRESET]
    rise = Math.min(feel.rise, box.h * 0.4)
    if (bloom() > 0) {
      const bg = cs?.backgroundColor ?? ''
      const stroke = cs?.borderTopColor ?? ''
      path.setAttribute('fill', transparent(bg) ? 'transparent' : bg)
      if (box.border > 0 && !transparent(stroke)) {
        path.setAttribute('stroke', stroke)
        path.setAttribute('stroke-width', String(box.border))
      } else path.removeAttribute('stroke')
      // Off-centre each time, so no two entrances look the same.
      at = box.w * (0.38 + Math.random() * 0.24)
      wrap.style.left = `${-host.clientLeft}px`
      wrap.style.top = `${-host.clientTop}px`
      wrap.style.width = `${box.w}px`
      wrap.style.height = `${box.h}px`
      svg.setAttribute('width', String(box.w))
      svg.setAttribute('height', String(box.h))
      saved = { bg: host.style.backgroundColor, border: host.style.borderColor }
      host.style.backgroundColor = 'transparent'
      host.style.borderColor = 'transparent'
      wrap.style.display = ''
    }
    // The icon: the alert's own direct svg child (shadcn's layout).
    icon = wobble() > 0 ? ([...host.children].find((c) => c !== wrap && c.tagName.toLowerCase() === 'svg') as SVGElement | undefined) ?? null : null
    if (icon) {
      savedIcon = { transform: icon.style.transform, origin: icon.style.transformOrigin }
      icon.style.transformOrigin = '50% 60%'
    }
    return true
  }

  const finish = (): void => {
    removeTicker(tick)
    playing = false
    wrap.style.display = 'none'
    if (saved) {
      host.style.backgroundColor = saved.bg
      host.style.borderColor = saved.border
      saved = null
    }
    if (icon && savedIcon) {
      icon.style.transform = savedIcon.transform
      icon.style.transformOrigin = savedIcon.origin
    }
    icon = null
    savedIcon = null
    host.removeAttribute(ALERT_BLOOMING_ATTR)
  }

  const draw = (): void => {
    const pose = alertPose(t, feel, saved ? bloom() : 0, icon ? wobble() : 0, rise)
    if (saved) {
      path.setAttribute(
        'd',
        alertPath({
          width: box.w,
          height: box.h,
          radius: box.radius,
          border: box.border,
          reach: pose.reach,
          mound: pose.mound,
          at,
          spread: Math.min(box.w / 2, Math.max(48, feel.width * box.w)),
        }),
      )
    }
    if (icon) icon.style.transform = `rotate(${fmt(pose.tilt)}deg) scale(${(Math.round(pose.scale * 1000) / 1000).toString()})`
  }

  const tick: Ticker = (dt) => {
    if (!playing) return false
    t += dt * speed()
    if (t >= alertDuration(feel, rise)) {
      finish()
      return false
    }
    draw()
    return true
  }

  const play = (): void => {
    if (!active() || playing) return
    if (!begin()) return
    t = 0
    playing = true
    host.setAttribute(ALERT_BLOOMING_ATTR, '')
    draw()
    wakeTicker(tick)
  }

  // Wait until the alert is on screen (an alert mounted below the fold blooms when seen).
  let io: IntersectionObserver | null = null
  const onScreen = (): boolean => {
    const r = host.getBoundingClientRect()
    const vh = win?.innerHeight ?? 0
    return host.offsetWidth > 0 && r.bottom >= 0 && r.top <= vh
  }
  const arm = (): void => {
    io?.disconnect()
    io = null
    if (onScreen() || !win?.IntersectionObserver) {
      play()
      return
    }
    io = new win.IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io?.disconnect()
      io = null
      play()
    })
    io.observe(host)
  }
  arm()

  // Shown again after being hidden (v-show, a closed parent): bloom again.
  let shown = host.offsetWidth > 0
  const ro = win?.ResizeObserver
    ? new win.ResizeObserver(() => {
        const now = host.offsetWidth > 0
        if (now && !shown) arm()
        shown = now
      })
    : null
  ro?.observe(host)

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) finish()
  })

  return {
    replay() {
      finish()
      arm()
    },
    update(next) {
      options = { ...next }
      reduced = readReduced()
      if (!active()) finish()
    },
    get running() {
      return playing
    },
    destroy() {
      finish()
      io?.disconnect()
      io = null
      ro?.disconnect()
      stopWatch()
      wrap.remove()
      host.style.position = prevPosition
      host.style.isolation = prevIsolation
    },
  }
}
