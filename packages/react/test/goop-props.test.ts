import { GOOP_DEFAULTS, GOOP_VAR_META } from '@goopui/core'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// The Vue adapter's mapping, imported from source (it only type-imports vue), so the two
// adapters provably send core the same options for the same props.
import * as vue from '../../vue/src/goop-props'
import {
  AVATAR_PROP_KEYS,
  BADGE_PROP_KEYS,
  CARD_PROP_KEYS,
  CHECKBOX_PROP_KEYS,
  DIALOG_PROP_KEYS,
  FEATURE_KEYS,
  GOOP_PROP_KEYS,
  GOOP_TUNING_KEYS,
  SKELETON_PROP_KEYS,
  SKELETON_REVEAL_PROP_KEYS,
  SPINNER_PROP_KEYS,
  SWITCH_PROP_KEYS,
  TABS_PROP_KEYS,
  diffOptions,
  goopPropMeta,
  splitProps,
  toAvatarOptions,
  toBackdropOptions,
  toBadgeOptions,
  toCardOptions,
  toCheckboxOptions,
  toDialogOptions,
  toGoopOptions,
  toGoopStyle,
  toSkeletonOptions,
  toSkeletonRevealOptions,
  toSpinnerOptions,
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

describe('batch 1 (skeleton, reveal, badge, avatar, card, spinner) match @goopui/vue', () => {
  it('lists the same prop keys', () => {
    expect([...SKELETON_PROP_KEYS]).toEqual([...vue.SKELETON_PROP_KEYS])
    expect([...SKELETON_REVEAL_PROP_KEYS]).toEqual([...vue.SKELETON_REVEAL_PROP_KEYS])
    expect([...BADGE_PROP_KEYS]).toEqual([...vue.BADGE_PROP_KEYS])
    expect([...AVATAR_PROP_KEYS]).toEqual([...vue.AVATAR_PROP_KEYS])
    expect([...CARD_PROP_KEYS]).toEqual([...vue.CARD_PROP_KEYS])
    expect(Object.keys(vue.goopSkeletonProps).sort()).toEqual([...SKELETON_PROP_KEYS].sort())
    expect(Object.keys(vue.goopCardProps).sort()).toEqual([...CARD_PROP_KEYS].sort())
  })

  it('sends core the same options', () => {
    const cfgs = [{}, { preset: 'subtle' as const, reducedMotion: true as const }]
    const cases = [{}, { shimmer: false }, { shimmer: 2, speed: 0.5, preset: 'wild' as const }]
    for (const cfg of cfgs) {
      for (const p of cases) expect(toSkeletonOptions(p, cfg)).toEqual(vue.toSkeletonOptions(p, cfg))
      for (const p of [{}, { swell: false }, { swell: 2, preset: 'wild' as const }]) expect(toBadgeOptions(p, cfg)).toEqual(vue.toBadgeOptions(p, cfg))
      for (const p of [{}, { settle: false }, { settle: 0.5, speed: 2 }]) expect(toAvatarOptions(p, cfg)).toEqual(vue.toAvatarOptions(p, cfg))
      for (const p of [{}, { sheen: false, melt: 2 }, { breathe: 0, preset: 'wild' as const }])
        expect(toSkeletonRevealOptions(p, cfg)).toEqual(vue.toSkeletonRevealOptions(p, cfg))
      for (const p of [{}, { goo: true }, { goo: true, swell: 2, speed: 0.5 }, { goo: false, swell: 2 }]) expect(toCardOptions(p, cfg)).toEqual(vue.toCardOptions(p, cfg))
    }
    expect(toCardOptions({})).toBeNull()
  })

  it("GoopSpinner: the same props and defaults as GoopSpinner.vue's", () => {
    // GoopSpinner.vue declares its props inline (no goop-props helper), so read them from the SFC.
    const sfc = readFileSync(join(__dirname, '../../vue/src/components/spinner/GoopSpinner.vue'), 'utf8')
    const block = /defineProps\(\{([\s\S]*?)\n\}\)/.exec(sfc)![1]!
    const props = Object.fromEntries([...block.matchAll(/^  (\w+): \{[^\n]*?default: ([^,}]+)/gm)].map((m) => [m[1], m[2]!.trim()]))
    delete props.class
    expect(Object.keys(props).sort()).toEqual([...SPINNER_PROP_KEYS].sort())
    // Vue's defaults, as core sees them with no props set.
    const opts = toSpinnerOptions({})
    expect(props.variant).toBe('SPINNER_DEFAULT_VARIANT')
    expect(props.blobs).toBe('SPINNER_DEFAULT_BLOBS')
    for (const k of ['speed', 'drips', 'interactive', 'slosh', 'grab', 'pop'] as const) expect(String(opts[k])).toBe(props[k])
    for (const k of ['preset', 'renderer'] as const) expect(props[k]).toBe('undefined')
    // App config fills preset / renderer / reducedMotion, like the SFC's computed options.
    expect(toSpinnerOptions({ variant: 'comet', blobs: 6 }, { preset: 'wild', renderer: 'canvas', reducedMotion: true })).toMatchObject({
      variant: 'comet',
      blobs: 6,
      preset: 'wild',
      renderer: 'canvas',
      reducedMotion: true,
    })
  })
})
