// Live reduced-motion detection, shared per document.
// Reduced when EITHER the OS asks for it (prefers-reduced-motion: reduce) OR the app sets
// <html data-reduced-motion="true"> (playground / app-level toggle). Both are watched live.

const QUERY = '(prefers-reduced-motion: reduce)'

type Listener = (reduced: boolean) => void

interface Watcher {
  listeners: Set<Listener>
  value: boolean
  stop: () => void
}

const watchers = new WeakMap<Document, Watcher>()

/** One-shot check, no subscription. */
export function isReducedMotion(doc: Document): boolean {
  const attr = doc.documentElement?.dataset?.reducedMotion === 'true'
  const mq = doc.defaultView?.matchMedia?.(QUERY)
  return attr || !!mq?.matches
}

/**
 * Subscribe to reduced-motion changes for `doc`. The callback fires only on changes (not
 * immediately). Returns an unsubscribe; the underlying media listener and MutationObserver
 * are torn down when the last subscriber leaves.
 */
export function watchReducedMotion(doc: Document, cb: Listener): () => void {
  let w = watchers.get(doc)
  if (!w) {
    const listeners = new Set<Listener>()
    const watcher: Watcher = { listeners, value: isReducedMotion(doc), stop: () => {} }
    const recheck = (): void => {
      const next = isReducedMotion(doc)
      if (next === watcher.value) return
      watcher.value = next
      for (const l of Array.from(listeners)) l(next)
    }
    const mq = doc.defaultView?.matchMedia?.(QUERY)
    mq?.addEventListener?.('change', recheck)
    const MO = doc.defaultView?.MutationObserver
    const mo = MO ? new MO(recheck) : undefined
    if (mo && doc.documentElement) {
      mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-reduced-motion'] })
    }
    watcher.stop = () => {
      mq?.removeEventListener?.('change', recheck)
      mo?.disconnect()
    }
    w = watcher
    watchers.set(doc, w)
  }
  const watcher = w
  watcher.listeners.add(cb)
  let active = true
  return () => {
    if (!active) return
    active = false
    watcher.listeners.delete(cb)
    if (watcher.listeners.size === 0) {
      watcher.stop()
      watchers.delete(doc)
    }
  }
}
