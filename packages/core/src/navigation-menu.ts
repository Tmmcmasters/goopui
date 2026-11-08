// Navigation menu goo (shadcn's NavigationMenu on reka-ui): two existing engines and a jelly box.
//
//   highlight: the hover / focus / open highlight of the top-level items is ONE goo blob that
//              flows between them with momentum: the tabs indicator's feel (`./tabs`
//              TABS_FEEL) on the menu highlight engine (`./menu`), following the hovered
//              item, else the keyboard-focused one, else the trigger whose menu is open. The
//              links inside a content panel get the same blob with the menu's feel.
//   viewport:  the panel blooms out of the active trigger (the emerge engine's bloom, `./emerge`,
//              origin = the trigger), and when another trigger takes over it does NOT re-open:
//              its box (left, width, height) moves on an under-damped spring, so the one goo
//              body slides and resizes and settles with a gentle jelly wobble.
//
// The box reka-ui measures (`--reka-navigation-menu-viewport-*` on its viewport) is the
// target; core publishes the sprung box on the host as NAVIGATION_MENU_VIEWPORT_VARS. Pure
// physics: `navigationMenuJellyStep`. No DOM access until an `attach*` runs (SSR-safe).

import type { GoopPreset } from './constants'
import { attachEmerge, type EmergeHandle, type EmergeOptions, type EmergeState } from './emerge'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import {
  MENU_CONTAINER_ATTR,
  MENU_FEEL,
  attachMenuHighlight,
  type MenuFeel,
  type MenuHighlightHandle,
  type MenuHighlightOptions,
} from './menu'
import { markMovingGooHost } from './page-edge'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { springConfig, stepSpring, type SpringState } from './spring'
import { TABS_FEEL } from './tabs'
import { readPreset } from './tuning'

/** Navigation menu toggles, each a prop in the adapters. All default true.
 *  `highlight`: the goo hover blob on the top-level items. `contentHighlight`: the same blob on
 *  the links inside a panel. `bloom`: the viewport is a goo body that blooms from its trigger
 *  (false: shadcn's zoom). `jelly`: the viewport springs between triggers (false: it jumps).
 *  `wobble`: overshoot everywhere. `momentum`: the blob stretches and necks as it travels. */
export const NAVIGATION_MENU_EFFECTS = ['highlight', 'contentHighlight', 'bloom', 'jelly', 'wobble', 'momentum'] as const
export type NavigationMenuEffect = (typeof NAVIGATION_MENU_EFFECTS)[number]

/** Feel of the top-level highlight (sideways travel across a bar, like tabs). */
export const NAVIGATION_MENU_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = TABS_FEEL
/** Feel of the highlight on the links inside a panel (rows and grids, like a menu). */
export const NAVIGATION_MENU_CONTENT_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = MENU_FEEL

/** Per-preset spring of the viewport box. Under 1 overshoots: the jelly settle. */
export const NAVIGATION_MENU_JELLY: Readonly<Record<GoopPreset, Readonly<{ response: number; dampingRatio: number }>>> =
  Object.freeze({
    subtle: Object.freeze({ response: 0.3, dampingRatio: 0.88 }),
    playful: Object.freeze({ response: 0.36, dampingRatio: 0.66 }),
    wild: Object.freeze({ response: 0.42, dampingRatio: 0.5 }),
  })

/** A top-level item (trigger or link) or a panel link the highlight rides. Set by the adapter. */
export const NAVIGATION_MENU_ITEM_ATTR = 'data-goop-nav-item'
/** A highlight scope (the list, a content panel): items belong to their nearest scope. */
export const NAVIGATION_MENU_SCOPE_ATTR = 'data-goop-nav-scope'
/** CSS vars core publishes on the viewport host: the sprung box, in px (left is relative to
 *  the navigation menu root, like reka's `--reka-navigation-menu-viewport-left`). */
export const NAVIGATION_MENU_VIEWPORT_VARS = Object.freeze({
  left: '--goop-nav-viewport-left',
  width: '--goop-nav-viewport-width',
  height: '--goop-nav-viewport-height',
})

// ---- highlight ------------------------------------------------------------------------------

const SCOPES = `[${MENU_CONTAINER_ATTR}],[${NAVIGATION_MENU_SCOPE_ATTR}]`

/** The highlighted item of `container`: the one core marked `data-highlighted` (hover or
 *  keyboard focus), else a trigger whose menu is open (reka `data-navigation-menu-trigger` +
 *  `data-state="open"`). Items of nested scopes (a panel inside the list) are skipped. */
export function findNavigationMenuHighlight(container: Element): Element | null {
  const own = (el: Element) => el.parentElement?.closest(SCOPES) === container
  for (const el of container.querySelectorAll(`[${NAVIGATION_MENU_ITEM_ATTR}][data-highlighted]`)) if (own(el)) return el
  for (const el of container.querySelectorAll('[data-navigation-menu-trigger][data-state="open"]')) if (own(el)) return el
  return null
}

export interface NavigationMenuHighlightOptions extends Omit<MenuHighlightOptions, 'find' | 'pop' | 'followPointer'> {}

/**
 * Attach the goo highlight to a navigation menu list (or a content panel): `container` holds
 * items marked NAVIGATION_MENU_ITEM_ATTR. Marks the hovered (mouse / pen) or keyboard-focused
 * item `data-highlighted` and lets the menu highlight blob follow it, falling back to the open
 * trigger. Default feel NAVIGATION_MENU_FEEL. Disabled items are skipped.
 */
export function attachNavigationMenuHighlight(
  container: HTMLElement,
  options: NavigationMenuHighlightOptions = {},
): MenuHighlightHandle {
  const doc = container.ownerDocument
  const El = doc.defaultView?.Element
  let lit: Element | null = null
  const usable = (b: Element | null): b is HTMLElement =>
    !!b &&
    container.contains(b) &&
    !b.hasAttribute('disabled') &&
    b.getAttribute('aria-disabled') !== 'true' &&
    b.getAttribute('data-disabled') === null &&
    (b.parentElement?.closest(SCOPES) ?? null) === container
  const itemOf = (t: EventTarget | null): Element | null => {
    const b = El && t instanceof El ? t.closest(`[${NAVIGATION_MENU_ITEM_ATTR}]`) : null
    return usable(b) ? b : null
  }
  let handle: MenuHighlightHandle | null = null
  const light = (b: Element | null): void => {
    if (b === lit) return
    lit?.removeAttribute('data-highlighted')
    lit = b
    lit?.setAttribute('data-highlighted', '')
    handle?.refresh()
  }
  const focusVisible = (el: Element): boolean => {
    try {
      return el.matches(':focus-visible')
    } catch {
      return true
    }
  }
  const hovered = (el: Element): boolean => {
    try {
      return el.matches(':hover')
    } catch {
      return false
    }
  }
  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return
    light(itemOf(e.target))
  }
  const onLeave = (): void => {
    if (lit && lit === doc.activeElement && focusVisible(lit)) return
    light(null)
  }
  const onFocus = (e: FocusEvent): void => {
    const b = itemOf(e.target)
    if (b && focusVisible(b)) light(b)
  }
  const onBlur = (e: FocusEvent): void => {
    if (itemOf(e.target) === lit && !(lit && hovered(lit))) light(null)
  }
  container.addEventListener('pointerover', onOver, { passive: true })
  container.addEventListener('pointerleave', onLeave, { passive: true })
  container.addEventListener('focusin', onFocus)
  container.addEventListener('focusout', onBlur)
  const ownScope = !container.hasAttribute(NAVIGATION_MENU_SCOPE_ATTR)
  container.setAttribute(NAVIGATION_MENU_SCOPE_ATTR, '')
  handle = attachMenuHighlight(container, {
    feel: NAVIGATION_MENU_FEEL,
    ...options,
    pop: false,
    followPointer: false,
    find: findNavigationMenuHighlight,
  })
  const h = handle
  return {
    pop: () => 0,
    refresh: () => h.refresh(),
    update: (next) => h.update({ ...next, pop: false, followPointer: false }),
    get target() {
      return h.target
    },
    get reducedMotion() {
      return h.reducedMotion
    },
    get element() {
      return h.element
    },
    destroy() {
      container.removeEventListener('pointerover', onOver)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('focusin', onFocus)
      container.removeEventListener('focusout', onBlur)
      light(null)
      handle = null
      h.destroy()
      if (ownScope) container.removeAttribute(NAVIGATION_MENU_SCOPE_ATTR)
    },
  }
}

// ---- viewport jelly box ---------------------------------------------------------------------

/** The viewport's box: left (relative to the menu root), width, height, in px. */
export interface NavigationMenuBox {
  left: number
  width: number
  height: number
}

export interface NavigationMenuJellyState {
  left: SpringState
  width: SpringState
  height: SpringState
}

/** A jelly box resting on `box`. */
export function navigationMenuJellyInit(box: NavigationMenuBox): NavigationMenuJellyState {
  return {
    left: { x: box.left, v: 0 },
    width: { x: box.width, v: 0 },
    height: { x: box.height, v: 0 },
  }
}

/** The box `s` currently draws. */
export function navigationMenuJellyBox(s: NavigationMenuJellyState): NavigationMenuBox {
  return { left: s.left.x, width: Math.max(0, s.width.x), height: Math.max(0, s.height.x) }
}

/**
 * Advance the box `dt` seconds toward `target` (mutates `s`). `wobble: false` uses a critically
 * damped spring of the same response (no overshoot). The size and the slide share a spring, so
 * the body moves as one; the slide lags the resize a touch, which reads as jelly, not a frame.
 */
export function navigationMenuJellyStep(
  s: NavigationMenuJellyState,
  target: NavigationMenuBox,
  dt: number,
  feel: { response: number; dampingRatio: number } = NAVIGATION_MENU_JELLY.playful,
  wobble = true,
): void {
  const f = wobble ? feel : { response: feel.response, dampingRatio: 1 }
  const size = springConfig(f)
  const slide = springConfig({ response: f.response * 1.12, dampingRatio: f.dampingRatio })
  stepSpring(s.width, target.width, size, dt)
  stepSpring(s.height, target.height, size, dt)
  stepSpring(s.left, target.left, slide, dt)
}

/** True once the box rests on `target`. */
export function navigationMenuJellySettled(s: NavigationMenuJellyState, target: NavigationMenuBox): boolean {
  const near = (sp: SpringState, to: number) => Math.abs(sp.x - to) < 0.1 && Math.abs(sp.v) < 1
  return near(s.left, target.left) && near(s.width, target.width) && near(s.height, target.height)
}

export interface NavigationMenuViewportOptions extends EmergeOptions {
  /** The box the viewport should take (reka's measured size and left), or null when it has
   *  none yet. Read every frame while moving. */
  target?: () => NavigationMenuBox | null
  /** Spring between triggers (default true). false: the box jumps to each new size. */
  jelly?: boolean
  /** Per-preset jelly spring. Default NAVIGATION_MENU_JELLY. */
  jellyFeel?: Readonly<Record<GoopPreset, Readonly<{ response: number; dampingRatio: number }>>>
}

export interface NavigationMenuViewportHandle {
  /** Bloom open (out of `bloomOrigin`, usually the active trigger). */
  open(): void
  /** Shrink back into the trigger. Returns the close duration in ms. */
  close(): number
  /** Re-read the target box (the content or the active trigger changed). */
  refresh(): void
  update(opts?: NavigationMenuViewportOptions): void
  readonly state: EmergeState
  readonly reducedMotion: boolean
  /** The box being drawn. */
  readonly box: NavigationMenuBox | null
  /** The emerge surface handle underneath. */
  readonly emerge: EmergeHandle
  destroy(): void
}

const READY_FRAMES = 20

/**
 * Attach the goo viewport to `host`: the box element that holds reka's viewport (sized from
 * NAVIGATION_MENU_VIEWPORT_VARS by the adapter's CSS). The panel is an emerge bloom on `host`;
 * its box follows `target()` on the jelly spring while open, and snaps to it when opening from
 * closed. Reduced motion: the box jumps and the emerge engine is static.
 */
export function attachNavigationMenuViewport(
  host: HTMLElement,
  options: NavigationMenuViewportOptions = {},
): NavigationMenuViewportHandle {
  const doc = host.ownerDocument
  let opts: NavigationMenuViewportOptions = { ...options }
  let destroyed = false
  let s: NavigationMenuJellyState | null = null
  let goal: NavigationMenuBox | null = null
  let waiting = 0
  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  const jellyFeel = () => (opts.jellyFeel ?? NAVIGATION_MENU_JELLY)[readPreset(host, opts.preset)]
  const speed = (): number => Math.max(0.05, opts.speed ?? 1)

  const valid = (b: NavigationMenuBox | null | undefined): b is NavigationMenuBox =>
    !!b && Number.isFinite(b.left) && b.width > 0 && b.height > 0
  const readTarget = (): NavigationMenuBox | null => {
    const b = opts.target?.()
    return valid(b) ? b : null
  }

  const write = (): void => {
    if (!s) return
    const b = navigationMenuJellyBox(s)
    const px = (v: number) => `${Math.round(v * 100) / 100}px`
    host.style.setProperty(NAVIGATION_MENU_VIEWPORT_VARS.left, px(b.left))
    host.style.setProperty(NAVIGATION_MENU_VIEWPORT_VARS.width, px(b.width))
    host.style.setProperty(NAVIGATION_MENU_VIEWPORT_VARS.height, px(b.height))
  }

  // The panel slides every frame: its goo layer re-cuts at the page edge per frame.
  const surface = doc.createElement('span')
  host.prepend(surface)
  markMovingGooHost(surface)
  const emergeOpts = (): EmergeOptions => {
    const { target: _t, jelly: _j, jellyFeel: _f, ...rest } = opts
    return { ...rest, surface, ready: () => s !== null && (rest.ready?.() ?? true) }
  }
  const emerge = attachEmerge(host, emergeOpts())

  /** Snap onto the target (opening from closed, reduced motion, jelly off). */
  const snap = (b: NavigationMenuBox): void => {
    s = navigationMenuJellyInit(b)
    write()
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    const next = readTarget()
    if (next) goal = next
    if (!goal) return waiting++ < READY_FRAMES
    waiting = 0
    const still = reduced || opts.jelly === false || !s || emerge.state === 'closed'
    if (still) {
      snap(goal)
      emerge.refresh()
      return false
    }
    navigationMenuJellyStep(s!, goal, dt * speed(), jellyFeel(), opts.wobble !== false)
    write()
    emerge.refresh()
    if (navigationMenuJellySettled(s!, goal)) {
      snap(goal)
      emerge.refresh()
      return false
    }
    return true
  }

  const kick = (): void => {
    if (destroyed) return
    waiting = 0
    if (reduced) tick(0)
    else wakeTicker(tick)
  }

  // reka rewrites its size / position vars on the viewport (a child) as content changes.
  const win = doc.defaultView
  const mo = win?.MutationObserver
    ? new win.MutationObserver((records) => {
        if (records.some((r) => r.target !== host && r.target !== surface)) kick()
      })
    : null
  mo?.observe(host, { subtree: true, attributes: true, attributeFilter: ['style', 'data-state'] })

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) removeTicker(tick)
    kick()
  })

  const first = readTarget()
  if (first) {
    goal = first
    snap(first)
  }

  return {
    open() {
      if (destroyed) return
      // From closed the box takes its new place at once; mid-close it slides there instead.
      if (emerge.state === 'closed') {
        const b = readTarget()
        if (b) {
          goal = b
          snap(b)
        } else s = null
      }
      emerge.open()
      kick()
    },
    close() {
      if (destroyed) return 0
      return emerge.close()
    },
    refresh() {
      kick()
    },
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      reduced = readReduced()
      if (reduced) removeTicker(tick)
      emerge.update(emergeOpts())
      kick()
    },
    get state() {
      return emerge.state
    },
    get reducedMotion() {
      return reduced
    },
    get box() {
      return s ? navigationMenuJellyBox(s) : null
    },
    get emerge() {
      return emerge
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      mo?.disconnect()
      unwatch()
      emerge.destroy()
      surface.remove()
      for (const v of Object.values(NAVIGATION_MENU_VIEWPORT_VARS)) host.style.removeProperty(v)
    },
  }
}
