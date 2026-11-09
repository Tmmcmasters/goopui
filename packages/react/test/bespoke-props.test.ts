// Bespoke batch 1 (Toaster, Command, Combobox, NumberField, InputOTP): the React props send core
// exactly what @goopui/vue's do (imported from source; it only type-imports vue).
import { describe, expect, it } from 'vitest'
import * as vue from '../../vue/src/goop-props'
import {
  COMBOBOX_PROP_KEYS,
  COMMAND_DIALOG_PROP_KEYS,
  COMMAND_INPUT_PROP_KEYS,
  COMMAND_PROP_KEYS,
  INPUT_OTP_PROP_KEYS,
  NUMBER_FIELD_PROP_KEYS,
  TOASTER_PROP_KEYS,
  resolveComboboxProps,
  resolveCommandProps,
  toComboboxOptions,
  toCommandInputOptions,
  toCommandOptions,
  toInputOTPOptions,
  toNumberFieldOptions,
  toToasterOptions,
} from '../src'

const cfgs = [{}, { preset: 'subtle' as const, renderer: 'canvas' as const, reducedMotion: true as const }]

describe('bespoke batch 1 props match @goopui/vue', () => {
  it('lists the same prop keys', () => {
    expect([...TOASTER_PROP_KEYS]).toEqual([...vue.TOASTER_PROP_KEYS])
    expect([...COMMAND_PROP_KEYS]).toEqual([...vue.COMMAND_PROP_KEYS])
    expect([...COMMAND_DIALOG_PROP_KEYS].sort()).toEqual([...vue.COMMAND_DIALOG_PROP_KEYS].sort())
    expect([...COMBOBOX_PROP_KEYS].sort()).toEqual([...vue.COMBOBOX_PROP_KEYS].sort())
    expect([...NUMBER_FIELD_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopNumberFieldProps).sort())
    expect([...INPUT_OTP_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopInputOTPProps).sort())
    expect([...COMMAND_INPUT_PROP_KEYS].sort()).toEqual(Object.keys(vue.goopInputProps).sort())
  })

  it('sends core the same options', () => {
    for (const cfg of cfgs) {
      for (const p of [{}, { goo: false }, { dropIn: false, merge: 2, speed: 0.5, preset: 'wild' as const }])
        expect(toToasterOptions(p, cfg)).toEqual(vue.toToasterOptions(p, cfg))
      for (const p of [{}, { goo: false }, { highlight: false }, { ring: false, wobble: false, speed: 2 }, { pop: false, followPointer: false, preset: 'wild' as const }])
        expect(toCommandOptions(resolveCommandProps(p), cfg)).toEqual(vue.toCommandOptions(vue.resolveCommandProps(p), cfg))
      for (const p of [{}, { goo: false }, { highlight: false, plop: false }, { flowStyle: 'neck' as const, openDripAmount: 2, surface: 'trigger' }, { wobble: false, speed: 0.5 }])
        expect(toComboboxOptions(resolveComboboxProps(p), cfg)).toEqual(vue.toComboboxOptions(vue.resolveComboboxProps(p), cfg))
      for (const p of [{}, { squish: false, nudge: 2, flow: false }, { speed: 0.5, preset: 'wild' as const }])
        expect(toNumberFieldOptions(p, cfg)).toEqual(vue.toNumberFieldOptions(p, cfg))
      for (const p of [{}, { flow: false, pulse: false }, { flood: 2, speed: 2 }]) expect(toInputOTPOptions(p, cfg)).toEqual(vue.toInputOTPOptions(p, cfg))
      for (const p of [{}, { ripple: false, drain: 2 }]) expect(toCommandInputOptions(p, cfg)).toEqual(vue.toInputOptions(p, cfg))
    }
  })
})
