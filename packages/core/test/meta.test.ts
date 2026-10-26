import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GOOP_CSS_VARS,
  GOOP_DEFAULTS,
  GOOP_FINISH_DEFAULTS,
  GOOP_FINISH_VARS,
  GOOP_LIMITS,
  GOOP_OPTION_RENAMES,
  GOOP_PRESETS,
  GOOP_VAR_META,
  GOOP_VAR_RENAMES,
  readFinish,
  readTuning,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const host = () => {
  const el = document.createElement('div')
  document.body.append(el)
  return el
}

describe('GOOP_VAR_META', () => {
  it('covers every tuning knob, the finish vars and the keyword vars', () => {
    for (const k of Object.keys(GOOP_DEFAULTS)) expect(GOOP_VAR_META[k], k).toBeDefined()
    for (const k of Object.keys(GOOP_FINISH_VARS)) expect(GOOP_VAR_META[k], k).toBeDefined()
    for (const k of ['preset', 'splash', 'finish']) expect(GOOP_VAR_META[k], k).toBeDefined()
  })

  it('every entry is complete and self-consistent', () => {
    for (const [key, m] of Object.entries(GOOP_VAR_META)) {
      expect(m.option, key).toBe(key)
      expect(m.name, key).toMatch(/^--goop-[a-z0-9-]+$/)
      expect(m.label.split(' ').length, key).toBeLessThanOrEqual(4)
      expect(m.description.length, key).toBeGreaterThan(20)
      expect(m.description.trim().endsWith('.'), key).toBe(true)
      expect(m.unit, key).toBeTruthy()
      expect(m.group, key).toBeTruthy()
      expect(['none', 'low', 'medium', 'high']).toContain(m.cost)
      expect(m.reducedMotion, key).toBeTruthy()
      if (typeof m.default === 'number') {
        expect(m.min, key).toBeLessThanOrEqual(m.default)
        expect(m.max, key).toBeGreaterThanOrEqual(m.default)
        expect(m.step, key).toBeGreaterThan(0)
      } else {
        expect(m.values, key).toContain(m.default)
      }
    }
    const names = Object.values(GOOP_VAR_META).map((m) => m.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('defaults, CSS names, limits and finish defaults agree with the metadata', () => {
    for (const [k, v] of Object.entries(GOOP_DEFAULTS)) {
      const m = GOOP_VAR_META[k]!
      expect(v, k).toBe(m.default)
      expect(GOOP_CSS_VARS[k as keyof typeof GOOP_CSS_VARS]).toBe(m.name)
      expect(GOOP_LIMITS[k as keyof typeof GOOP_LIMITS]).toEqual([m.min, m.max])
    }
    for (const [k, name] of Object.entries(GOOP_FINISH_VARS)) {
      expect(name).toBe(GOOP_VAR_META[k]!.name)
      expect(GOOP_FINISH_DEFAULTS[k as keyof typeof GOOP_FINISH_DEFAULTS]).toBe(GOOP_VAR_META[k]!.default)
    }
  })

  it('preset values stay inside the limits', () => {
    for (const p of Object.values(GOOP_PRESETS)) {
      for (const [k, v] of Object.entries(p.tuning)) {
        const [lo, hi] = GOOP_LIMITS[k as keyof typeof GOOP_LIMITS]
        expect(v, k).toBeGreaterThanOrEqual(lo)
        expect(v, k).toBeLessThanOrEqual(hi)
      }
    }
  })
})

describe('renames: old names still work', () => {
  it('every deprecated CSS var still resolves to its new knob (with a one-time warning)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const [oldName, newName] of Object.entries(GOOP_VAR_RENAMES)) {
      const key = Object.keys(GOOP_VAR_META).find((k) => GOOP_VAR_META[k]!.name === newName)!
      const m = GOOP_VAR_META[key]!
      const el = host()
      const v = (m.min! + m.max!) / 2
      el.style.setProperty(oldName, String(v))
      const got = key in GOOP_DEFAULTS ? (readTuning(el) as unknown as Record<string, number>)[key] : (readFinish(el) as unknown as Record<string, number>)[key]
      expect(got, oldName).toBeCloseTo(key === 'dripCount' || key === 'maxDrips' || key === 'restingDrips' ? Math.round(v) : v)
      // the new name wins over the old one
      el.style.setProperty(newName, String(m.min))
      const got2 = key in GOOP_DEFAULTS ? (readTuning(el) as unknown as Record<string, number>)[key] : (readFinish(el) as unknown as Record<string, number>)[key]
      expect(got2, newName).toBeCloseTo(m.min!)
    }
    expect(warn).toHaveBeenCalled()
  })

  it('every deprecated JS option still works', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const [oldKey, newKey] of Object.entries(GOOP_OPTION_RENAMES)) {
      const m = GOOP_VAR_META[newKey]!
      const v = m.max!
      if (newKey in GOOP_DEFAULTS) {
        expect((readTuning(host(), { [oldKey]: v } as never) as unknown as Record<string, number>)[newKey], oldKey).toBe(v)
      } else {
        expect((readFinish(host(), { [oldKey]: v } as never) as unknown as Record<string, number>)[newKey], oldKey).toBe(v)
      }
    }
  })
})
