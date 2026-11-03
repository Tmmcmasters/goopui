import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GOOP_SOUND_CUES,
  cueAttrs,
  disableSound,
  enableSound,
  isSoundEnabled,
  playCue,
  requestSound,
  setSoundEnabled,
  toastCue,
} from '../src/index'
import { __resetSound } from '../src/sound'

function fakeCuelume() {
  const api = { bind: vi.fn(() => vi.fn()), play: vi.fn(), setEnabled: vi.fn() }
  return { api, loader: vi.fn(async () => api) }
}

const tick = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => __resetSound())

describe('sound: markup', () => {
  it('maps parts to data-cuelume attributes', () => {
    expect(cueAttrs('button')).toEqual({ 'data-cuelume-tap': '' })
    expect(cueAttrs('switch')).toEqual({ 'data-cuelume-toggle': '' })
    expect(cueAttrs('menuTrigger')).toEqual({ 'data-cuelume-open': '', 'data-cuelume-emphasis': 'subtle' })
    expect(cueAttrs({ bind: 'tap', cue: 'close' })).toEqual({ 'data-cuelume-tap': 'close' })
  })

  it('flips an open binding to close while open', () => {
    expect(cueAttrs('accordionTrigger', { open: true })).toEqual({ 'data-cuelume-close': '', 'data-cuelume-emphasis': 'subtle' })
    expect(cueAttrs('dialogClose', { open: true })).toEqual({ 'data-cuelume-close': '' })
  })

  it('never binds hover-only parts', () => {
    expect(Object.keys(GOOP_SOUND_CUES)).not.toContain('tooltipTrigger')
    expect(Object.keys(GOOP_SOUND_CUES)).not.toContain('hoverCardTrigger')
  })

  it('maps toast types to outcome cues', () => {
    expect(toastCue('success')).toBe('success')
    expect(toastCue('error')).toBe('error')
    expect(toastCue('warning')).toBe('warning')
    expect(toastCue('info')).toBe('ready')
    expect(toastCue(undefined)).toBe('ready')
    expect(toastCue('nope')).toBeNull()
  })
})

describe('sound: playback', () => {
  it('is off by default and playCue no-ops without loading cuelume', async () => {
    const { api, loader } = fakeCuelume()
    __resetSound(loader)
    expect(isSoundEnabled()).toBe(false)
    playCue('success')
    await tick()
    expect(loader).not.toHaveBeenCalled()
    expect(api.play).not.toHaveBeenCalled()
  })

  it('enableSound loads, binds once and unmutes; playCue then plays', async () => {
    const { api, loader } = fakeCuelume()
    __resetSound(loader)
    expect(await enableSound()).toBe(true)
    await enableSound()
    expect(loader).toHaveBeenCalledTimes(1)
    expect(api.bind).toHaveBeenCalledTimes(1)
    expect(api.setEnabled).toHaveBeenLastCalledWith(true)
    playCue('error', { emphasis: 'subtle' })
    expect(api.play).toHaveBeenCalledWith('error', { emphasis: 'subtle' })
  })

  it('disableSound mutes, and a component request does not override it', async () => {
    const { api, loader } = fakeCuelume()
    __resetSound(loader)
    await setSoundEnabled(true)
    setSoundEnabled(false)
    expect(api.setEnabled).toHaveBeenLastCalledWith(false)
    requestSound()
    await tick()
    expect(isSoundEnabled()).toBe(false)
    playCue('tap')
    expect(api.play).not.toHaveBeenCalled()
  })

  it('requestSound turns sound on when the app has not decided', async () => {
    const { api, loader } = fakeCuelume()
    __resetSound(loader)
    requestSound()
    await tick()
    expect(isSoundEnabled()).toBe(true)
    expect(api.bind).toHaveBeenCalledTimes(1)
  })

  it('warns once and no-ops when cuelume is not installed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    __resetSound(() => Promise.reject(new Error('Cannot find package cuelume')))
    expect(await enableSound()).toBe(false)
    expect(await enableSound()).toBe(false)
    playCue('success')
    await tick()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('loads the real cuelume lazily', async () => {
    __resetSound()
    expect(await enableSound()).toBe(true)
    expect(() => playCue('tap')).not.toThrow()
    disableSound()
  })
})
