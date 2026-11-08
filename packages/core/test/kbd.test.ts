import { afterEach, describe, expect, it } from 'vitest'
import { KBD_EFFECTS, KBD_FEEL, activeTickerCount, attachKbd, kbdHasKey, kbdMatches, kbdModifier, kbdPose } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const ev = (key: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}, code?: string) => ({
  key,
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})
const frames = (n: number) => new Promise((r) => setTimeout(r, n * 17))

describe('kbd keys', () => {
  it('reads modifier aliases', () => {
    for (const k of ['Meta', 'cmd', '⌘', 'Command']) expect(kbdModifier(k)).toBe('meta')
    expect(kbdModifier('Option')).toBe('alt')
    expect(kbdModifier('⇧')).toBe('shift')
    expect(kbdModifier('K')).toBeNull()
  })

  it('matches a combo only with its modifiers held', () => {
    expect(kbdMatches(['Meta', 'K'], ev('k', { metaKey: true }))).toBe(true)
    expect(kbdMatches(['⌘', 'K'], ev('K', { metaKey: true }))).toBe(true)
    expect(kbdMatches(['Meta', 'K'], ev('k'))).toBe(false)
    expect(kbdMatches(['Meta', 'K'], ev('j', { metaKey: true }))).toBe(false)
    expect(kbdMatches(['Meta'], ev('Meta', { metaKey: true }))).toBe(true)
    expect(kbdMatches(['Esc'], ev('Escape'))).toBe(true)
    // Option+K types "˚": the physical key still matches.
    expect(kbdMatches(['Alt', 'K'], ev('˚', { altKey: true }, 'KeyK'))).toBe(true)
    expect(kbdMatches([], ev('k'))).toBe(false)
    expect(kbdMatches(undefined, ev('k'))).toBe(false)
    expect(kbdHasKey(['Meta', 'K'], ev('Meta'))).toBe(true)
  })
})

describe('kbd pose', () => {
  it('squishes into its base and spreads a little; bounded', () => {
    const f = KBD_FEEL.playful
    expect(kbdPose(0, f)).toEqual({ sx: 1, sy: 1, ty: 0 })
    const p = kbdPose(1, f)
    expect(p.sy).toBeCloseTo(1 - f.squish)
    expect(p.sx).toBeCloseTo(1 + f.spread)
    expect(p.ty).toBeCloseTo(f.sink)
    expect(kbdPose(99, f).sy).toBeGreaterThan(0.8)
    expect(kbdPose(-1, f).ty).toBe(0)
    expect(kbdPose(1, f, 0)).toEqual({ sx: 1, sy: 1, ty: 0 })
    expect(KBD_FEEL.wild.squish).toBeGreaterThan(KBD_FEEL.subtle.squish)
    expect([...KBD_EFFECTS]).toEqual(['press'])
  })
})

describe('attachKbd', () => {
  const kbd = () => {
    const el = document.createElement('kbd')
    document.body.append(el)
    return el
  }

  it('presses on the matching combo, releases on keyup, then rests', async () => {
    const el = kbd()
    const h = attachKbd(el, { keys: ['Meta', 'K'] })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }))
    expect(h.pressed).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
    expect(h.pressed).toBe(true)
    expect(el.hasAttribute('data-goop-pressed')).toBe(true)
    await frames(4)
    expect(el.style.transform).toContain('scale')
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta' }))
    expect(h.pressed).toBe(true) // still easing back (release spring)
    await frames(90)
    expect(el.style.transform).toBe('')
    expect(activeTickerCount()).toBe(0)
    h.destroy()
  })

  it('a click presses it too', () => {
    const el = kbd()
    const h = attachKbd(el)
    el.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }))
    expect(h.pressed).toBe(true)
    h.destroy()
    expect(el.style.transform).toBe('')
    expect(activeTickerCount()).toBe(0)
  })

  it('static when off or under reduced motion', () => {
    const a = attachKbd(kbd(), { press: false, keys: ['a'] })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(a.pressed).toBe(false)
    document.documentElement.dataset.reducedMotion = 'true'
    const el = kbd()
    const b = attachKbd(el, { keys: ['a'] })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    expect(b.pressed).toBe(false)
    expect(el.style.transform).toBe('')
  })
})
