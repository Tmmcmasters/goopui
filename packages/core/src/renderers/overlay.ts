// Page-level goo overlay: one fixed, full-viewport, pointer-events:none surface that goo can
// fly across (escaping splash particles, drops thrown out of a component, etc.).
//
// It is just a GoopRenderer on a fixed host, so it sits behind the same seam as per-element
// goo and works with either renderer. With 'canvas' it costs one more 2D canvas drawn by
// the SAME shared WebGL context (no extra context) and drops its pixels when empty.
// Coordinates are viewport (client) px. Overlays are ref-counted per document + renderer
// + color + params; the host element is removed with the last release.

import { GOOP_DEFAULTS } from '../constants'
import type { GooFilterParams } from '../filter'
import type { GoopBlob, GoopRenderer } from '../renderer'
import type { GoopFinish, GoopFinishRenderer } from './finish'
import { resolveRenderer, type GoopRendererOption } from './resolve'

export interface GoopOverlayOptions {
  /** Default 'canvas': big particle counts and a full-viewport surface are its strength. */
  renderer?: GoopRendererOption
  /** Goo color (any CSS color or var()). Default: inherits `--goop-color` / `currentColor` from <body>. */
  color?: string
  /** Filter params; default GOOP_DEFAULTS. */
  params?: Partial<GooFilterParams>
  /** Stacking of the overlay host. Default 2147483000 (above page content). */
  zIndex?: number
  /** Finish for everything on this overlay (e.g. { finish: 'oil' }). */
  finish?: Partial<GoopFinish>
}

export interface GoopOverlay {
  /** Viewport-space blobs: set(clientX, clientY, r, ...). */
  createBlob(): GoopBlob
  /** Draw after setting blobs (once per frame). */
  flush(): void
  /** The fixed host element. */
  readonly host: HTMLElement
  /** Drop this reference. The overlay is torn down with the last one. Idempotent. */
  release(): void
}

/** Marker attribute on overlay hosts. */
export const GOOP_OVERLAY_ATTR = 'data-goop-overlay'

interface Entry {
  refs: number
  host: HTMLElement
  renderer: GoopRenderer
}

const overlays = new WeakMap<Document, Map<string, Entry>>()
const factoryIds = new WeakMap<object, number>()
let nextFactoryId = 1

const keyOf = (r: GoopRendererOption | undefined, color: string, p: GooFilterParams, z: number): string => {
  const rk = typeof r === 'function' ? `f${factoryIds.get(r) ?? (factoryIds.set(r, nextFactoryId), nextFactoryId++)}` : (r ?? 'canvas')
  return `${rk}|${color}|${p.blur}|${p.contrast}|${p.threshold}|${z}`
}

/** For tests / devtools: live overlay hosts in `doc`. */
export function goopOverlayCount(doc: Document): number {
  return overlays.get(doc)?.size ?? 0
}

/** Get (or create) a shared page overlay and take a reference on it. */
export function acquireGoopOverlay(doc: Document, options: GoopOverlayOptions = {}): GoopOverlay {
  const params: GooFilterParams = {
    blur: options.params?.blur ?? GOOP_DEFAULTS.blur,
    contrast: options.params?.contrast ?? GOOP_DEFAULTS.contrast,
    threshold: options.params?.threshold ?? GOOP_DEFAULTS.threshold,
  }
  // No color given: inherit --goop-color / currentColor from <body>. (Setting
  // `--goop-color: var(--goop-color, ...)` on the host would be a self-referencing cycle.)
  const color = options.color ?? ''
  const z = options.zIndex ?? 2147483000
  const rendererOpt = options.renderer ?? 'canvas'
  const key = `${keyOf(rendererOpt, color, params, z)}|${JSON.stringify(options.finish ?? {})}`
  let map = overlays.get(doc)
  if (!map) overlays.set(doc, (map = new Map()))
  let entry = map.get(key)
  if (!entry) {
    const host = doc.createElement('div')
    host.setAttribute(GOOP_OVERLAY_ATTR, '')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText =
      `position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:${z};` +
      'isolation:isolate;overflow:hidden;contain:strict;' +
      (color ? `color:${color};--goop-color:${color};` : '')
    ;(doc.body ?? doc.documentElement).append(host)
    const renderer = resolveRenderer(rendererOpt)(host, params)
    renderer.setPadding({ side: 0, bottom: 0 })
    renderer.setBodyScale(0, 0) // no body: free goo only
    if (options.finish) (renderer as GoopFinishRenderer).setFinish?.(options.finish)
    entry = { refs: 0, host, renderer }
    map.set(key, entry)
  }
  entry.refs++
  const e = entry
  const m = map
  let released = false
  return {
    host: e.host,
    createBlob: () => e.renderer.createBlob(),
    flush: () => e.renderer.flush(),
    release() {
      if (released) return
      released = true
      e.refs--
      if (e.refs > 0) return
      e.renderer.destroy()
      e.host.remove()
      m.delete(key)
      if (m.size === 0) overlays.delete(doc)
    },
  }
}
