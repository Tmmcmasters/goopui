// Frame-exact replay for whole scenes of goo components (v7 montage).
//
// Same idea as replay.ts (which drives one attachGoop button), generalized: a scene builds
// its own DOM inside a root element and attaches any @goopui/core modules it wants
// (attachSpinner, attachSwitch, attachEmerge, ...). Every frame:
//
//   1. install the fake clock / seeded random / manual MutationObserver (fake-env.ts)
//   2. destroy whatever the previous frame built and wipe the root
//   3. build the scene from scratch (DOM + attaches) under the fake clock
//   4. replay t=0..t in 1/120 s substeps: scripted actions, then the synthetic pointer
//      (hit-tested with elementFromPoint, so it lands on whatever is under the cursor, with
//      proper enter/leave, implicit capture while pressed, and a click on release), then
//      pending mutations are delivered, then the clock advances and animation frames run
//   5. drain microtasks, restore the real globals
//
// Output depends only on (scene, t).

import { activeTickerCount, escapeLayerRefs, gooCanvasRefCount, goopOverlayCount, isLoopRunning } from '@goopui/core'
import { drainMicrotasks, installFakeEnv, seededRandom, type FakeEnv } from './fake-env'
import type { CursorPath, Pt } from './path'
import type { Click } from './replay'

export const SCENE_SUBSTEP = 1 / 120

export interface SceneRuntime {
  destroy(): void
}

export interface SceneAction<R> {
  t: number
  run(rt: R, ctx: SceneCtx): void
}

export interface SceneCtx {
  root: HTMLElement
  /** Seeded random for scene-level choices (separate from Math.random). */
  random: () => number
  /** Current local scene time (s) while replaying. */
  now(): number
}

export interface SceneScript<R extends SceneRuntime> {
  seed: number
  cursor: CursorPath
  clicks: readonly Click[]
  /** Build DOM inside `root` and attach goo. Runs under the fake clock. */
  build(root: HTMLElement, ctx: SceneCtx): R
  /** Called every substep before pointer events (drive time-based DOM: toast stack layout, ...). */
  step?(rt: R, t: number, ctx: SceneCtx): void
  actions?: readonly SceneAction<R>[]
}

let chain: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn)
  chain = next.catch(() => {})
  return next
}

/** Every live scene replayer (one frame's scene must be gone before the next is built). */
const live = new Set<{ teardown(): void }>()
/** Lets the v6 button replayer and scenes share the one-at-a-time rule. */
export function teardownAllScenes(): void {
  for (const r of Array.from(live)) r.teardown()
}

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

function pev(type: string, p: Pt, extra: { button?: number; buttons?: number } = {}): PointerEvent {
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

const chainOf = (el: Element | null, root: Element): Element[] => {
  const out: Element[] = []
  for (let e = el; e && e !== root.parentElement; e = e.parentElement) {
    out.push(e)
    if (e === root) break
  }
  return out
}

export class SceneReplayer<R extends SceneRuntime> {
  private rt: R | null = null
  private root: HTMLElement | null = null

  constructor(private readonly script: SceneScript<R>) {}

  show(t: number, root: HTMLElement, compSize: number): Promise<{ steps: number; ms: number }> {
    return serial(async () => {
      const t0 = realNow()
      const env = installFakeEnv(this.script.seed)
      try {
        teardownAllScenes()
        assertClean()
        const steps = this.replay(env, t, root, compSize)
        await drainMicrotasks()
        return { steps, ms: realNow() - t0 }
      } finally {
        env.restore()
      }
    })
  }

  dispose(): Promise<void> {
    return serial(async () => {
      if (!this.rt) return
      const env = installFakeEnv(0)
      try {
        this.teardown()
        await drainMicrotasks()
      } finally {
        env.restore()
      }
    })
  }

  teardown(): void {
    this.rt?.destroy()
    this.rt = null
    if (this.root) this.root.replaceChildren()
    live.delete(this)
  }

  private replay(env: FakeEnv, t: number, root: HTMLElement, compSize: number): number {
    const { script } = this
    let now = 0
    const ctx: SceneCtx = { root, random: seededRandom(script.seed ^ 0x51ed), now: () => now }
    root.replaceChildren()
    this.root = root
    this.rt = script.build(root, ctx)
    live.add(this)
    const rt = this.rt
    env.flushMutations()

    const sr = root.getBoundingClientRect()
    const k = sr.width / compSize
    const toClient = (p: Pt): Pt => ({ x: sr.left + p.x * k, y: sr.top + p.y * k })
    const doc = root.ownerDocument

    const steps = Math.max(0, Math.round(t / SCENE_SUBSTEP))
    const actions = [...(script.actions ?? [])].sort((a, b) => a.t - b.t)
    let ai = 0
    let last: Pt | null = null
    let over: Element | null = null
    let pressed = false
    let captured: Element | null = null
    let downTarget: Element | null = null
    const eps = 1e-9

    const hitTest = (p: Pt): Element => {
      const el = doc.elementFromPoint(p.x, p.y)
      return el && root.contains(el) ? el : root
    }
    const moveTo = (p: Pt): void => {
      const target = captured ?? hitTest(p)
      if (target !== over) {
        const oldChain = chainOf(over, root)
        const newChain = chainOf(target, root)
        const b = { buttons: pressed ? 1 : 0 }
        if (over) over.dispatchEvent(pev('pointerout', p, b))
        for (const e of oldChain) if (!newChain.includes(e)) e.dispatchEvent(pev('pointerleave', p, b))
        target.dispatchEvent(pev('pointerover', p, b))
        for (const e of [...newChain].reverse()) if (!oldChain.includes(e)) e.dispatchEvent(pev('pointerenter', p, b))
        over = target
      }
      target.dispatchEvent(pev('pointermove', p, { buttons: pressed ? 1 : 0 }))
    }

    for (let s = 0; s < steps; s++) {
      const tk = s * SCENE_SUBSTEP
      now = tk
      while (ai < actions.length && actions[ai]!.t <= tk + eps) actions[ai++]!.run(rt, ctx)
      script.step?.(rt, tk, ctx)
      env.flushMutations()

      const c = script.cursor.at(tk)
      if (c) {
        const p = toClient(c)
        if (!last || Math.abs(p.x - last.x) > 1e-4 || Math.abs(p.y - last.y) > 1e-4) {
          moveTo(p)
          last = p
        }
      }
      for (const cl of script.clicks) {
        if (!last) break
        if (cl.down > tk - SCENE_SUBSTEP + eps && cl.down <= tk + eps) {
          pressed = true
          const target = hitTest(last)
          downTarget = target
          captured = target
          target.dispatchEvent(pev('pointerdown', last, { button: 0, buttons: 1 }))
        }
        if (cl.up > tk - SCENE_SUBSTEP + eps && cl.up <= tk + eps) {
          pressed = false
          const target = captured ?? hitTest(last)
          captured = null
          target.dispatchEvent(pev('pointerup', last, { button: 0, buttons: 0 }))
          const upOn = hitTest(last)
          if (downTarget && (downTarget === upOn || downTarget.contains(upOn) || upOn.contains(downTarget))) {
            const at = downTarget.contains(upOn) ? upOn : downTarget
            at.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: last.x, clientY: last.y, button: 0 }),
            )
          }
          downTarget = null
          // Re-hit-test after release (capture ended).
          moveTo(last)
        }
      }
      env.flushMutations()
      env.advance(SCENE_SUBSTEP * 1000)
    }
    now = steps * SCENE_SUBSTEP
    env.flushMutations()
    return steps
  }
}
