import { GOOP_DEFAULTS, GOOP_PRESETS, GOOP_VAR_META } from '@goopui/core'
import { describe, expect, it } from 'vitest'
import { FEATURE_KEYS, GOOP_TUNING_KEYS, diffOptions, goopPropMeta, goopProps, toGoopOptions } from '../src'

describe('goopProps', () => {
  it('has a prop for every core tuning knob, all defaulting to undefined', () => {
    for (const key of Object.keys(GOOP_DEFAULTS)) {
      expect(goopProps).toHaveProperty(key)
      expect((goopProps as Record<string, { default: unknown }>)[key]!.default).toBeUndefined()
    }
    expect(GOOP_TUNING_KEYS.length).toBe(Object.keys(GOOP_DEFAULTS).length)
  })

  it('every tuning prop has core metadata (label, range)', () => {
    for (const key of GOOP_TUNING_KEYS) {
      const meta = goopPropMeta(key)
      expect(meta?.label, key).toBeTruthy()
      expect(meta).toBe(GOOP_VAR_META[key])
    }
  })

  it('feature props accept booleans', () => {
    for (const key of FEATURE_KEYS) {
      const type = (goopProps as Record<string, { type: unknown }>)[key]!.type
      expect(type, key).toContain(Boolean)
    }
  })
})

describe('toGoopOptions', () => {
  it('skips undefined props so CSS vars and presets still apply', () => {
    expect(toGoopOptions({})).toEqual({})
    expect(toGoopOptions({ dripSize: undefined, shockwave: undefined })).toEqual({})
  })

  it('false turns a feature off; true turns it on at preset strength', () => {
    expect(toGoopOptions({ shockwave: false, puddles: false, gloss: false })).toEqual({
      shockwave: 0,
      puddles: false,
      gloss: false,
    })
    expect(toGoopOptions({ gloss: true }).gloss).toBe(true) // core bumps toggles itself
    expect(toGoopOptions({ shockwave: true, preset: 'wild' }).shockwave).toBe(GOOP_PRESETS.wild.tuning.shockwave)
    // subtle sets splashAmount 0: `true` must still turn it on.
    expect(toGoopOptions({ splashAmount: true, preset: 'subtle' }).splashAmount).toBe(GOOP_DEFAULTS.splashAmount)
  })

  it('splash takes a boolean or a mode', () => {
    expect(toGoopOptions({ splash: false }).splash).toBe('off')
    expect(toGoopOptions({ splash: true }).splash).toBe('near')
    expect(toGoopOptions({ splash: true, goop: { splash: 'escape' } }).splash).toBe('escape')
    expect(toGoopOptions({ splash: 'escape' }).splash).toBe('escape')
  })

  it('precedence: base < goop < props', () => {
    const o = toGoopOptions({ dripSize: 9, goop: { dripSize: 5, dripCount: 2 } }, { dripCount: 1, preset: 'subtle' })
    expect(o).toEqual({ dripSize: 9, dripCount: 2, preset: 'subtle' })
  })
})

describe('diffOptions', () => {
  it('returns null when nothing changed (deep)', () => {
    expect(diffOptions({ restingDrips: [0.2, 0.8] }, { restingDrips: [0.2, 0.8] })).toBeNull()
  })
  it('sends removed keys as undefined', () => {
    expect(diffOptions({ dripSize: 9, preset: 'wild' }, { preset: 'wild' })).toEqual({ preset: 'wild', dripSize: undefined })
  })
})
