import { afterEach, describe, expect, it } from 'vitest'
import {
  EMERGE_SURFACE_FOREGROUND_VAR,
  EMERGE_SURFACE_VAR,
  EMERGE_TINT_ATTR,
  attachEmerge,
  parseCssColor,
  resolveSurfaceColors,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
})

function setup(triggerStyle: string, attrs: Record<string, string> = {}) {
  document.body.style.backgroundColor = 'rgb(255, 255, 255)'
  const trigger = document.createElement('button')
  trigger.setAttribute('style', triggerStyle)
  for (const [k, v] of Object.entries(attrs)) trigger.setAttribute(k, v)
  const host = document.createElement('div')
  host.style.setProperty('--primary', 'rgb(20, 20, 20)')
  host.style.setProperty('--primary-foreground', 'rgb(250, 250, 250)')
  document.body.append(trigger, host)
  return { trigger, host }
}

describe('parseCssColor', () => {
  it('parses computed color forms', () => {
    expect(parseCssColor('rgb(1, 2, 3)')).toEqual([1, 2, 3, 1])
    expect(parseCssColor('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3, 0.5])
    expect(parseCssColor('rgb(1 2 3 / 50%)')).toEqual([1, 2, 3, 0.5])
    expect(parseCssColor('#fff')).toEqual([255, 255, 255, 1])
    expect(parseCssColor('transparent')![3]).toBe(0)
    const black = parseCssColor('oklch(0.205 0 0)')!
    expect(black[0]).toBeGreaterThan(15)
    expect(black[0]).toBeLessThan(30)
    expect(parseCssColor('oklch(1 0 0)')!.map(Math.round)).toEqual([255, 255, 255, 1])
    expect(parseCssColor('var(--x)')).toBeNull()
  })
})

describe('resolveSurfaceColors', () => {
  it('opaque trigger background: its background and text color', () => {
    const { trigger, host } = setup('background-color: rgb(30, 30, 30); color: rgb(255, 255, 255)')
    expect(resolveSurfaceColors('trigger', trigger, host)).toEqual({ background: 'rgb(30 30 30)', foreground: 'rgb(255 255 255)' })
  })

  it('goop fill host: --goop-color at --goop-opacity over the page', () => {
    const { trigger, host } = setup('--goop-color: rgb(200, 0, 0); --goop-opacity: 0.5; color: rgb(200, 0, 0)', { 'data-goop-host': 'fill' })
    expect(resolveSurfaceColors(undefined, trigger, host)!.background).toBe('rgb(228 128 128)')
  })

  it('transparent / page-colored triggers fall back to the theme primary', () => {
    const want = { background: 'rgb(20 20 20)', foreground: 'rgb(250 250 250)' }
    const ghost = setup('background-color: transparent; color: rgb(10, 10, 10)')
    expect(resolveSurfaceColors('trigger', ghost.trigger, ghost.host)).toEqual(want)
    const outline = setup('background-color: rgb(255, 255, 255); color: rgb(10, 10, 10)')
    expect(resolveSurfaceColors('trigger', outline.trigger, outline.host)).toEqual(want)
    const hover = setup('--goop-color: rgb(240, 240, 240); color: rgb(10, 10, 10)', { 'data-goop-host': 'hover' })
    expect(resolveSurfaceColors('trigger', hover.trigger, hover.host)).toEqual(want)
    const stroke = setup('--goop-fill: rgb(240, 240, 240); color: rgb(10, 10, 10)', { 'data-goop-host': 'stroke' })
    expect(resolveSurfaceColors('trigger', stroke.trigger, stroke.host)).toEqual(want)
  })

  it('without a theme primary: the trigger text color on the page color', () => {
    const { trigger, host } = setup('background-color: transparent; color: rgb(10, 10, 10)')
    host.removeAttribute('style')
    expect(resolveSurfaceColors('trigger', trigger, host)).toEqual({ background: 'rgb(10 10 10)', foreground: 'rgb(255 255 255)' })
  })

  it("explicit color, 'popover', pairs and getters", () => {
    const { trigger, host } = setup('background-color: rgb(30, 30, 30)')
    expect(resolveSurfaceColors('#00f', trigger, host)).toEqual({ background: '#00f', foreground: 'rgb(255 255 255)' })
    expect(resolveSurfaceColors('rgb(250, 240, 120)', trigger, host)!.foreground).toBe('rgb(10 10 10)')
    expect(resolveSurfaceColors('popover', trigger, host)).toBeNull()
    const pair = { background: 'red', foreground: 'white' }
    expect(resolveSurfaceColors(pair, trigger, host)).toBe(pair)
    expect(resolveSurfaceColors(() => pair, trigger, host)).toBe(pair)
    expect(resolveSurfaceColors(() => null, trigger, host)).toBeNull()
  })
})

describe('attachEmerge surfaceColor', () => {
  it('publishes the trigger colors on open and clears them on destroy', () => {
    const { trigger, host } = setup('background-color: rgb(30, 30, 30); color: rgb(255, 255, 255)')
    const h = attachEmerge(host, { anchor: trigger, reducedMotion: true })
    expect(host.hasAttribute(EMERGE_TINT_ATTR)).toBe(false)
    h.open()
    expect(host.style.getPropertyValue(EMERGE_SURFACE_VAR)).toBe('rgb(30 30 30)')
    expect(host.style.getPropertyValue(EMERGE_SURFACE_FOREGROUND_VAR)).toBe('rgb(255 255 255)')
    expect(host.hasAttribute(EMERGE_TINT_ATTR)).toBe(true)
    expect(h.colors).toEqual({ background: 'rgb(30 30 30)', foreground: 'rgb(255 255 255)' })
    h.update({ surfaceColor: 'popover' })
    expect(host.hasAttribute(EMERGE_TINT_ATTR)).toBe(false)
    h.update({ surfaceColor: 'trigger' })
    expect(host.hasAttribute(EMERGE_TINT_ATTR)).toBe(true)
    h.destroy()
    expect(host.style.getPropertyValue(EMERGE_SURFACE_VAR)).toBe('')
    expect(host.hasAttribute(EMERGE_TINT_ATTR)).toBe(false)
  })

  it('accepts an anchor getter returning the element', () => {
    const { trigger, host } = setup('background-color: rgb(0, 100, 0); color: rgb(255, 255, 255)')
    const h = attachEmerge(host, { anchor: () => trigger, reducedMotion: true })
    h.open()
    expect(h.colors?.background).toBe('rgb(0 100 0)')
    h.destroy()
  })
})
