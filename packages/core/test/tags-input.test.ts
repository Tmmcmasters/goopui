import { afterEach, describe, expect, it } from 'vitest'
import {
  INPUT_EFFECTS,
  TAG_ANIM_CIRCLES,
  TAG_FEEL,
  TAGS_INPUT_EFFECTS,
  attachTagsInput,
  tagMeltPose,
  tagMergePose,
  type TagBox,
} from '../src'

const F = TAG_FEEL.playful
const BOX: TagBox = { x: 60, y: 6, w: 64, h: 20 }
const PREV: TagBox = { x: 6, y: 6, w: 48, h: 20 }
const tick = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('tag poses', () => {
  it('lists the ring effects, then merge and melt', () => {
    expect([...TAGS_INPUT_EFFECTS]).toEqual([...INPUT_EFFECTS, 'merge', 'melt'])
  })

  it('merge: starts as a small round drop at the tag middle, ends as the tag pill', () => {
    const a = tagMergePose(0, BOX, PREV, F)
    expect(a.circles).toHaveLength(TAG_ANIM_CIRCLES)
    const pill = a.circles.slice(0, 14)
    expect(new Set(pill.map((c) => Math.round(c.x))).size).toBe(1)
    expect(pill[0]!.x).toBeCloseTo(BOX.x + BOX.w / 2)
    expect(pill[0]!.r).toBeCloseTo((BOX.h / 2) * F.drop)
    expect(a.opacity).toBe(0)
    const z = tagMergePose(1, BOX, PREV, F)
    expect(z.opacity).toBe(1)
    expect(z.scaleX).toBe(1)
    expect(z.scaleY).toBe(1)
    const end = z.circles.slice(0, 14)
    expect(end[0]!.x).toBeCloseTo(BOX.x + BOX.h / 2)
    expect(end[13]!.x).toBeCloseTo(BOX.x + BOX.w - BOX.h / 2)
    expect(end[0]!.r).toBeCloseTo(BOX.h / 2)
  })

  it('merge: a small jelly overshoot, never a big one; none with fx 0', () => {
    let max = 0
    let max0 = 0
    for (let u = 0; u <= 1; u += 0.01) {
      max = Math.max(max, tagMergePose(u, BOX, null, F).scaleX)
      max0 = Math.max(max0, tagMergePose(u, BOX, null, F, 0).scaleX)
    }
    expect(max).toBeGreaterThan(1)
    expect(max).toBeLessThan(1.12)
    expect(max0).toBeLessThanOrEqual(1.0001)
  })

  it('merge: a bridge to the tag before it swells, then pinches off', () => {
    const mid = tagMergePose(0.35, BOX, PREV, F).circles.slice(14)
    expect(mid[0]!.r).toBeGreaterThan(1)
    expect(mid[0]!.x).toBeGreaterThan(PREV.x + PREV.w - 1)
    expect(tagMergePose(0.9, BOX, PREV, F).circles.slice(14).every((c) => c.r === 0)).toBe(true)
    expect(tagMergePose(0.35, BOX, null, F).circles.slice(14).every((c) => c.r === 0)).toBe(true)
  })

  it('melt: pinches in, sinks and is gone at the end', () => {
    const a = tagMeltPose(0, BOX, F)
    expect(a.opacity).toBe(1)
    const half = tagMeltPose(0.5, BOX, F)
    const span = (cs: { x: number }[]) => cs[13]!.x - cs[0]!.x
    expect(span(half.circles)).toBeLessThan(span(a.circles))
    expect(half.circles[0]!.y).toBeGreaterThan(a.circles[0]!.y)
    const z = tagMeltPose(1, BOX, F)
    expect(z.opacity).toBe(0)
    expect(z.circles.every((c) => c.r === 0)).toBe(true)
  })
})

function tag(text: string, w = 48) {
  const el = document.createElement('div')
  el.setAttribute('data-slot', 'tags-input-item')
  el.textContent = text
  // happy-dom has no layout: give the tag a size.
  Object.defineProperty(el, 'offsetWidth', { value: w, configurable: true })
  Object.defineProperty(el, 'offsetHeight', { value: 20, configurable: true })
  return el
}
function mount(tags: string[] = ['a', 'b']) {
  const host = document.createElement('div')
  const root = document.createElement('div')
  root.setAttribute('data-slot', 'tags-input')
  for (const t of tags) root.append(tag(t))
  const input = document.createElement('input')
  input.setAttribute('data-slot', 'tags-input-input')
  root.append(input)
  host.append(root)
  document.body.append(host)
  return { host, root, input }
}

describe('attachTagsInput', () => {
  it('puts the focus ring on the host around the box, no tag layer until something moves', () => {
    const { host, root } = mount()
    const h = attachTagsInput(host, root, { reducedMotion: false })
    expect(h.input).not.toBeNull()
    expect(host.querySelector(':scope > [data-goop-part="input"]')).not.toBeNull()
    expect(root.querySelector('[data-goop-part="tags-input-tag"]')).toBeNull()
    h.destroy()
    expect(host.querySelector('[data-goop-part="input"]')).toBeNull()
  })

  it('existing tags never animate; a new tag merges in, a removed one melts', async () => {
    const { host, root, input } = mount()
    const h = attachTagsInput(host, root, { reducedMotion: false })
    await tick()
    expect(h.animating).toBe(0)
    const c = tag('c')
    root.insertBefore(c, input)
    await tick()
    expect(h.animating).toBe(1)
    expect(c.style.opacity).not.toBe('')
    expect(root.querySelector('[data-goop-part="tags-input-tag"]')).not.toBeNull()
    root.firstElementChild!.nextElementSibling!.remove()
    await tick()
    expect(h.animating).toBe(2)
    h.destroy()
    expect(c.style.opacity).toBe('')
    expect(c.style.transform).toBe('')
    expect(root.querySelector('[data-goop-part="tags-input-tag"]')).toBeNull()
  })

  it('merge / melt off: nothing animates', async () => {
    const { host, root, input } = mount()
    const h = attachTagsInput(host, root, { merge: false, melt: false, reducedMotion: false })
    root.insertBefore(tag('c'), input)
    root.firstElementChild!.remove()
    await tick()
    expect(h.animating).toBe(0)
    h.destroy()
  })

  it('reduced motion: nothing animates', async () => {
    const { host, root, input } = mount()
    const h = attachTagsInput(host, root, { reducedMotion: true })
    root.insertBefore(tag('c'), input)
    await tick()
    expect(h.animating).toBe(0)
    expect(h.reducedMotion).toBe(true)
    h.destroy()
  })

  it('works without an input (no ring)', () => {
    const host = document.createElement('div')
    const root = document.createElement('div')
    host.append(root)
    document.body.append(host)
    const h = attachTagsInput(host, root)
    expect(h.input).toBeNull()
    h.destroy()
  })
})
