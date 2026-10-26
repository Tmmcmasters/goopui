// Frame-exact goo for Remotion.
//
// Remotion renders frames out of order, in several tabs at once, and @goopui/core runs on
// requestAnimationFrame + real time + randomness. So every frame is built from scratch:
//
//   1. install a fake clock (rAF queue, performance.now, Math.random, observers; fake-env.ts)
//   2. tear down whatever goo the previous frame left (destroy() -> shared loop, overlay,
//      canvas/filter ref-counts all drop to zero; verified below)
//   3. attachGoop() with a seeded `random`
//   4. replay the scripted timeline from t=0 to the frame's time in fixed 1/120 s substeps:
//      synthetic pointer events (enter/move/leave/down/up with real client coordinates) are
//      dispatched first, then the clock advances and the queued animation frames run, the
//      same order a browser uses
//   5. let the canvas renderer's batched GL draw (a microtask) run, then restore the globals
//
// The result depends only on (script, t), never on which frames ran before or where.

import {
  activeTickerCount,
  attachGoop,
  escapeLayerRefs,
  gooCanvasRefCount,
  goopOverlayCount,
  isLoopRunning,
  type GoopHandle,
  type GoopOptions,
} from '@goopui/core'
import { drainMicrotasks, installFakeEnv, seededRandom, type FakeEnv } from './fake-env'
import type { CursorPath, Pt } from './path'

/** Simulation substep (s). Matches core's fluid substep; divides 30 and 60 fps exactly. */
export const SUBSTEP = 1 / 120

export interface Click {
  down: number
  up: number
}

export interface GooAction {
  t: number
  run(handle: GoopHandle): void
}

export interface GooScript {
  seed: number
  options: GoopOptions
  /** Cursor in composition px, local scene time. */
  cursor: CursorPath
  clicks: readonly Click[]
  actions?: readonly GooAction[]
}

export interface ReplayStats {
  steps: number
  ms: number
}

// ---- one-at-a-time ------------------------------------------------------------------
// Replays touch process-wide state (globals, core's shared loop), so they never overlap.
let chain: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn)
  chain = next.catch(() => {})
  return next
}

const live = new Set<GooReplayer>()

/** Real wall clock, even while the fake one is installed. */
const realNow = (): number => Performance.prototype.now.call(performance)

function assertClean(): void {
  const doc = document
  const problems: string[] = []
  if (activeTickerCount() !== 0) problems.push(`${activeTickerCount()} tickers`)
  if (isLoopRunning()) problems.push('loop still running')
  if (goopOverlayCount(doc) !== 0) problems.push(`${goopOverlayCount(doc)} overlays`)
  if (gooCanvasRefCount(doc) !== 0) problems.push(`canvas refs ${gooCanvasRefCount(doc)}`)
  if (escapeLayerRefs(doc) !== 0) problems.push(`escape refs ${escapeLayerRefs(doc)}`)
  if (problems.length) throw new Error(`[promo] goo state leaked between frames: ${problems.join(', ')}`)
}

function pointer(type: string, p: Pt, extra: { button?: number; buttons?: number } = {}): PointerEvent {
  const boundary = type === 'pointerenter' || type === 'pointerleave'
  return new PointerEvent(type, {
    bubbles: !boundary,
    cancelable: !boundary,
    composed: true,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    clientX: p.x,
    clientY: p.y,
    button: extra.button ?? -1,
    buttons: extra.buttons ?? 0,
  })
}

export class GooReplayer {
  private handle: GoopHandle | null = null

  constructor(private readonly script: GooScript) {}

  /**
   * Rebuild the goo on `host` as it is at local time `t` (s). `stage` is the element that
   * spans the composition (`compSize` px square) and is used to map script coordinates to
   * client coordinates, so it also works inside the scaled Studio preview.
   */
  show(t: number, host: HTMLElement, stage: HTMLElement, compSize: number): Promise<ReplayStats> {
    return serial(async () => {
      const t0 = realNow()
      const env = installFakeEnv(this.script.seed)
      try {
        for (const r of live) r.teardown()
        assertClean()
        const { steps } = this.replay(env, t, host, stage, compSize)
        await drainMicrotasks()
        return { steps, ms: realNow() - t0 }
      } finally {
        env.restore()
      }
    })
  }

  /** Debug snapshot of the live goo (after show()). */
  inspect(): ReturnType<GoopHandle['inspect']> | null {
    return this.handle?.inspect() ?? null
  }

  /** Tear down (call from unmount). */
  dispose(): Promise<void> {
    return serial(async () => {
      if (!this.handle) return
      const env = installFakeEnv(0)
      try {
        this.teardown()
        await drainMicrotasks()
      } finally {
        env.restore()
      }
    })
  }

  private teardown(): void {
    this.handle?.destroy()
    this.handle = null
    live.delete(this)
  }

  private replay(env: FakeEnv, t: number, host: HTMLElement, stage: HTMLElement, compSize: number): { steps: number } {
    const { script } = this
    const random = seededRandom(script.seed ^ 0x9e3779b9)
    this.handle = attachGoop(host, { ...script.options, random, reducedMotion: false })
    live.add(this)
    const handle = this.handle

    const sr = stage.getBoundingClientRect()
    const k = sr.width / compSize
    const toClient = (p: Pt): Pt => ({ x: sr.left + p.x * k, y: sr.top + p.y * k })
    const hr = host.getBoundingClientRect()
    const hit = (p: Pt): boolean => p.x >= hr.left && p.x <= hr.right && p.y >= hr.top && p.y <= hr.bottom

    const steps = Math.max(0, Math.round(t / SUBSTEP))
    const actions = [...(script.actions ?? [])].sort((a, b) => a.t - b.t)
    let ai = 0
    let inside = false
    let last: Pt | null = null
    let pressed = false
    const eps = 1e-9
    for (let s = 0; s < steps; s++) {
      const tk = s * SUBSTEP
      while (ai < actions.length && actions[ai]!.t <= tk + eps) actions[ai++]!.run(handle)

      const c = script.cursor.at(tk)
      if (c) {
        const p = toClient(c)
        if (!last || Math.abs(p.x - last.x) > 1e-4 || Math.abs(p.y - last.y) > 1e-4) {
          const nowIn = hit(p)
          // Boundary events first, then the move at the new position (as browsers do).
          if (nowIn && !inside) host.dispatchEvent(pointer('pointerenter', p, { buttons: pressed ? 1 : 0 }))
          if (!nowIn && inside) host.dispatchEvent(pointer('pointerleave', p, { buttons: pressed ? 1 : 0 }))
          inside = nowIn
          ;(nowIn ? host : stage).dispatchEvent(pointer('pointermove', p, { buttons: pressed ? 1 : 0 }))
          last = p
        }
      }
      for (const cl of script.clicks) {
        if (!last) break
        if (cl.down > tk - SUBSTEP + eps && cl.down <= tk + eps) {
          pressed = true
          host.dispatchEvent(pointer('pointerdown', last, { button: 0, buttons: 1 }))
        }
        if (cl.up > tk - SUBSTEP + eps && cl.up <= tk + eps) {
          pressed = false
          host.dispatchEvent(pointer('pointerup', last, { button: 0, buttons: 0 }))
        }
      }
      env.advance(SUBSTEP * 1000)
    }
    return { steps }
  }
}
