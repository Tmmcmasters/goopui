// Builders for the four sneak-peek components (the coming-soon page's GoopButton, GoopSwitch,
// GoopSlider, GoopTooltip), shared by the solo beats and the all-four grid. Same idea as the
// v7 scenes: plain DOM in shadcn/goopUI markup, with @goopui/core attached exactly the way
// the Vue components attach it, and reka's behaviour wired by hand.

import {
  attachEmerge,
  attachGoop,
  attachSlider,
  attachSwitch,
  TOOLTIP_BLOOM_SPLASH,
  TOOLTIP_FEEL,
  TOOLTIP_MOMENTUM,
  type EmergeHandle,
  type GoopHandle,
  type GoopOptions,
  type SliderHandle,
  type SwitchHandle,
} from '@goopui/core'
import { seededRandom } from '../goo/fake-env'
import { DYNAPUFF, GEIST } from '../fonts'
import { el } from '../v7/dom'

/** The coming-soon page's light tokens (apps/soon main.css): primary is ink, like the live page;
 *  slime is only the brand mark and the "Coming soon" pill (bg-goo). */
export const SOON = {
  bg: '#faf9f5',
  ink: '#1d1a17',
  card: '#fefefc',
  border: '#e6e2d9',
  muted: '#efede7',
  mutedFg: '#6b655c',
  gooInk: '#2b7a3f',
  slime: '#1fa64a',
  slimeFg: '#0b1a0f',
  input: '#dcd8ce',
  /** --primary / --primary-foreground (ink / background). */
  primary: '#1d1a17',
  primaryFg: '#faf9f5',
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A `.peek` card from the page: label top-left (DynaPuff, goo ink), hint at the bottom. */
export function peekCard(parent: HTMLElement, box: Box, label: string, hint: string, big = false): { wrap: HTMLElement; hint: HTMLElement } {
  const hintEl = el('div', {
    class: 'peek-hint',
    text: hint,
    style: `position:absolute;left:0;right:0;bottom:${big ? 18 : 12}px;text-align:center;font:400 ${big ? 15 : 12}px/1.2 ${GEIST};`,
  })
  const wrap = el(
    'div',
    {
      class: 'peek',
      style: `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;border-radius:${big ? 24 : 18}px;pointer-events:none;`,
    },
    [
      el('div', {
        text: label,
        style: `position:absolute;left:${big ? 22 : 15}px;top:${big ? 18 : 13}px;font:600 ${big ? 19 : 14}px/1 ${DYNAPUFF};color:${SOON.gooInk};`,
      }),
      hintEl,
    ],
  )
  parent.append(wrap)
  return { wrap, hint: hintEl }
}

const common = { renderer: 'svg' as const, reducedMotion: false as const }

/** A zero-width anchor at (cx, top) that centers its child horizontally on cx. */
const centered = (cx: number, top: number, child: HTMLElement): HTMLElement =>
  el('div', { style: `position:absolute;left:${cx}px;top:${top}px;width:0;display:flex;justify-content:center;pointer-events:none;` }, [child])

// ---- button -----------------------------------------------------------------------------------

export interface ButtonSpec {
  cx: number
  cy: number
  h: number
  padX: number
  radius: number
  fontSize: number
  label: string
  seed: number
  /** Extra engine options (the hero button uses v7's punchier drips). */
  options?: GoopOptions
}

/** GoopButton, default variant: --primary (ink) goo body, --primary-foreground label, Geist 500. */
export function mountButton(parent: HTMLElement, s: ButtonSpec): { btn: HTMLButtonElement; handle: GoopHandle } {
  const btn = el(
    'button',
    {
      attrs: { tabindex: '-1', 'data-goop-host': 'fill', 'data-goop-active': '' },
      style:
        `height:${s.h}px;padding:0 ${s.padX}px;border-radius:${s.radius}px;border:0;margin:0;background:transparent;pointer-events:auto;` +
        `color:${SOON.primaryFg};font:500 ${s.fontSize}px/1 ${GEIST};display:inline-flex;align-items:center;justify-content:center;cursor:none;outline:none;white-space:nowrap;flex-shrink:0;`,
    },
    [el('span', { attrs: { 'data-goop-label': '' }, style: 'display:inline-flex;align-items:center', text: s.label })],
  )
  btn.style.setProperty('--goop-color', SOON.primary)
  parent.append(centered(s.cx, s.cy - s.h / 2, btn))
  const handle = attachGoop(btn, {
    restingDrips: 0,
    ...s.options,
    random: seededRandom(s.seed ^ 0x9e3779b9),
    ...common,
  })
  return { btn, handle }
}

// ---- outline button (tooltip trigger) ---------------------------------------------------------

/** GoopButton variant="outline": stroke goo (border color) with the inner fill following the
 *  body pose through core's cssVars (goop.css `[data-goop-host='stroke']::after`). */
export function mountOutlineButton(
  parent: HTMLElement,
  s: Omit<ButtonSpec, 'options'>,
): { btn: HTMLButtonElement; handle: GoopHandle } {
  const btn = el(
    'button',
    {
      class: 'btn-outline',
      attrs: { tabindex: '-1', 'data-goop-host': 'stroke', 'data-goop-active': '' },
      style:
        `position:relative;height:${s.h}px;padding:0 ${s.padX}px;border-radius:${s.radius}px;` +
        `border:1px solid transparent;margin:0;background:transparent;pointer-events:auto;isolation:isolate;` +
        `color:${SOON.ink};font:500 ${s.fontSize}px/1 ${GEIST};display:inline-flex;align-items:center;justify-content:center;cursor:none;outline:none;white-space:nowrap;flex-shrink:0;`,
    },
    [el('span', { attrs: { 'data-goop-label': '' }, style: 'display:inline-flex;align-items:center', text: s.label })],
  )
  // goopButtonGooVariants.outline: --goop-color: var(--border), --goop-fill: var(--background).
  btn.style.setProperty('--goop-color', SOON.border)
  btn.style.setProperty('--goop-fill', SOON.bg)
  parent.append(centered(s.cx, s.cy - s.h / 2, btn))
  const handle = attachGoop(btn, { restingDrips: 0, cssVars: true, random: seededRandom(s.seed ^ 0x51f15e), ...common })
  return { btn, handle }
}

// ---- switch -----------------------------------------------------------------------------------

export interface SwitchSpec {
  /** Track left / vertical center. */
  x: number
  cy: number
  w: number
  h: number
  checked: boolean
  fontSize: number
  /** Called after each flip with the new state. */
  onChange?: (on: boolean) => void
}

export function mountSwitch(parent: HTMLElement, s: SwitchSpec): { track: HTMLElement; handle: SwitchHandle } {
  let checked = s.checked
  const track = el('div', {
    class: 'switch',
    attrs: { role: 'switch', 'aria-checked': String(checked), 'data-state': checked ? 'checked' : 'unchecked', 'data-goop-host': 'switch' },
    style: `position:absolute;left:${s.x}px;top:${s.cy - s.h / 2}px;width:${s.w}px;height:${s.h}px;pointer-events:auto;`,
  })
  const label = el('div', {
    text: `Goo ${checked ? 'on' : 'off'}`,
    style: `position:absolute;left:${s.x + s.w + Math.round(s.h * 0.4)}px;top:${s.cy - s.fontSize * 0.55}px;font:500 ${s.fontSize}px/1.1 ${GEIST};color:${SOON.ink};pointer-events:none;`,
  })
  parent.append(track, label)
  const handle = attachSwitch(track, { checked, ...common })
  track.addEventListener('click', () => {
    checked = !checked
    track.setAttribute('aria-checked', String(checked))
    track.setAttribute('data-state', checked ? 'checked' : 'unchecked')
    label.textContent = `Goo ${checked ? 'on' : 'off'}`
    handle.update({ checked })
    s.onChange?.(checked)
  })
  return { track, handle }
}

// ---- slider -----------------------------------------------------------------------------------

export interface SliderSpec {
  x0: number
  x1: number
  cy: number
  value: number
  onChange?: (v: number) => void
}

export const sliderX = (s: Pick<SliderSpec, 'x0' | 'x1'>, v: number): number => s.x0 + (v / 100) * (s.x1 - s.x0)

export function mountSlider(parent: HTMLElement, s: SliderSpec): { slider: HTMLElement; handle: SliderHandle } {
  let value = s.value
  const range = el('div', { class: 'slider-range', attrs: { 'data-slot': 'slider-range' }, style: `width:${value}%;` })
  const track = el('div', { class: 'slider-track', attrs: { 'data-slot': 'slider-track' } }, [range])
  const thumb = el('div', { class: 'slider-thumb', attrs: { 'data-slot': 'slider-thumb', role: 'slider' }, style: `left:${value}%;` })
  const slider = el(
    'div',
    {
      class: 'slider',
      attrs: { 'data-slot': 'slider', 'data-goop-host': 'slider' },
      style: `position:absolute;left:${s.x0}px;width:${s.x1 - s.x0}px;top:${s.cy - 14}px;pointer-events:auto;`,
    },
    [track, thumb],
  )
  parent.append(slider)
  const handle = attachSlider(slider, common)
  let dragging = false
  const setFromX = (clientX: number) => {
    const r = slider.getBoundingClientRect()
    const v = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
    if (v === value) return
    value = v
    thumb.style.left = `${v}%`
    range.style.width = `${v}%`
    s.onChange?.(v)
  }
  slider.addEventListener('pointerdown', (e) => {
    dragging = true
    setFromX(e.clientX)
  })
  slider.addEventListener('pointermove', (e) => dragging && setFromX(e.clientX))
  slider.addEventListener('pointerup', () => (dragging = false))
  return { slider, handle }
}

// ---- tooltip ----------------------------------------------------------------------------------

export interface TooltipSpec {
  /** Trigger (outline button) center. */
  cx: number
  cy: number
  h: number
  padX: number
  fontSize: number
  text: string
  /** Tooltip text size. */
  tipSize: number
  seed: number
}

/** GoopTooltip with an outline GoopButton trigger: opens 150ms after the pointer enters (the
 *  page's delay-duration), closes on leave. Emerge options are GoopTooltipContent's defaults
 *  (vue goop-props toTooltipOptions({})): flowStyle 'bloom', so the tooltip pools from its own
 *  centre, overshoots and wobbles, sheds a few small drops (TOOLTIP_BLOOM_SPLASH). */
export function mountTooltip(
  parent: HTMLElement,
  s: TooltipSpec,
): { trigger: HTMLButtonElement; button: GoopHandle; host: HTMLElement; emerge: EmergeHandle } {
  const { btn: trigger, handle: button } = mountOutlineButton(parent, {
    cx: s.cx,
    cy: s.cy,
    h: s.h,
    padX: s.padX,
    radius: Math.round(s.h * 0.22),
    fontSize: s.fontSize,
    label: 'Hover me',
    seed: s.seed,
  })
  const surface = el('span', {
    attrs: { 'data-goop': 'surface', 'aria-hidden': 'true' },
    style: 'position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;',
  })
  const padY = Math.round(s.tipSize * 0.5)
  const tipH = Math.round(s.tipSize * 1.2 + padY * 2)
  const arrow = el('span', {
    style: `position:absolute;left:50%;bottom:0;width:${Math.round(s.tipSize * 0.8)}px;height:${Math.round(s.tipSize * 0.8)}px;border-radius:2px;background:var(--goop-surface, ${SOON.ink});transform:translate(-50%, 45%) rotate(45deg);z-index:-1;`,
  })
  const host = el(
    'div',
    {
      class: 'tip-panel',
      attrs: { 'data-side': 'top', 'data-state': 'closed', role: 'tooltip' },
      style:
        `position:absolute;left:${s.cx}px;top:${s.cy - s.h / 2 - 6 - tipH}px;transform:translateX(-50%);height:${tipH}px;padding:0 ${Math.round(s.tipSize)}px;` +
        `display:inline-flex;align-items:center;border-radius:${Math.round(s.tipSize * 0.45)}px;white-space:nowrap;isolation:isolate;visibility:hidden;pointer-events:none;` +
        `font:500 ${s.tipSize}px/1.2 ${GEIST};color:${SOON.bg};z-index:5;`,
    },
    [surface, el('span', { attrs: { 'data-goop': 'label' }, style: 'display:inline-flex;align-items:center', text: s.text }), arrow],
  )
  host.style.setProperty('--goop-color', SOON.ink)
  parent.append(host)
  const M = TOOLTIP_MOMENTUM
  const S = TOOLTIP_BLOOM_SPLASH
  const emerge = attachEmerge(host, {
    feel: TOOLTIP_FEEL,
    flow: true,
    flowStyle: 'bloom',
    bloomStart: 'single',
    bridge: true,
    wobble: true,
    momentum: true,
    fade: true,
    openSlosh: M.openSlosh,
    openDrips: S.openDrips,
    closeSlosh: M.closeSlosh,
    openDripAmount: S.openDripAmount,
    openDripSize: S.openDripSize,
    openDripFling: S.openDripFling,
    surfaceColor: 'popover',
    speed: 1,
    surface,
    anchor: trigger,
    side: 'top',
    ...common,
  })
  let timer: ReturnType<typeof setTimeout> | null = null
  let open = false
  const set = (on: boolean) => {
    if (on === open) return
    open = on
    host.setAttribute('data-state', on ? 'delayed-open' : 'closed')
    if (on) emerge.open()
    else emerge.close()
  }
  trigger.addEventListener('pointerenter', () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => set(true), 150)
  })
  trigger.addEventListener('pointerleave', () => {
    if (timer) clearTimeout(timer)
    timer = null
    set(false)
  })
  return { trigger, button, host, emerge }
}

/** Keep the tooltip panel hidden while core reports it closed (reka unmounts it). */
export const syncTip = (host: HTMLElement, emerge: EmergeHandle): void => {
  host.style.visibility = emerge.state === 'closed' ? 'hidden' : 'visible'
}

export const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`
