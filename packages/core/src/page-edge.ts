// Page-edge guard: goo must never grow the page's scroll size.
//
// A goo layer is padded past its host on purpose (hanging and falling drips, splash drops,
// overshoot) and lives in normal page flow, so it scrolls and stacks with its component. Any
// of it past the document's right or bottom edge would add to the document's scrollable
// overflow. Nothing past that edge can ever be seen, so a layer near the edge is cut back to
// it: the renderer sets the layer box's far side to `cut` px past the host and clips its
// contents (`overflow: clip`, which also stops clipped descendants counting as overflow).
// The cut never goes inside the goo's visible reach unless the page edge is closer, so on
// screen nothing changes.
//
// The edge is the larger of the viewport edge and the in-flow extent of <html> / <body>.
// Both are at or inside the document's scroll extent and neither includes goo, so the cut
// can't ratchet. Layers in a fixed subtree (overlays, toasts, dialogs) never add to the
// document's overflow and are left alone. One shared watcher per document (created with the
// first layer, removed with the last): html/body resize and window resize re-cut every layer;
// scroll does too when the viewport, not the content, sets the edge. Renderers re-cut their
// own layer when its padding changes and when goo spawns. Everything is measured in one
// batch per frame: reads first, then writes.

/** Per side: null = free (no clip), or how far past the host the layer box may reach (px). */
export interface PageEdgeCut {
  right: number | null
  bottom: number | null
}

export interface PageEdgeClient {
  host: HTMLElement
  /** Extra room kept for goo drawn outside the visible reach (default PAGE_EDGE_MARGIN). */
  margin?: number
  /** How far visible goo can reach past the host's right and bottom edges (px). */
  reach(): { right: number; bottom: number }
  /** Apply a new cut (only called when it changes). `pending`: a stopgap until the next
   *  measure (see refresh), so skip anything expensive. */
  apply(cut: PageEdgeCut, pending?: boolean): void
}

export interface PageEdgeWatch {
  /** Re-measure on the next frame (batched with every other layer). With `boxChanged`
   *  (the layer's padding just grew), the layer is cut to its host until then, so it never
   *  shows uncut for a frame: one frame of clipped goo beats a page that jumps. */
  refresh(boxChanged?: boolean): void
  /** For hosts that move every frame (a menu/tabs highlight): call after a frame's draw.
   *  Near the page edge it re-measures right away (a layout read), so the cut keeps up. */
  track(): void
  release(): void
}

const movingHosts = new WeakSet<Element>()

/** Mark `host` as moving every frame while it animates: its renderer re-cuts per frame
 *  near the page edge (see PageEdgeWatch.track). */
export function markMovingGooHost(host: Element): void {
  movingHosts.add(host)
}

/** Was `host` marked with markMovingGooHost? */
export function isMovingGooHost(host: Element): boolean {
  return movingHosts.has(host)
}

/** Goo outside its visible reach (strays past the filter region) still counts as overflow,
 *  so a layer is clipped once its reach comes within this distance of the page edge. */
export const PAGE_EDGE_MARGIN = 400

interface Entry {
  client: PageEdgeClient
  cut: PageEdgeCut
  fixed: boolean | null
  dirty: boolean
}

interface DocState {
  entries: Set<Entry>
  schedule(): void
  now(list: Entry[]): void
  observe(e: Entry): void
  unobserve(e: Entry): void
  teardown(): void
}

const docs = new WeakMap<Document, DocState>()

/** Is `el` inside (or itself) a position:fixed box? Fixed boxes never grow the document. */
function inFixed(el: HTMLElement): boolean {
  const win = el.ownerDocument.defaultView
  if (!win) return false
  let e: Element | null = el
  // offsetParent chains end at <body> for in-flow content and at the fixed box otherwise.
  while (e instanceof win.HTMLElement) {
    const next: Element | null = e.offsetParent
    if (!next) {
      if (e === el.ownerDocument.body) return false
      try {
        return win.getComputedStyle(e).position === 'fixed'
      } catch {
        return false
      }
    }
    e = next
  }
  return false
}

const FREE: PageEdgeCut = { right: null, bottom: null }

/**
 * How far goo may reach past a host edge (pure). null = anywhere: the visible reach plus
 * `margin` stays inside the page. Otherwise the smaller of the reach and the room to the
 * page edge. Negative when the host itself pokes past the page edge (the goo is cut there too).
 */
export function pageEdgeLimit(hostEdge: number, reach: number, pageEdge: number, margin = PAGE_EDGE_MARGIN): number | null {
  if (reach <= 0) return null
  const room = pageEdge - hostEdge
  if (reach + margin <= room) return null
  return Math.floor(Math.min(room, reach))
}

/** Measure the dirty entries. Returns true when the viewport (not the content) set an edge. */
function measure(doc: Document, entries: Iterable<Entry>): boolean {
  const de = doc.documentElement
  const body = doc.body
  // Page edge in client coordinates (the same frame as getBoundingClientRect).
  let flowX = -Infinity
  let flowY = -Infinity
  for (const el of body ? [de, body] : [de]) {
    const r = el.getBoundingClientRect()
    flowX = Math.max(flowX, r.right)
    flowY = Math.max(flowY, r.bottom)
  }
  const edgeX = Math.floor(Math.max(flowX, de.clientWidth))
  const edgeY = Math.floor(Math.max(flowY, de.clientHeight))
  const next: [Entry, PageEdgeCut][] = []
  for (const e of entries) {
    if (!e.dirty) continue
    const { host } = e.client
    // Not laid out yet: stay dirty (the host's ResizeObserver fires once it is).
    if (!host.isConnected) continue
    const r = host.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    e.dirty = false
    e.fixed ??= inFixed(host)
    const reach = e.client.reach()
    const margin = e.client.margin ?? PAGE_EDGE_MARGIN
    const cut = e.fixed
      ? FREE
      : { right: pageEdgeLimit(r.right, reach.right, edgeX, margin), bottom: pageEdgeLimit(r.bottom, reach.bottom, edgeY, margin) }
    if (cut.right !== e.cut.right || cut.bottom !== e.cut.bottom) next.push([e, cut])
  }
  // Reads first, then writes.
  for (const [e, cut] of next) {
    e.cut = cut
    e.client.apply(cut)
  }
  return flowX < de.clientWidth || flowY < de.clientHeight
}

function stateFor(doc: Document): DocState {
  const existing = docs.get(doc)
  if (existing) return existing
  const win = doc.defaultView
  const entries = new Set<Entry>()
  let raf = 0
  let viewportBound = false
  const run = (): void => {
    raf = 0
    viewportBound = measure(doc, entries)
  }
  const schedule = (): void => {
    if (raf) return
    if (win) raf = win.requestAnimationFrame(run)
    else run()
  }
  const all = (): void => {
    for (const e of entries) e.dirty = true
    schedule()
  }
  // Scrolling only moves the edge when the viewport, not the content, set it.
  const onScroll = (): void => {
    if (viewportBound) all()
  }
  let ro: ResizeObserver | null = null
  // Hosts resizing (an accordion item opening, a label changing) move their own far edges.
  let hostRo: ResizeObserver | null = null
  const byHost = new Map<Element, Set<Entry>>()
  if (win && typeof win.ResizeObserver === 'function') {
    ro = new win.ResizeObserver(all)
    ro.observe(doc.documentElement)
    if (doc.body) ro.observe(doc.body)
    hostRo = new win.ResizeObserver((records) => {
      for (const r of records) for (const e of byHost.get(r.target) ?? []) e.dirty = true
      schedule()
    })
  }
  win?.addEventListener('resize', all, { passive: true })
  win?.addEventListener('scroll', onScroll, { passive: true })
  const st: DocState = {
    entries,
    schedule,
    now(list) {
      measure(doc, list)
    },
    observe(e) {
      const h = e.client.host
      let set = byHost.get(h)
      if (!set) {
        byHost.set(h, (set = new Set()))
        hostRo?.observe(h)
      }
      set.add(e)
    },
    unobserve(e) {
      const h = e.client.host
      const set = byHost.get(h)
      if (!set) return
      set.delete(e)
      if (set.size === 0) {
        byHost.delete(h)
        hostRo?.unobserve(h)
      }
    },
    teardown() {
      ro?.disconnect()
      hostRo?.disconnect()
      win?.removeEventListener('resize', all)
      win?.removeEventListener('scroll', onScroll)
      if (raf) win?.cancelAnimationFrame(raf)
      raf = 0
      docs.delete(doc)
    },
  }
  docs.set(doc, st)
  return st
}

/** Keep a goo layer from growing its host's document. Measures on the next frame. */
export function watchPageEdge(client: PageEdgeClient): PageEdgeWatch {
  const doc = client.host.ownerDocument
  const st = stateFor(doc)
  const entry: Entry = { client, cut: FREE, fixed: null, dirty: true }
  st.entries.add(entry)
  st.observe(entry)
  st.schedule()
  let released = false
  return {
    refresh(boxChanged) {
      if (released) return
      // A host can move into or out of a fixed subtree (e.g. mounted before a teleport).
      const wasFixed = entry.fixed
      entry.fixed = null
      entry.dirty = true
      if (boxChanged && wasFixed !== true) {
        const r = client.reach()
        const pending = { right: r.right > 0 ? 0 : null, bottom: r.bottom > 0 ? 0 : null }
        if (pending.right !== entry.cut.right || pending.bottom !== entry.cut.bottom) {
          entry.cut = pending
          client.apply(pending, true)
        }
      }
      st.schedule()
    },
    track() {
      if (released || entry.fixed || (entry.cut.right === null && entry.cut.bottom === null)) return
      entry.dirty = true
      st.now([entry])
    },
    release() {
      if (released) return
      released = true
      st.unobserve(entry)
      st.entries.delete(entry)
      if (st.entries.size === 0) st.teardown()
    },
  }
}

/** For tests / devtools: layers watched in `doc`. */
export function pageEdgeWatchCount(doc: Document): number {
  return docs.get(doc)?.entries.size ?? 0
}
