import { afterEach, describe, expect, it } from 'vitest'
import {
  EMERGE_FEEL,
  SELECT_EFFECTS,
  SELECT_PLOP_FEEL,
  attachEmerge,
  bloomOrigin,
  emergeBridge,
  emergePose,
  emergeRestPose,
  findSelectOrigin,
  plopIn,
  selectBloomsFromItem,
  selectPlopFrame,
  selectPlopKeyframes,
  type EmergeRect,
} from '../src'

const bloom = { flow: true, flowStyle: 'bloom' } as const
const trigger: EmergeRect = { x: 400, y: 300, width: 160, height: 36 }
/** An item-aligned list laid over the trigger. */
const over: EmergeRect = { x: 392, y: 220, width: 200, height: 240 }

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('select bloom origin', () => {
  it('a panel over its anchor has no anchor to keep off (and no gap trim)', () => {
    const b = emergeBridge(trigger, over, 'bottom')
    expect(b.anchorRect).toBeUndefined()
    // A panel beside the anchor keeps it.
    const below = emergeBridge(trigger, { x: 400, y: 340, width: 200, height: 240 }, 'bottom')
    expect(below.anchorRect).toBeDefined()
  })

  it('bloomOrigin defaults to the center and clamps a droplet inside the panel', () => {
    expect(bloomOrigin({ width: 200, height: 100 })).toEqual({ x: 100, y: 50 })
    expect(bloomOrigin({ width: 200, height: 100, origin: { x: 50, y: 30 } }, 20)).toEqual({ x: 50, y: 30 })
    expect(bloomOrigin({ width: 200, height: 100, origin: { x: -40, y: 400 } }, 20)).toEqual({ x: 10, y: 90 })
  })

  it('the bloom grows out of the origin, stays inside the panel, and ends at rest', () => {
    const b = { ...emergeBridge(trigger, over, 'bottom'), origin: { x: 100, y: 30 } }
    const first = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
    expect(first.body.cy).toBeLessThan(60)
    expect(Math.abs(first.body.cx - 100)).toBeLessThan(5)
    let prev = first.body.cy
    for (let i = 1; i <= 50; i++) {
      const p = emergePose(i / 50, b, 'open', EMERGE_FEEL.playful, { ...bloom, wobble: false })
      if (p.body.h <= 0) continue
      // Slides toward the center as it spreads; never leaves the panel.
      expect(p.body.cy).toBeGreaterThanOrEqual(prev - 1e-6)
      prev = p.body.cy
      expect(p.body.cy - p.body.h / 2).toBeGreaterThanOrEqual(-1e-6)
      expect(p.body.cy + p.body.h / 2).toBeLessThanOrEqual(b.height + 1e-6)
    }
    expect(emergePose(1, b, 'open', EMERGE_FEEL.playful, bloom)).toEqual(emergeRestPose(b))
    // Close shrinks back toward the origin.
    const late = emergePose(0.8, b, 'close', EMERGE_FEEL.playful, bloom).body
    expect(late.cy).toBeLessThan(b.height / 2)
  })

  it('without an origin the bloom is unchanged (centered)', () => {
    const b = emergeBridge(trigger, { x: 400, y: 340, width: 200, height: 240 }, 'bottom')
    const p = emergePose(0.02, b, 'open', EMERGE_FEEL.playful, bloom)
    expect(p.body.cx).toBeCloseTo(100)
    expect(p.body.cy).toBeCloseTo(120)
  })

  it('attachEmerge reads bloomOrigin (an element) each frame', () => {
    const host = document.createElement('div')
    const item = document.createElement('div')
    host.append(item)
    document.body.append(host)
    host.getBoundingClientRect = () => ({ left: 100, top: 100, width: 200, height: 240, x: 100, y: 100, right: 300, bottom: 340, toJSON() {} }) as DOMRect
    item.getBoundingClientRect = () => ({ left: 100, top: 120, width: 200, height: 30, x: 100, y: 120, right: 300, bottom: 150, toJSON() {} }) as DOMRect
    let calls = 0
    const h = attachEmerge(host, { ...bloom, bloomOrigin: () => (calls++, item) })
    h.open()
    expect(calls).toBeGreaterThan(0)
    h.destroy()
  })

  it('selectBloomsFromItem: auto follows the position; selected / center force it', () => {
    expect(selectBloomsFromItem('item-aligned')).toBe(true)
    expect(selectBloomsFromItem('popper')).toBe(false)
    expect(selectBloomsFromItem('popper', 'selected')).toBe(true)
    expect(selectBloomsFromItem('item-aligned', 'center')).toBe(false)
  })

  it('findSelectOrigin: the selected option, else the highlighted one', () => {
    const list = document.createElement('div')
    list.innerHTML = `
      <div role="option" id="a" aria-selected="false"></div>
      <div role="option" id="b" aria-selected="false" data-highlighted></div>
      <div role="option" id="c" aria-selected="true"></div>`
    expect(findSelectOrigin(list)!.id).toBe('c')
    list.querySelector('#c')!.setAttribute('aria-selected', 'false')
    expect(findSelectOrigin(list)!.id).toBe('b')
    list.querySelector('#b')!.removeAttribute('data-highlighted')
    expect(findSelectOrigin(list)).toBeNull()
  })
})

describe('select plop', () => {
  it('lists its effects', () => {
    expect(SELECT_EFFECTS).toEqual(['highlight', 'pop', 'plop'])
  })

  it('falls in small, squashes wide and flat on landing, ends exactly at rest', () => {
    for (const feel of Object.values(SELECT_PLOP_FEEL)) {
      const start = selectPlopFrame(0, feel)
      expect(start.y).toBeLessThan(0)
      expect(start.sx).toBeLessThan(1)
      expect(start.opacity).toBe(0)
      const land = selectPlopFrame(0.36, feel)
      expect(land.sy).toBeLessThan(1)
      expect(land.sx).toBeGreaterThan(1)
      expect(selectPlopFrame(1, feel)).toEqual({ y: 0, sx: 1, sy: 1, opacity: 1 })
      // Continuous: no jumps between neighbouring samples.
      for (let i = 1; i <= 100; i++) {
        const a = selectPlopFrame((i - 1) / 100, feel)
        const b = selectPlopFrame(i / 100, feel)
        expect(Math.abs(a.sy - b.sy)).toBeLessThan(0.12)
        expect(Math.abs(a.sx - b.sx)).toBeLessThan(0.12)
      }
    }
  })

  it('wobble off: one plain rebound (never overshoots round)', () => {
    for (let i = 0; i <= 100; i++) expect(selectPlopFrame(i / 100, SELECT_PLOP_FEEL.wild, false).sy).toBeLessThanOrEqual(1 + 1e-9)
    const wobbly = Array.from({ length: 101 }, (_, i) => selectPlopFrame(i / 100, SELECT_PLOP_FEEL.wild).sy)
    expect(Math.max(...wobbly)).toBeGreaterThan(1)
  })

  it('keyframes run 0..1 and end at identity', () => {
    const k = selectPlopKeyframes()
    expect(k[0]!.offset).toBe(0)
    expect(k.at(-1)).toMatchObject({ offset: 1, opacity: 1, transform: 'translateY(0px) scale(1, 1)' })
  })

  it('plopIn animates, and does nothing under reduced motion', () => {
    const el = document.createElement('span')
    document.body.append(el)
    const anim = plopIn(el, { preset: 'playful' })
    expect(anim).not.toBeNull()
    anim?.cancel()
    document.documentElement.dataset.reducedMotion = 'true'
    expect(plopIn(el)).toBeNull()
    expect(plopIn(el, { reducedMotion: false })).not.toBeNull()
  })
})
