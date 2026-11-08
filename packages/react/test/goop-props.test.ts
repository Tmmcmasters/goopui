import { GOOP_DEFAULTS, GOOP_VAR_META } from '@goopui/core'
import { describe, expect, it } from 'vitest'
// The Vue adapter's mapping, imported from source (it only type-imports vue), so the two
// adapters provably send core the same options for the same props.
import * as vue from '../../vue/src/goop-props'
import {
  CHECKBOX_PROP_KEYS,
  DIALOG_PROP_KEYS,
  FEATURE_KEYS,
  GOOP_PROP_KEYS,
  GOOP_TUNING_KEYS,
  SWITCH_PROP_KEYS,
  TABS_PROP_KEYS,
  diffOptions,
  goopPropMeta,
  splitProps,
  toBackdropOptions,
  toCheckboxOptions,
  toDialogOptions,
  toGoopOptions,
  toGoopStyle,
  toSwitchOptions,
  toTabsOptions,
} from '../src'

describe('engine props', () => {
  it('has a prop for every core tuning knob, plus the engine options and oil vars', () => {
    for (const key of Object.keys(GOOP_DEFAULTS)) expect(GOOP_PROP_KEYS).toContain(key)
    expect(GOOP_TUNING_KEYS.length).toBe(Object.keys(GOOP_DEFAULTS).length)
    for (const key of ['preset', 'renderer', 'finish', 'splash', 'timeScale', 'oilIntensity', 'goop']) expect(GOOP_PROP_KEYS).toContain(key)
  })

  it('lists the same keys as @goopui/vue', () => {
    expect([...GOOP_TUNING_KEYS]).toEqual([...vue.GOOP_TUNING_KEYS])
    expect([...FEATURE_KEYS]).toEqual([...vue.FEATURE_KEYS])
    expect([...TABS_PROP_KEYS]).toEqual([...vue.TABS_PROP_KEYS])
    expect([...DIALOG_PROP_KEYS]).toEqual([...vue.DIALOG_PROP_KEYS])
    expect(Object.keys(vue.goopSwitchProps).sort()).toEqual([...SWITCH_PROP_KEYS].sort())
    expect(Object.keys(vue.goopCheckboxProps).sort()).toEqual([...CHECKBOX_PROP_KEYS].sort())
  })

  it('every tuning prop has core metadata', () => {
    for (const key of GOOP_TUNING_KEYS) expect(goopPropMeta(key)).toBe(GOOP_VAR_META[key])
  })

  it('splitProps takes the listed keys off', () => {
    const [engine, rest] = splitProps({ dripSize: 9, onClick: 1, className: 'x', goop: {} } as Record<string, unknown>, GOOP_PROP_KEYS as never)
    expect(engine).toEqual({ dripSize: 9, goop: {} })
    expect(rest).toEqual({ onClick: 1, className: 'x' })
  })
})

describe('props -> core options match @goopui/vue', () => {
  const cases = [
    {},
    { shockwave: false, puddles: false, gloss: false },
    { shockwave: true, taffy: true, preset: 'wild' as const },
    { splash: true },
    { splash: false, dripSize: 12, goop: { restingDrips: [0.3, 0.7], dripSize: 4 } },
  ]
  for (const props of cases) {
    it(`toGoopOptions(${JSON.stringify(props)})`, () => {
      expect(toGoopOptions(props as never, { seed: 3 })).toEqual(vue.toGoopOptions(props as never, { seed: 3 }))
    })
  }

  it('toGoopStyle writes the oil vars', () => {
    expect(toGoopStyle({ oilIntensity: 0.6 })).toEqual(vue.toGoopStyle({ oilIntensity: 0.6 }))
    expect(Object.keys(toGoopStyle({ oilIntensity: 0.6 }))[0]).toMatch(/^--goop-/)
  })

  it('switch / checkbox / tabs / dialog / backdrop', () => {
    const cfg = { preset: 'subtle' as const, reducedMotion: true as const }
    expect(toSwitchOptions({ splat: false, speed: 2 }, cfg)).toEqual(vue.toSwitchOptions({ splat: false, speed: 2 }, cfg))
    expect(toCheckboxOptions({ droplets: 0.5 }, cfg)).toEqual(vue.toCheckboxOptions({ droplets: 0.5 }, cfg))
    for (const p of [{}, { wobble: false }, { goo: false }, { indicator: false }])
      expect(toTabsOptions(p, cfg)).toEqual(vue.toTabsOptions(p, cfg))
    for (const p of [{}, { openDrips: false, bloomStart: 'merge' as const, openDripAmount: 2 }, { surface: 'trigger' as const }]) {
      expect(toDialogOptions(p, cfg)).toEqual(vue.toDialogOptions(p, cfg))
      expect(toDialogOptions(p, cfg, 'alert')).toEqual(vue.toDialogOptions(p, cfg, 'alert'))
    }
    for (const p of [{}, { overlay: true, overlayDrips: false }, { goo: false }]) expect(toBackdropOptions(p, cfg)).toEqual(vue.toBackdropOptions(p, cfg))
  })

  it('diffOptions resets keys that went away', () => {
    expect(diffOptions({ dripSize: 3 }, {})).toEqual({ dripSize: undefined })
    expect(diffOptions({ restingDrips: [1, 2] }, { restingDrips: [1, 2] })).toBeNull()
  })
})
