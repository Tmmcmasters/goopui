// attachGoop: turn any positioned-ish element into a goo body that drips and squishes.
//
// Layering: the host gets `isolation: isolate` (and `position: relative` if it was static).
// An aria-hidden goo layer sits at z-index -1 inside it, so the host's real content (label,
// icon) paints ABOVE the goo, unfiltered and crisp. The layer is padded beyond the host so
// hanging/falling drips stay inside the filter region. Drips never affect layout.

import { GOOP_PHYSICS, type GoopTuning } from './constants'
import { DripField } from './drips'
import { removeTicker, wakeTicker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { createSvgFilterRenderer, type GoopRenderer, type GoopRendererFactory } from './renderer'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readTuning } from './tuning'

const P = GOOP_PHYSICS

export interface GoopOptions extends Partial<GoopTuning> {
  /** Spawn drips on hover / tap. Default true. `false` = static goo body only. */
  drips?: boolean
  /** Listen to pointer events on the host. Default true. Set false to drive it yourself
   *  via the handle's `press` / `release` / `drip` / `hover` methods. */
  interactive?: boolean
  /** Ignore interaction (e.g. disabled button). Live drips finish; nothing new starts. */
  disabled?: boolean
  /** 'auto' (default) follows prefers-reduced-motion + <html data-reduced-motion="true">.
   *  `true`/`false` force it. */
  reducedMotion?: boolean | 'auto'
  /** Swap the renderer (default: SVG filter). */
  renderer?: GoopRendererFactory
  /** RNG for drip placement/jitter (inject a seeded one for tests). Default Math.random. */
  random?: () => number
}

export interface GoopHandle {
  /** Merge new options and re-read `--goop-*` CSS vars from the host. */
  update(opts?: GoopOptions): void
  /** Tear everything down: listeners, observers, rAF ticker, DOM, filter ref. Idempotent. */
  destroy(): void
  /** Squish the body (like pointerdown). */
  press(): void
  /** Release the squish with a spring rebound (like pointerup). */
  release(): void
  /** Start hover drips (`true`) or retract un-detached ones (`false`). */
  hover(on: boolean, x?: number): void
  /** Spawn one drip that swells and detaches on its own (like a tap). x in host px. */
  drip(x?: number): void
  /** The aria-hidden goo layer element. */
  readonly layer: HTMLElement
  /** Whether the instance is currently in reduced-motion (static) mode. */
  readonly reducedMotion: boolean
  /** Resolved tuning currently in use. */
  readonly tuning: Readonly<GoopTuning>
}

const filterParams = (t: GoopTuning) => ({ blur: t.blur, contrast: t.contrast, threshold: t.threshold })

function layerPadding(t: GoopTuning): { side: number; bottom: number } {
  const side = Math.ceil(t.blur * 3 + t.dripSize * 2 + 4)
  const reach = t.dripLength + t.dripSize * (1 + P.sizeJitter) * 2
  const fall = t.fall * (1 + P.fallJitter) * (1 + P.dropMaxStretch)
  return { side, bottom: Math.ceil(side + reach + fall) }
}

export function attachGoop(host: HTMLElement, options: GoopOptions = {}): GoopHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: GoopOptions = { ...options }
  let tuning = readTuning(host, opts)
  const random = (): number => (opts.random ?? Math.random)()

  // ---- host setup ----------------------------------------------------------
  const prevStyle = { position: host.style.position, isolation: host.style.isolation }
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const renderer: GoopRenderer = (opts.renderer ?? createSvgFilterRenderer)(host, filterParams(tuning))
  renderer.setPadding(layerPadding(tuning))
  const field = new DripField(renderer)

  // ---- state ---------------------------------------------------------------
  let width = host.offsetWidth
  let height = host.offsetHeight
  let cornerRadius = 0
  const body: SpringState = { x: 1, v: 0 } // vertical scale
  let pressed = false
  let hovered = false
  let destroyed = false

  let pressCfg = springConfig(P.pressSpring, tuning.viscosity)
  let releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)

  const readGeometry = (): void => {
    width = host.offsetWidth
    height = host.offsetHeight
    const r = win?.getComputedStyle(host).borderBottomLeftRadius ?? '0'
    const n = Number.parseFloat(r)
    // Percent radii: resolve against width (good enough for pills/circles).
    const px = Number.isFinite(n) ? (r.trim().endsWith('%') ? (n / 100) * width : n) : 0
    // A 9999px pill radius really means "half the height".
    cornerRadius = Math.min(px, height / 2, width / 2)
  }
  readGeometry()

  // ---- reduced motion ------------------------------------------------------
  const computeReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = computeReduced()

  const enterReduced = (): void => {
    field.clear()
    pressed = false
    hovered = false
    body.x = 1
    body.v = 0
    renderer.setBodyScale(1, 1)
    renderer.flush()
    removeTicker(tick)
  }
  if (reduced) enterReduced()

  const unwatchReduced = watchReducedMotion(doc, () => {
    const next = computeReduced()
    if (next === reduced) return
    reduced = next
    if (reduced) enterReduced()
  })

  // ---- sim -----------------------------------------------------------------
  const bodyScale = (): { sx: number; sy: number } => {
    const sy = body.x
    return { sy, sx: 1 + (1 - sy) * P.squishSpread }
  }

  function tick(dt: number): boolean {
    if (destroyed || reduced) return false
    const target = pressed ? 1 - tuning.squish : 1
    stepSpring(body, target, pressed ? pressCfg : releaseCfg, dt)
    const bodyMoving = !isSpringSettled(body, target, 0.0005, 0.005)
    if (!bodyMoving) {
      body.x = target
      body.v = 0
    }
    const { sx, sy } = bodyScale()
    renderer.setBodyScale(sx, sy)
    const dripsMoving = field.step(dt, { tuning, width, height, sx, sy, pressed })
    renderer.flush()
    return bodyMoving || dripsMoving
  }

  const wake = (): void => {
    if (!destroyed && !reduced) wakeTicker(tick)
  }

  field.onDetach = () => {
    if (tuning.squish > 0) body.v -= P.detachRecoil
  }

  const canInteract = (): boolean => !destroyed && !reduced && !opts.disabled
  const dripsOn = (): boolean => opts.drips !== false && tuning.dripCount > 0

  /** Usable x range along the bottom edge, avoiding the rounded corners. */
  const edgeRange = (): [number, number] => {
    const inset = Math.max(cornerRadius * 0.8, tuning.dripSize * 1.4) + 2
    const lo = Math.min(inset, width / 2)
    return [lo, Math.max(lo, width - inset)]
  }

  const pickX = (taken: number[], near?: number): number | null => {
    const [lo, hi] = edgeRange()
    const gap = tuning.dripSize * P.minSpacing
    for (let tries = 0; tries < 14; tries++) {
      const x =
        near !== undefined && tries < 4
          ? Math.min(hi, Math.max(lo, near + (random() * 2 - 1) * P.pointerJitter))
          : lo + random() * (hi - lo)
      if (taken.every((t) => Math.abs(t - x) >= gap)) return x
    }
    return null
  }

  const startHover = (x?: number): void => {
    if (!canInteract() || !dripsOn()) return
    hovered = true
    field.setFed(true)
    const live = field.attached()
    const [lo, hi] = edgeRange()
    const fits = Math.max(1, Math.floor((hi - lo) / (tuning.dripSize * P.minSpacing)) + 1)
    const want = Math.min(fits, 1 + Math.floor(random() * tuning.dripCount))
    const taken = live.map((d) => d.x)
    for (let i = live.length; i < want; i++) {
      const px = pickX(taken, i === live.length ? x : undefined)
      if (px === null) break
      taken.push(px)
      const k = i - live.length
      const delay = k === 0 ? random() * 0.04 : k * P.spawnStagger * (0.5 + random())
      field.spawn(tuning, { x: px, delay, random })
    }
    wake()
  }

  const endHover = (): void => {
    hovered = false
    field.setFed(false)
    wake()
  }

  const press = (): void => {
    if (!canInteract() || tuning.squish <= 0) return
    pressed = true
    wake()
  }
  const release = (): void => {
    if (!pressed) return
    pressed = false
    wake()
  }
  const tapDrip = (x?: number): void => {
    if (!canInteract() || !dripsOn()) return
    const taken = field.attached().map((d) => d.x)
    const px = pickX(taken, x)
    if (px === null) return
    field.spawn(tuning, { x: px, forced: true, random })
    wake()
  }

  // ---- pointer wiring ------------------------------------------------------
  const hoverMQ = win?.matchMedia?.('(hover: hover)')
  const canHover = (): boolean => hoverMQ?.matches ?? true
  const localX = (e: PointerEvent): number | undefined => {
    const rect = host.getBoundingClientRect()
    if (!rect.width) return undefined
    // Undo any CSS scale on ancestors so x is in host layout px.
    return ((e.clientX - rect.left) / rect.width) * width
  }

  let pressType = ''
  const onEnter = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && canHover()) startHover(localX(e))
  }
  const onLeave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && hovered) endHover()
  }
  const onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (!canInteract()) return
    pressType = e.pointerType
    press()
    doc.addEventListener('pointerup', onUp, true)
    doc.addEventListener('pointercancel', onUp, true)
  }
  const onUp = (e: PointerEvent): void => {
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('pointercancel', onUp, true)
    release()
    if (e.type === 'pointerup' && pressType !== 'mouse' && host.contains(e.target as Node | null)) {
      tapDrip(localX(e))
    }
    pressType = ''
  }

  let listening = false
  const listen = (on: boolean): void => {
    if (on === listening) return
    listening = on
    const m = on ? 'addEventListener' : 'removeEventListener'
    host[m]('pointerenter', onEnter as EventListener)
    host[m]('pointerleave', onLeave as EventListener)
    host[m]('pointerdown', onDown as EventListener)
    if (!on) {
      doc.removeEventListener('pointerup', onUp, true)
      doc.removeEventListener('pointercancel', onUp, true)
    }
  }
  listen(opts.interactive !== false)

  // ---- size tracking -------------------------------------------------------
  const drawResting = (): void => field.drawResting({ tuning, width, height })
  drawResting()
  const RO = win?.ResizeObserver
  const ro = RO
    ? new RO(() => {
        readGeometry()
        drawResting()
        wake()
      })
    : undefined
  ro?.observe(host)

  // ---- handle --------------------------------------------------------------
  return {
    layer: renderer.layer,
    get reducedMotion() {
      return reduced
    },
    get tuning() {
      return tuning
    },
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      const prev = tuning
      tuning = readTuning(host, opts)
      if (prev.blur !== tuning.blur || prev.contrast !== tuning.contrast || prev.threshold !== tuning.threshold) {
        renderer.setParams(filterParams(tuning))
      }
      renderer.setPadding(layerPadding(tuning))
      pressCfg = springConfig(P.pressSpring, tuning.viscosity)
      releaseCfg = springConfig(P.releaseSpring, tuning.viscosity)
      listen(opts.interactive !== false)
      readGeometry()
      drawResting()
      const r = computeReduced()
      if (r !== reduced) {
        reduced = r
        if (reduced) enterReduced()
      }
      if (opts.drips === false) field.clear()
      if (opts.disabled) {
        if (hovered) endHover()
        release()
      }
      wake()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      listen(false)
      ro?.disconnect()
      unwatchReduced()
      removeTicker(tick)
      field.destroy()
      renderer.destroy()
      host.style.position = prevStyle.position
      host.style.isolation = prevStyle.isolation
    },
    press,
    release,
    hover(on, x) {
      if (on) startHover(x)
      else if (hovered) endHover()
    },
    drip: tapDrip,
  }
}
