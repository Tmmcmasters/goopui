// A manual clock + seeded randomness for @goopui/core, installed only while a frame's goo is
// being built and replayed (then the real browser globals are put back, so the Remotion
// Studio player and React keep working).
//
// What core reads for time / scheduling / randomness, and how each is covered:
//   requestAnimationFrame / cancelAnimationFrame  shared loop (loop.ts), canvas renderer
//                                                  repaint + oil sheen loops -> manual queue
//   performance.now()                              pointer + scroll velocity trackers, loop
//                                                  stats, canvas oil film time -> manual clock
//   setTimeout / clearTimeout                      taffy long-press arming, click suppression
//                                                  -> timers on the manual clock
//   Date.now()                                     only a fallback when `performance` is
//                                                  missing; patched anyway
//   Math.random()                                  default RNG (we also pass `random`) and
//                                                  ParticleFluid's fallback -> seeded PRNG
//   ResizeObserver / IntersectionObserver          fire asynchronously at the browser's own
//                                                  rendering steps, outside our control ->
//                                                  inert stubs. Layout in the promo is static
//                                                  and core reads sizes synchronously at attach.
//   MutationObserver                               records for real, but callbacks run only
//                                                  from flushMutations() (scene replays call
//                                                  it each substep; the v6 replayer never does,
//                                                  so for it they stay inert as before).
//   matchMedia                                     (hover: hover) -> true, reduced motion ->
//                                                  false, resolution -> inert: a rendered video
//                                                  has no viewer preference to honor.
//   queueMicrotask                                 the canvas renderer batches its GL draw in a
//                                                  microtask; we let those drain before restoring.

export interface FakeEnv {
  /** Current fake time in ms. */
  now(): number
  /** Advance the clock by `ms` and run every animation frame callback that was queued. */
  advance(ms: number): void
  /** Number of queued animation frame callbacks. */
  pending(): number
  /** Deliver pending MutationObserver records synchronously (see ManualMutationObserver). */
  flushMutations(): void
  /** Put the real globals back. Idempotent. */
  restore(): void
}

/** mulberry32: tiny, fast, good-enough seeded PRNG. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class InertObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return []
  }
}

const fakeMql = (media: string, matches: boolean): MediaQueryList =>
  ({
    media,
    matches,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList

/** Start time of the fake clock (ms). Non-zero so nothing mistakes it for "unset". */
export const FAKE_EPOCH_MS = 10_000

export function installFakeEnv(seed: number): FakeEnv {
  const win = window as unknown as Record<string, unknown>
  const perf = performance as unknown as Record<string, unknown>
  const saved = {
    raf: win.requestAnimationFrame,
    caf: win.cancelAnimationFrame,
    st: win.setTimeout,
    ct: win.clearTimeout,
    RO: win.ResizeObserver,
    IO: win.IntersectionObserver,
    MO: win.MutationObserver,
    matchMedia: win.matchMedia,
    perfNowOwn: Object.prototype.hasOwnProperty.call(perf, 'now'),
    perfNow: perf.now,
    dateNow: Date.now,
    random: Math.random,
  }
  const realMatchMedia = window.matchMedia.bind(window)

  let now = FAKE_EPOCH_MS
  let nextId = 1_000_000_000 // far away from real rAF ids
  const queue = new Map<number, FrameRequestCallback>()
  const timers = new Map<number, { due: number; fn: () => void }>()
  const rng = seededRandom(seed)

  win.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = nextId++
    queue.set(id, cb)
    return id
  }
  win.cancelAnimationFrame = (id: number): void => {
    queue.delete(id)
  }
  win.setTimeout = (fn: unknown, ms = 0, ...args: unknown[]): number => {
    const id = nextId++
    if (typeof fn === 'function') timers.set(id, { due: now + Math.max(0, Number(ms) || 0), fn: () => fn(...args) })
    return id
  }
  win.clearTimeout = (id: number): void => {
    timers.delete(id)
  }
  Object.defineProperty(performance, 'now', { configurable: true, writable: true, value: () => now })
  Date.now = () => Math.round(now)
  Math.random = rng
  win.ResizeObserver = InertObserver
  win.IntersectionObserver = InertObserver
  win.matchMedia = (q: string): MediaQueryList => {
    if (q.includes('hover')) return fakeMql(q, true)
    if (q.includes('prefers-reduced-motion')) return fakeMql(q, false)
    if (q.includes('resolution')) return fakeMql(q, true)
    return realMatchMedia(q)
  }

  // MutationObserver: a real observer records mutations, but its callback only runs when the
  // replayer calls flushMutations() (after each scripted DOM change / pointer event), never
  // in a browser microtask, so modules that follow the DOM (toasts, menus, sliders) react at a
  // deterministic point in the replay.
  const RealMO = saved.MO as typeof MutationObserver
  const observers = new Set<ManualObserver>()
  class ManualObserver {
    private readonly real: MutationObserver
    constructor(private readonly cb: MutationCallback) {
      this.real = new RealMO(() => {})
    }
    observe(target: Node, init?: MutationObserverInit): void {
      observers.add(this)
      this.real.observe(target, init)
    }
    disconnect(): void {
      observers.delete(this)
      this.real.disconnect()
    }
    takeRecords(): MutationRecord[] {
      return this.real.takeRecords()
    }
    flush(): boolean {
      const recs = this.real.takeRecords()
      if (recs.length) this.cb(recs, this as unknown as MutationObserver)
      return recs.length > 0
    }
  }
  win.MutationObserver = ManualObserver

  let live = true
  return {
    flushMutations() {
      // A callback can mutate again; a few rounds settle it.
      for (let round = 0; round < 4; round++) {
        let any = false
        for (const o of Array.from(observers)) if (o.flush()) any = true
        if (!any) break
      }
    },
    now: () => now,
    pending: () => queue.size,
    advance(ms) {
      now += ms
      // Timers first (in due order, including ones they schedule), then animation frames.
      for (;;) {
        let next: [number, { due: number; fn: () => void }] | undefined
        for (const e of timers) if (e[1].due <= now && (!next || e[1].due < next[1].due)) next = e
        if (!next) break
        timers.delete(next[0])
        next[1].fn()
      }
      const due = Array.from(queue.values())
      queue.clear()
      for (const cb of due) cb(now)
    },
    restore() {
      if (!live) return
      live = false
      queue.clear()
      timers.clear()
      for (const o of Array.from(observers)) o.disconnect()
      win.setTimeout = saved.st
      win.clearTimeout = saved.ct
      win.requestAnimationFrame = saved.raf
      win.cancelAnimationFrame = saved.caf
      win.ResizeObserver = saved.RO
      win.IntersectionObserver = saved.IO
      win.MutationObserver = saved.MO
      win.matchMedia = saved.matchMedia
      if (saved.perfNowOwn) perf.now = saved.perfNow
      else delete perf.now
      Date.now = saved.dateNow
      Math.random = saved.random
    },
  }
}

/** Let queued microtasks (the canvas renderer's batched GL draw, and anything it chains) run. */
export async function drainMicrotasks(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve()
}
