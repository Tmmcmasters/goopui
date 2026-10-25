// Behavioural tests for round-1 feel work: pointer reactivity, click mass, continuous
// rhythm, and continuity (no pops) across every transition.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOOP_DEFAULTS,
  GOOP_OVERLAY_ATTR,
  GOOP_PHYSICS,
  escapeLayerRefs,
  gooVanishRadius,
  readTuning,
  attachGoop,
  createSvgFilterRenderer,
  trackPointer,
  type GoopBodyTransform,
  type GoopSheen,
  type GoopHandle,
  type GoopRenderer,
} from '../src'

// ---- manual clock + rAF pump ------------------------------------------------
let clock = 0
let frames: FrameRequestCallback[] = []
function pump(seconds: number, fps = 60, each?: () => void) {
  const n = Math.round(seconds * fps)
  for (let i = 0; i < n; i++) {
    clock += 1000 / fps
    const q = frames
    frames = []
    for (const f of q) f(clock)
    each?.()
  }
}

// ---- recording renderer ------------------------------------------------------
interface BlobRec {
  sets: { x: number; y: number; r: number; o: number; frame: number }[]
  removedAt: { r: number; o: number; x: number; y: number; frame: number } | null
}
let frameNo = 0
function recordingRenderer() {
  const blobs: BlobRec[] = []
  const bodies: GoopBodyTransform[] = []
  const sheens: GoopSheen[] = []
  const factory = (host: HTMLElement, params: Parameters<typeof createSvgFilterRenderer>[1]): GoopRenderer => {
    const real = createSvgFilterRenderer(host, params)
    return {
      ...real,
      layer: real.layer,
      setBodyTransform(t) {
        bodies.push({ ...t })
        real.setBodyTransform?.(t)
      },
      setSheen(sh: GoopSheen) {
        sheens.push({ ...sh })
        real.setSheen(sh)
      },
      createBlob() {
        const inner = real.createBlob()
        const rec: BlobRec = { sets: [], removedAt: null }
        blobs.push(rec)
        return {
          set(x, y, r, o = 1, sx, sy) {
            rec.sets.push({ x, y, r, o, frame: frameNo })
            inner.set(x, y, r, o, sx, sy)
          },
          remove() {
            const last = rec.sets[rec.sets.length - 1]
            rec.removedAt = last
              ? { r: last.r, o: last.o, x: last.x, y: last.y, frame: frameNo }
              : { r: 0, o: 0, x: 0, y: 0, frame: frameNo }
            inner.remove()
          },
        }
      },
    }
  }
  return { blobs, bodies, sheens, factory }
}

/** Approximate radius as SEEN through the goo threshold: a lone circle vanishes at the filter's
 *  vanish radius rm, and near it the visible size goes like sqrt(r^2 - rm^2) (steep). This is
 *  what makes threshold "pops" measurable: a circle removed at r = rm is fine, but a circle
 *  dropping from r = 2*rm to 0 in one frame is a visible pop. */
const RM = gooVanishRadius(GOOP_DEFAULTS)
const vis = (s: { r: number; o: number }) => (s.o > 0.02 ? Math.sqrt(Math.max(0, s.r * s.r - RM * RM)) : 0)

/** Assert no circle changes visible size by more than `maxJump` px between frames,
 *  and none is removed while still visible. */
function expectContinuous(blobs: BlobRec[], maxJump = 2.2) {
  // Hand-offs (a drop landing becomes a puddle) swap circles in the same frame at the same
  // spot: the old one goes to 0 while a new one appears there with the same size.
  const handedOff = (frame: number, x: number, y: number, r: number): boolean =>
    blobs.some((o) => {
      const f = o.sets[0]
      return !!f && f.frame === frame && Math.abs(f.x - x) < 3 && Math.abs(f.y + f.r - (y + r)) < r + 3 && Math.abs(f.r - r) < 1
    })
  for (const b of blobs) {
    for (let i = 1; i < b.sets.length; i++) {
      const a = b.sets[i - 1]!
      const c = b.sets[i]!
      if (c.frame - a.frame > 1) continue // not drawn in between (delay) - first draw starts at 0 anyway
      if (c.r === 0 && a.r > 0 && handedOff(c.frame, a.x, a.y, a.r)) continue
      // Root circles sit on the body edge and merge into it: no threshold, compare raw size.
      const onEdge = Math.abs(a.y - 40) < 3 && (c.r === 0 || Math.abs(c.y - 40) < 3)
      if (onEdge) {
        expect(Math.abs(c.r - a.r), `root jump in frame ${c.frame}`).toBeLessThan(1.5)
        continue
      }
      expect(Math.abs(vis(c) - vis(a)), `radius jump in frame ${c.frame}: ${JSON.stringify(a)} -> ${JSON.stringify(c)}`).toBeLessThan(maxJump)
    }
    const ra = b.removedAt
    if (ra && !(ra.r > 0 && handedOff(ra.frame, ra.x, ra.y, ra.r)))
      expect(vis(ra), 'removed while visible').toBeLessThan(0.5)
  }
}

let handles: GoopHandle[] = []
function makeHost() {
  const el = document.createElement('button')
  Object.defineProperty(el, 'offsetWidth', { value: 160 })
  Object.defineProperty(el, 'offsetHeight', { value: 40 })
  el.getBoundingClientRect = () => ({ left: 100, top: 100, width: 160, height: 40, right: 260, bottom: 140, x: 100, y: 100, toJSON() {} }) as DOMRect
  document.body.append(el)
  return el
}
const mouse = (type: string, clientX: number, clientY: number) =>
  new PointerEvent(type, { pointerType: 'mouse', clientX, clientY, bubbles: type !== 'pointerenter' && type !== 'pointerleave' })

/** Move the mouse with real timing so the shared tracker sees a velocity. */
function moveTo(x: number, y: number, steps: number, from: { x: number; y: number }, dtMs = 8) {
  for (let i = 1; i <= steps; i++) {
    clock += dtMs
    document.dispatchEvent(mouse('pointermove', from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps))
  }
  from.x = x
  from.y = y
}

let seed = 1
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

beforeEach(() => {
  clock = 1000
  frames = []
  frameNo = 0
  seed = 7
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(() => {
      frameNo++
      cb(clock)
    })
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) =>
      ({ media: q, matches: q.includes('hover'), addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
  )
})
afterEach(() => {
  for (const h of handles) h.destroy()
  handles = []
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function setup(opts: Parameters<typeof attachGoop>[1] = {}) {
  const rec = recordingRenderer()
  const host = makeHost()
  const h = attachGoop(host, { random: rand, renderer: rec.factory, ...opts })
  handles.push(h)
  return { host, h, rec }
}

describe('pointer tracker', () => {
  it('smooths velocity, decays when the pointer rests, and shares one listener', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const a = trackPointer(document)
    const b = trackPointer(document)
    expect(add.mock.calls.filter((c) => c[0] === 'pointermove')).toHaveLength(1)
    const p = { x: 0, y: 0 }
    moveTo(0, 0, 1, p)
    moveTo(200, 0, 25, p) // 200px in 200ms = 1000 px/s
    const s = a.sample()
    expect(s.vx).toBeGreaterThan(800)
    expect(s.vx).toBeLessThan(1100)
    expect(Math.abs(s.vy)).toBeLessThan(1)
    clock += 400
    expect(a.sample().speed).toBeLessThan(5)
    const remove = vi.spyOn(document, 'removeEventListener')
    a.release()
    expect(remove).not.toHaveBeenCalled()
    b.release()
    expect(remove.mock.calls.filter((c) => c[0] === 'pointermove')).toHaveLength(1)
  })
})

describe('pointer reactivity', () => {
  it('a fast angled entry kicks the body toward the travel direction, then it settles', () => {
    const { host, rec } = setup()
    const p = { x: 40, y: 40 }
    moveTo(40, 40, 1, p)
    moveTo(150, 120, 12, p) // down-right, ~1150 px/s
    host.dispatchEvent(mouse('pointerenter', 150, 120))
    pump(0.12)
    const peak = rec.bodies.reduce((m, b) => (b.tx > m.tx ? b : m), rec.bodies[0]!)
    expect(peak.tx).toBeGreaterThan(0.8)
    expect(peak.ty).toBeGreaterThan(0.4)
    host.dispatchEvent(mouse('pointerleave', 150, 160))
    pump(2)
    const last = rec.bodies[rec.bodies.length - 1]!
    expect(Math.abs(last.tx)).toBeLessThan(0.05)
    expect(Math.abs(last.sx - 1)).toBeLessThan(0.002)
  })

  it('a slow entry reacts much less than a fast one', () => {
    const peak = (stepMs: number) => {
      const { host, rec, h } = setup()
      // ends at the horizontal center so hover lean is ~0 and only the impact remains
      const p = { x: 70, y: 120 }
      moveTo(70, 120, 1, p)
      moveTo(180, 120, 12, p, stepMs)
      host.dispatchEvent(mouse('pointerenter', 180, 120))
      pump(0.15)
      h.destroy()
      return Math.max(...rec.bodies.map((b) => Math.abs(b.tx)))
    }
    const fast = peak(8)
    const slow = peak(80)
    expect(fast).toBeGreaterThan(slow * 3)
  })

  it('reactivity 0 disables pointer-driven body motion', () => {
    const { host, rec } = setup({ reactivity: 0 })
    const p = { x: 40, y: 40 }
    moveTo(40, 40, 1, p)
    moveTo(150, 120, 12, p)
    host.dispatchEvent(mouse('pointerenter', 150, 120))
    pump(0.3)
    expect(Math.max(0, ...rec.bodies.map((b) => Math.abs(b.tx) + Math.abs(b.skew)))).toBeLessThan(1e-6)
  })
})

describe('clicks add goop', () => {
  it('each click adds mass (capped) and a splash drip; mass decays back to 0', () => {
    const { host, h, rec } = setup()
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    for (let i = 0; i < 12; i++) {
      host.dispatchEvent(mouse('pointerdown', 180, 120))
      host.dispatchEvent(mouse('pointerup', 180, 120))
      pump(0.05)
    }
    const st = h.inspect()
    expect(st.mass).toBeGreaterThan(1)
    expect(st.mass).toBeLessThanOrEqual(GOOP_PHYSICS.maxMass)
    expect(st.drips).toBeLessThanOrEqual(GOOP_PHYSICS.maxDrips)
    // body swelled
    expect(Math.max(...rec.bodies.map((b) => b.sx))).toBeGreaterThan(1.02)
    host.dispatchEvent(mouse('pointerleave', 180, 160))
    pump(8)
    expect(h.inspect().mass).toBe(0)
    const last = rec.bodies[rec.bodies.length - 1]!
    expect(Math.abs(last.sx - 1)).toBeLessThan(0.002)
  })
})

describe('rhythm', () => {
  it('keeps dripping while the pointer stays on the element', () => {
    const { host, h } = setup()
    let detached = 0
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    let prev = 0
    pump(6, 60, () => {
      // count drops: a drip turns into a falling drop -> live count changes; use inspect
      const n = h.inspect().drips
      if (n < prev) detached++
      prev = n
    })
    // ~6s at ~0.9s mean interval: several drips must have come and gone, not just one.
    expect(detached).toBeGreaterThanOrEqual(3)
    expect(h.inspect().nextDrip).toBeLessThan(Number.POSITIVE_INFINITY)
  })

  it('stops scheduling and goes idle after leave', () => {
    const { host, h } = setup()
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    pump(0.5)
    host.dispatchEvent(mouse('pointerleave', 180, 160))
    pump(4)
    expect(h.inspect().drips).toBe(0)
    expect(frames).toHaveLength(0) // loop asleep
  })
})

describe('continuity: no pops on any transition', () => {
  const scenarios: [string, (host: HTMLElement, h: GoopHandle) => void][] = [
    [
      'leave mid-swell',
      (host) => {
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(0.45)
        host.dispatchEvent(mouse('pointerleave', 180, 160))
        pump(2)
      },
    ],
    [
      'leave right after a click',
      (host) => {
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(0.3)
        host.dispatchEvent(mouse('pointerdown', 180, 120))
        pump(0.06)
        host.dispatchEvent(mouse('pointerup', 180, 120))
        pump(0.03)
        host.dispatchEvent(mouse('pointerleave', 180, 160))
        pump(3)
      },
    ],
    [
      'leave during detach + stub retract',
      (host) => {
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(1.2)
        host.dispatchEvent(mouse('pointerleave', 180, 160))
        pump(3)
      },
    ],
    [
      'quick re-enter',
      (host) => {
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(0.4)
        host.dispatchEvent(mouse('pointerleave', 180, 160))
        pump(0.08)
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(0.5)
        host.dispatchEvent(mouse('pointerleave', 180, 160))
        pump(3)
      },
    ],
    [
      'fast downward exit yanks drips',
      (host) => {
        const p = { x: 180, y: 120 }
        host.dispatchEvent(mouse('pointerenter', 180, 120))
        pump(0.7)
        moveTo(180, 220, 8, p, 6)
        host.dispatchEvent(mouse('pointerleave', 180, 220))
        pump(3)
      },
    ],
  ]
  for (const [name, run] of scenarios) {
    it(name, () => {
      const { host, h, rec } = setup()
      run(host, h)
      expect(rec.blobs.length).toBeGreaterThan(0)
      expectContinuous(rec.blobs)
      expect(h.inspect().drips).toBe(0)
    })
  }
})

describe('splash-through, shockwave, escape overlay', () => {
  const punch = (host: HTMLElement, stepMs: number) => {
    const p = { x: 20, y: 120 }
    clock += 500 // long pause: the tracker restarts from the next raw velocity
    moveTo(20, 120, 1, p)
    clock += 500
    moveTo(20, 120, 1, p)
    moveTo(120, 120, 10, p, stepMs)
    host.dispatchEvent(mouse('pointerenter', 120, 120))
  }

  it('only a hard enough entry splashes through (threshold gating)', () => {
    const slow = setup()
    punch(slow.host, 40) // ~250 px/s
    expect(slow.h.inspect().particles).toBe(0)
    const fast = setup()
    punch(fast.host, 4) // ~2500 px/s
    expect(fast.h.inspect().particles).toBeGreaterThan(4)
  })

  it('splash particles drain away and the loop sleeps', () => {
    const { host, h } = setup()
    punch(host, 4)
    host.dispatchEvent(mouse('pointerleave', 300, 120))
    pump(5)
    expect(h.inspect().particles).toBe(0)
    expect(frames).toHaveLength(0)
  })

  it('click shockwave throws a capped particle ring', () => {
    const { host, h } = setup()
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    host.dispatchEvent(mouse('pointerdown', 180, 120))
    host.dispatchEvent(mouse('pointerup', 180, 120))
    expect(h.inspect().particles).toBeGreaterThan(4)
    for (let i = 0; i < 20; i++) {
      host.dispatchEvent(mouse('pointerdown', 180, 120))
      host.dispatchEvent(mouse('pointerup', 180, 120))
    }
    expect(h.inspect().particles).toBeLessThanOrEqual(GOOP_PHYSICS.maxParticles)
  })

  it('reduced motion: no splash, no shockwave, no particles', () => {
    const { host, h } = setup({ reducedMotion: true })
    punch(host, 4)
    h.shockwave(80, 20)
    h.splashThrough(10, 20, 3000, 0)
    expect(h.inspect().particles).toBe(0)
    expect(document.querySelector('[' + GOOP_OVERLAY_ATTR + ']')).toBeNull()
  })

  it('escape mode shares one ref-counted page overlay, removed with the last user', () => {
    const a = setup({ splash: 'escape' })
    const b = setup({ splash: 'escape' })
    expect(escapeLayerRefs(document)).toBe(0) // acquired lazily
    a.h.shockwave(80, 20)
    b.h.shockwave(80, 20)
    expect(escapeLayerRefs(document)).toBe(2)
    expect(document.querySelectorAll('[' + GOOP_OVERLAY_ATTR + ']')).toHaveLength(1)
    expect(a.h.inspect().particles).toBe(0) // they live in the overlay, not the element
    pump(0.1)
    a.h.destroy()
    expect(escapeLayerRefs(document)).toBe(1)
    expect(document.querySelector('[' + GOOP_OVERLAY_ATTR + ']')).not.toBeNull()
    b.h.destroy()
    expect(escapeLayerRefs(document)).toBe(0)
    expect(document.querySelector('[' + GOOP_OVERLAY_ATTR + ']')).toBeNull()
  })

  it('splash off disables particles but keeps the edge ripple', () => {
    const { h, rec } = setup({ splash: 'off' })
    h.shockwave(80, 20)
    expect(h.inspect().particles).toBe(0)
    expect(rec.blobs.length).toBe(8) // ripple slots
  })
})

describe('direction', () => {
  it('a sudden pointer acceleration sloshes the goo the opposite way, then it settles', () => {
    const { host, h } = setup()
    const p = { x: 180, y: 120 }
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    pump(0.1)
    moveTo(240, 120, 6, p, 8) // jerk right
    pump(0.05)
    expect(h.inspect().sloshX).toBeLessThan(-1)
    host.dispatchEvent(mouse('pointerleave', 240, 160))
    pump(4)
    expect(Math.abs(h.inspect().sloshX)).toBeLessThan(0.1)
  })

  it('hanging drips creep toward the cursor', () => {
    const { host, rec } = setup({ dripInterval: 10, dripCount: 1 })
    host.dispatchEvent(mouse('pointerenter', 130, 120)) // local x = 30
    pump(0.05)
    const root = rec.blobs[0]!
    const first = root.sets[root.sets.length - 1]!.x
    const p = { x: 130, y: 120 }
    for (let i = 0; i < 20; i++) {
      moveTo(130 + (i + 1) * 5.5, 120, 1, p, 20)
      host.dispatchEvent(mouse('pointermove', p.x, 120))
      pump(0.02)
    }
    pump(0.3)
    expect(root.sets[root.sets.length - 1]!.x).toBeGreaterThan(first + 10)
  })
})

describe('oil film ignores the mouse by default', () => {
  const run = (react?: number) => {
    const { host, rec } = setup({ finish: 'oil' })
    if (react !== undefined) {
      host.style.setProperty('--goop-oil-react', String(react))
    }
    // re-read finish vars
    handles[handles.length - 1]!.update()
    const p = { x: 180, y: 120 }
    host.dispatchEvent(mouse('pointerenter', 180, 120))
    pump(0.1)
    moveTo(250, 125, 10, p, 8) // fast sideways
    host.dispatchEvent(mouse('pointermove', 250, 125))
    pump(0.2)
    return rec.sheens
  }

  it('default: no pointer velocity reaches the sheen, phase only drifts slowly', () => {
    const sh = run()
    expect(sh.length).toBeGreaterThan(5)
    expect(sh.every((s) => s.vx === 0 && s.vy === 0)).toBe(true)
    const span = sh[sh.length - 1]!.phase - sh[0]!.phase
    // ~0.3 s at the ambient drift rate, nothing from the 7000 px/s flick
    expect(Math.abs(span)).toBeLessThan(GOOP_PHYSICS.oilDrift * 0.5)
    expect(Math.max(...sh.map((s) => s.swirl))).toBeLessThanOrEqual(GOOP_PHYSICS.oilSwirl + 1e-6)
  })

  it('--goop-oil-react brings the pointer coupling back', () => {
    const sh = run(1)
    expect(sh.some((s) => s.vx !== 0)).toBe(true)
    expect(Math.max(...sh.map((s) => s.swirl))).toBeGreaterThan(GOOP_PHYSICS.oilSwirl + 0.03)
  })
})

// ---- round 4: features, presets, toggles ---------------------------------------------------

describe('presets and precedence (option > CSS var > preset > default)', () => {
  it('preset sets defaults; CSS beats preset; option beats CSS; true forces a feature on', () => {
    const host = makeHost()
    expect(readTuning(host, {}, 'subtle').taffy).toBe(0)
    expect(readTuning(host, {}, 'wild').taffy).toBe(1.5)
    expect(readTuning(host, {}, 'playful').taffy).toBe(GOOP_DEFAULTS.taffy)
    host.style.setProperty('--goop-taffy', '0.7')
    expect(readTuning(host, {}, 'subtle').taffy).toBe(0.7)
    expect(readTuning(host, { taffy: 0.2 }, 'subtle').taffy).toBe(0.2)
    host.style.removeProperty('--goop-taffy')
    const h = attachGoop(host, { preset: 'subtle', taffy: true })
    handles.push(h)
    expect(h.tuning.taffy).toBe(GOOP_DEFAULTS.taffy)
    expect(h.inspect().preset).toBe('subtle')
    expect(h.inspect().splash).toBe('off')
  })

  it('--goop-preset is read from CSS; the option wins', () => {
    const host = makeHost()
    host.style.setProperty('--goop-preset', 'wild')
    const a = attachGoop(host)
    handles.push(a)
    expect(a.inspect().preset).toBe('wild')
    expect(a.inspect().splash).toBe('escape')
    a.update({ preset: 'subtle' })
    expect(a.inspect().preset).toBe('subtle')
  })
})

describe('taffy pull', () => {
  const press = (host: HTMLElement, x: number, y: number) =>
    host.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', pointerId: 1, button: 0, clientX: x, clientY: y, bubbles: true }))
  const move = (host: HTMLElement, x: number, y: number) =>
    host.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', pointerId: 1, clientX: x, clientY: y, bubbles: true }))
  const up = (host: HTMLElement, x: number, y: number) =>
    host.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', pointerId: 1, clientX: x, clientY: y, bubbles: true }))
  const clicked = (host: HTMLElement) => {
    const fn = vi.fn()
    host.addEventListener('click', fn)
    host.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    host.removeEventListener('click', fn)
    return fn.mock.calls.length
  }

  it('dragging off while pressed pulls a string; past the max length it snaps, drops goo, and no click fires', () => {
    const { host, h } = setup({ taffyLength: 60 })
    press(host, 180, 120)
    for (let i = 1; i <= 12; i++) {
      move(host, 180, 140 + i * 8) // down and away, beyond 60px
      pump(0.03)
      if (i === 3) expect(h.inspect().taffy).toBe('pulling')
    }
    expect(h.inspect().taffy).toBe('retracting') // snapped
    expect(h.inspect().particles).toBeGreaterThan(0) // the far blob became a drop
    up(host, 180, 236)
    expect(clicked(host)).toBe(0)
    pump(2)
    expect(h.inspect().taffy).toBe('none')
  })

  it('release before the snap retracts springily; released outside = no click; inside = click', () => {
    const { host, h } = setup({ taffyLength: 200 })
    press(host, 180, 120)
    move(host, 180, 160)
    pump(0.1)
    expect(h.inspect().taffy).toBe('pulling')
    up(host, 180, 160)
    expect(clicked(host)).toBe(0)
    expect(h.inspect().taffy).toBe('retracting')
    pump(2)
    expect(h.inspect().taffy).toBe('none')
    press(host, 180, 120)
    up(host, 182, 121)
    expect(clicked(host)).toBe(1)
  })

  it('taffy: false never pulls', () => {
    const { host, h, rec } = setup({ taffy: false })
    const before = rec.blobs.length
    press(host, 180, 120)
    for (let i = 1; i <= 6; i++) {
      move(host, 180, 140 + i * 10)
      pump(0.03)
    }
    expect(h.inspect().taffy).toBe('none')
    up(host, 180, 200)
    expect(rec.blobs.length - before).toBeLessThan(10) // only click-free: no string circles
  })
})

describe('reach', () => {
  const near = (x: number, y: number) => {
    const p = { x: x - 40, y }
    clock += 500
    moveTo(p.x, p.y, 1, p)
    moveTo(x, y, 6, p, 16)
  }

  it('bulges only when the pointer is within the radius', () => {
    const { h } = setup({ reach: 60 })
    near(180, 40) // host top is y=100: 60px away, outside the radius
    pump(0.3)
    expect(h.inspect().reach).toBe(0)
    near(180, 75) // 25px away
    pump(0.3)
    expect(h.inspect().reach).toBeGreaterThan(0.1)
    near(180, 20) // move away again
    pump(1)
    expect(h.inspect().reach).toBeLessThan(0.01)
  })

  it('reach: false disables it completely', () => {
    const { h } = setup({ reach: false })
    near(180, 85)
    pump(0.3)
    expect(h.inspect().reach).toBe(0)
  })
})

describe('puddles', () => {
  it('drops pool on the floor, spread, drain to nothing without pops', () => {
    const { h, rec } = setup({ dripInterval: 10 })
    h.drip(80)
    let seen = 0
    pump(6, 60, () => (seen = Math.max(seen, h.inspect().puddles)))
    expect(seen).toBeGreaterThan(0)
    expect(h.inspect().puddles).toBe(0)
    expectContinuous(rec.blobs)
  })

  it('puddles: false: drops just drain in the air', () => {
    const { h } = setup({ puddles: false })
    h.drip(80)
    let seen = 0
    pump(4, 60, () => (seen = Math.max(seen, h.inspect().puddles)))
    expect(seen).toBe(0)
  })
})

describe('gloss, label ride, keyboard toggles', () => {
  it('gloss on adds the static shading to the filter; off is the plain goo filter', () => {
    const on = setup({ renderer: createSvgFilterRenderer })
    expect(on.h.layer.style.filter).toMatch(/-g0_/)
    const off = setup({ gloss: false, renderer: createSvgFilterRenderer })
    expect(off.h.layer.style.filter).not.toMatch(/-g\d/)
  })

  it('label ride moves [data-goop-label] content with the body, and not at all when off', () => {
    const run = (labelRide: boolean) => {
      const { host } = setup({ labelRide })
      const label = document.createElement('span')
      label.setAttribute('data-goop-label', '')
      host.append(label)
      handles[handles.length - 1]!.update()
      let moved = false
      host.dispatchEvent(mouse('pointerdown', 180, 120))
      pump(0.1, 60, () => (moved ||= label.style.transform !== ''))
      host.dispatchEvent(mouse('pointerup', 180, 120))
      pump(3)
      return { moved, rest: label.style.transform }
    }
    const on = run(true)
    expect(on.moved).toBe(true)
    expect(on.rest).toBe('')
    expect(run(false).moved).toBe(false)
  })

  it('keyboard: false ignores Space/Enter', () => {
    const { host, h } = setup({ keyboard: false })
    host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(h.inspect().pressed).toBe(false)
    const b = setup()
    b.host.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(b.h.inspect().pressed).toBe(true)
  })
})

describe('resting drip variance', () => {
  const bulbs = (opts: Parameters<typeof attachGoop>[1]) => {
    const { rec, h } = setup(opts)
    const per = GOOP_PHYSICS.neckSegments + 2
    const out: { x: number; y: number; r: number }[] = []
    for (let i = per - 1; i < rec.blobs.length; i += per) {
      const s = rec.blobs[i]!.sets[0]!
      out.push({ x: s.x, y: s.y, r: s.r })
    }
    h.destroy()
    return out
  }

  it('variance 0: identical, evenly spaced nubs', () => {
    const b = bulbs({ restingDrips: 3, dripVariance: 0, idle: false })
    expect(b).toHaveLength(3)
    expect(new Set(b.map((p) => p.r.toFixed(3))).size).toBe(1)
    expect(new Set(b.map((p) => p.y.toFixed(3))).size).toBe(1)
    const gaps = [b[1]!.x - b[0]!.x, b[2]!.x - b[1]!.x].map((g) => Math.abs(g))
    expect(Math.abs(gaps[0]! - gaps[1]!)).toBeLessThan(0.01)
  })

  it('default: different lengths and sizes, deterministic per element', () => {
    const a = bulbs({ restingDrips: 3, idle: false })
    expect(new Set(a.map((p) => p.y.toFixed(1))).size).toBe(3) // three different hang lengths
    expect(new Set(a.map((p) => p.r.toFixed(2))).size).toBeGreaterThan(1)
    const again = bulbs({ restingDrips: 3, idle: false })
    expect(again).toEqual(a) // same markup -> same layout (SSR / re-render safe)
    const seeded = bulbs({ restingDrips: 3, idle: false, seed: 42 })
    expect(seeded).not.toEqual(a)
  })

  it('accepts exact { x, size, length } specs', () => {
    const b = bulbs({ restingDrips: [{ x: 0.5, size: 1, length: 1 }], dripVariance: 0, idle: false })
    expect(b).toHaveLength(1)
    expect(b[0]!.x).toBeCloseTo(80, 0)
  })
})
