// The launch clip's montage: one short beat per new component (Drawer, Sheet, Accordion,
// Select, Input + ToggleGroup). Plain DOM in shadcn / goopUI markup with @goopui/core attached
// the way the Vue components attach it (GoopDrawerContent, GoopSheetContent, GoopAccordionItem,
// GoopSelectContent, GoopInput, GoopToggleGroup), reka's behaviour wired by hand. Times are
// scene-local seconds; composition px are 640 x 360 (theme.ts).

import {
  ACCORDION_ALL_EFFECTS,
  ACCORDION_FEEL,
  accordionCurves,
  attachAccordion,
  attachEmerge,
  attachInput,
  attachMenuHighlight,
  attachSheet,
  attachToggleGroup,
  createDrawer,
  type AccordionHandle,
  type DrawerController,
  type EmergeHandle,
  type InputHandle,
  type MenuHighlightHandle,
  type SheetHandle,
  type ToggleHandle,
} from '@goopui/core'
import { cursorPath, ease } from '../goo/path'
import type { Click } from '../goo/replay'
import type { SceneScript } from '../goo/scene'
import { el, entrance, smooth, svg } from '../v7/dom'

export const common = { renderer: 'svg' as const, reducedMotion: false as const }

export interface Rt {
  /** Fade-and-rise on entry (translate only). */
  enter: HTMLElement[]
  tick?: (t: number) => void
  destroy(): void
}

const enter = (rt: Rt, t: number) =>
  rt.enter.forEach((w, i) => {
    const [o, y] = entrance(t, 0.02 + i * 0.06, 0.34)
    w.style.opacity = String(o)
    w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
  })

/** Frame 0 of a beat (zero substeps) must already show the entrance pose. */
export const beat = (s: Omit<SceneScript<Rt>, 'step'>): SceneScript<Rt> => ({
  ...s,
  build(root, ctx) {
    const rt = s.build(root, ctx)
    enter(rt, 0)
    rt.tick?.(0)
    return rt
  },
  step(rt, t) {
    enter(rt, t)
    rt.tick?.(t)
  },
})

export const clicksAt = (downs: number[], hold = 0.085): Click[] => downs.map((d) => ({ down: d, up: d + hold }))

/** A zero-width anchor at (cx, top) centring its child on cx. */
export const centered = (cx: number, top: number, child: HTMLElement): HTMLElement =>
  el('div', { style: `position:absolute;left:${cx}px;top:${top}px;width:0;display:flex;justify-content:center;pointer-events:none;` }, [child])

export const icon = (d: string, sw = 2) =>
  svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`)
export const ICON = {
  chevron: '<path d="m6 9 6 6 6-6"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  left: '<path d="M21 5H3"/><path d="M15 12H3"/><path d="M17 19H3"/>',
  center: '<path d="M21 5H3"/><path d="M17 12H7"/><path d="M19 19H5"/>',
  right: '<path d="M21 5H3"/><path d="M21 12H9"/><path d="M21 19H7"/>',
  drawer: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/>',
  sheet: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
}

export const surfaceSpan = (radius = 'inherit') =>
  el('span', {
    attrs: { 'data-goop': 'surface', 'aria-hidden': 'true' },
    style: `position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:${radius};`,
  })

export const outlineButton = (label: string, iconD?: string): HTMLButtonElement =>
  el('button', { class: 'btn btn-outline', attrs: { tabindex: '-1' } }, [...(iconD ? [icon(iconD)] : []), label])

// ---- 1. Drawer: launch with the edge slosh, click outside, it falls away -------------------

const DRAWER_TRIGGER = { x: 320, y: 186 }
export const DRAWER_CLICKS = clicksAt([0.5, 1.72])

export const drawerBeat: SceneScript<Rt> = beat({
  seed: 5101,
  clicks: DRAWER_CLICKS,
  cursor: cursorPath(
    { x: 610, y: 372 },
    0.04,
    [
      { t0: 0.05, t1: 0.42, via: { x: 520, y: 290 }, to: { x: DRAWER_TRIGGER.x + 14, y: DRAWER_TRIGGER.y + 4 }, ease: ease.outQuart },
      // Up onto the overlay above the panel while it lands, then click outside.
      { t0: 0.95, t1: 1.5, via: { x: 400, y: 120 }, to: { x: 452, y: 66 }, ease: ease.inOutCubic },
      { t0: 1.95, t1: 2.5, to: { x: 520, y: 150 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root) {
    const trigger = outlineButton('Open drawer', ICON.drawer)
    const row = centered(DRAWER_TRIGGER.x, DRAWER_TRIGGER.y - 20, trigger)
    trigger.style.pointerEvents = 'auto'
    root.append(row)

    let drawer: DrawerController | null = null
    let overlay: HTMLElement | null = null
    trigger.addEventListener('click', () => {
      if (drawer) return
      overlay = el('div', { class: 'overlay' })
      const surface = surfaceSpan()
      const num = el('div', { class: 'num', text: '350' })
      const panel = el('div', { class: 'drawer', attrs: { 'data-vaul-drawer-direction': 'bottom' } }, [
        surface,
        el('div', { class: 'grip', attrs: { 'data-goop-drawer-handle': '', 'aria-hidden': 'true' } }),
        el('div', { class: 'hd' }, [el('div', { class: 'ttl', text: 'Move goal' }), el('div', { class: 'dsc', text: 'Set your daily activity goal.' })]),
        el('div', { class: 'goal' }, [
          el('div', { class: 'round' }, [icon(ICON.minus)]),
          el('div', {}, [num, el('div', { class: 'unit', text: 'Calories / day' })]),
          el('div', { class: 'round' }, [icon(ICON.plus)]),
        ]),
        el('div', { class: 'ft' }, [el('button', { class: 'btn btn-primary', attrs: { tabindex: '-1' }, text: 'Submit' })]),
      ])
      root.append(overlay, panel)
      // handle: false: the grip stays a plain pill (no swelling knob on it).
      drawer = createDrawer(panel, { ...common, direction: 'bottom', overlay, surface, handle: false }, {})
      drawer.open()
      overlay.addEventListener('click', () => drawer?.close())
    })
    return {
      enter: [row],
      destroy: () => drawer?.destroy(),
    }
  },
})

// ---- 2. Sheet: blooms from the middle of the right edge, splashes, shrinks back -------------

const SHEET_TRIGGER = { x: 250, y: 186 }
const SHEET_X = { x: 640 - 15 - 11, y: 15 + 11 }
export const SHEET_CLICKS = clicksAt([0.48, 1.86])

export const sheetBeat: SceneScript<Rt> = beat({
  seed: 5202,
  clicks: SHEET_CLICKS,
  cursor: cursorPath(
    { x: 120, y: 380 },
    0.04,
    [
      { t0: 0.05, t1: 0.4, via: { x: 160, y: 280 }, to: { x: SHEET_TRIGGER.x + 12, y: SHEET_TRIGGER.y + 4 }, ease: ease.outQuart },
      { t0: 1.2, t1: 1.74, via: { x: 470, y: 60 }, to: { x: SHEET_X.x + 1, y: SHEET_X.y + 1 }, ease: ease.inOutCubic },
      { t0: 2.0, t1: 2.55, to: { x: 470, y: 200 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root, ctx) {
    const trigger = outlineButton('Open sheet', ICON.sheet)
    const row = centered(SHEET_TRIGGER.x, SHEET_TRIGGER.y - 20, trigger)
    trigger.style.pointerEvents = 'auto'
    root.append(row)

    let sheet: SheetHandle | null = null
    let overlay: HTMLElement | null = null
    let host: HTMLElement | null = null
    let openedAt = -1
    let closedAt = -1
    trigger.addEventListener('click', () => {
      if (sheet) return
      overlay = el('div', { class: 'overlay' })
      const surface = surfaceSpan('0')
      const close = el('div', { class: 'x' }, [icon(ICON.x)])
      const field = (label: string, value: string) => el('div', {}, [el('div', { class: 'lbl', text: label }), el('div', { class: 'box', text: value })])
      host = el('div', { class: 'sheet', attrs: { 'data-side': 'right', 'data-state': 'open', 'data-slot': 'sheet-content' } }, [
        surface,
        el('div', { class: 'hd' }, [el('div', { class: 'ttl', text: 'Edit profile' }), el('div', { class: 'dsc', text: "Make changes here. Save when you're done." })]),
        el('div', { class: 'fields' }, [field('Name', 'Pedro Duarte'), field('Username', '@peduarte')]),
        el('div', { class: 'ft' }, [
          el('button', { class: 'btn btn-primary', attrs: { tabindex: '-1' }, text: 'Save changes' }),
          el('button', { class: 'btn btn-outline', attrs: { tabindex: '-1' }, text: 'Close' }),
        ]),
        close,
      ])
      root.append(overlay, host)
      sheet = attachSheet(host, { ...common, surface, side: 'right' })
      sheet.open()
      openedAt = ctx.now()
      close.addEventListener('click', () => {
        if (!sheet || closedAt >= 0) return
        host?.setAttribute('data-state', 'closed')
        sheet.close()
        closedAt = ctx.now()
      })
    })
    return {
      enter: [row],
      tick(t) {
        if (overlay && openedAt >= 0) {
          let o = smooth((t - openedAt) / 0.3)
          if (closedAt >= 0) o *= 1 - smooth((t - closedAt) / Math.max(0.15, (sheet?.closeDuration ?? 300) / 1000))
          overlay.style.opacity = o.toFixed(3)
        }
        if (host && sheet) host.style.visibility = sheet.state === 'closed' && closedAt >= 0 ? 'hidden' : 'visible'
      },
      destroy: () => sheet?.destroy(),
    }
  },
})

// ---- 3. Accordion: the trigger row floods from the click point, the content opens on jelly ---

const ACC = { x: 150, w: 340, top: 88 }
const ACC_ITEMS = [
  { q: 'Is it accessible?', a: 'Yes. It follows the WAI-ARIA pattern, on reka-ui like shadcn.' },
  { q: 'Is it styled?', a: 'Yes. shadcn classes, with goo where it helps.' },
  { q: 'Is it gooey?', a: 'Very. And every effect can be switched off.' },
]
const ACC_ROW = 52
export const ACC_CLICKS = clicksAt([0.52, 1.5])

export const accordionBeat: SceneScript<Rt> = beat({
  seed: 5303,
  clicks: ACC_CLICKS,
  cursor: cursorPath(
    { x: 600, y: 372 },
    0.04,
    [
      { t0: 0.05, t1: 0.44, via: { x: 480, y: 250 }, to: { x: 236, y: ACC.top + ACC_ROW / 2 + 2 }, ease: ease.outQuart },
      // Third item: below the open first one (its content is ~ 58px).
      { t0: 0.95, t1: 1.42, via: { x: 330, y: 200 }, to: { x: 268, y: ACC.top + 2 * ACC_ROW + 66 + ACC_ROW / 2 }, ease: ease.inOutCubic },
      { t0: 1.9, t1: 2.5, to: { x: 520, y: 250 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root, ctx) {
    const list = el('div', { class: 'acc', style: `left:${ACC.x}px;top:${ACC.top}px;width:${ACC.w}px;` })
    root.append(list)
    const curves = ACCORDION_FEEL.playful
    type Item = { host: HTMLElement; trigger: HTMLElement; content: HTMLElement; h: number; handle: AccordionHandle; open: boolean; at: number }
    const items: Item[] = ACC_ITEMS.map((it) => {
      const trigger = el('button', { class: 'acc-trigger', attrs: { tabindex: '-1', 'data-state': 'closed', 'data-goop-accordion-trigger': '' } }, [
        it.q,
        icon(ICON.chevron),
      ])
      const content = el('div', { class: 'acc-content', attrs: { 'data-state': 'closed', 'data-goop-accordion-content': '' } }, [el('div', { text: it.a })])
      const host = el('div', { class: 'acc-item', attrs: { 'data-goop-accordion': '' } }, [trigger, content])
      list.append(host)
      return { host, trigger, content, h: 0, handle: null as unknown as AccordionHandle, open: false, at: -10 }
    })
    for (const it of items) {
      it.h = (it.content.firstElementChild as HTMLElement).offsetHeight
      it.content.style.setProperty('--reka-accordion-content-height', `${it.h}px`)
      it.handle = attachAccordion(it.host, common)
    }
    const set = (it: Item, open: boolean) => {
      if (it.open === open) return
      it.open = open
      it.at = ctx.now()
      const s = open ? 'open' : 'closed'
      it.trigger.setAttribute('data-state', s)
      it.content.setAttribute('data-state', s)
    }
    for (const it of items) {
      it.trigger.addEventListener('click', () => {
        const next = !it.open
        for (const o of items) if (o !== it) set(o, false)
        set(it, next)
      })
    }
    return {
      enter: [list],
      tick(t) {
        for (const it of items) {
          const c = accordionCurves(curves, ACCORDION_ALL_EFFECTS, it.h)
          const u = t - it.at
          let k: number
          if (it.open) k = u >= c.open ? 1 : c.openCurve(Math.max(0, u) / c.open)
          else k = u >= c.close ? 0 : 1 - c.closeCurve(Math.max(0, u) / c.close)
          if (it.at < 0) k = it.open ? 1 : 0
          it.content.style.height = `${(it.h * k).toFixed(2)}px`
          const svgEl = it.trigger.querySelector('svg')
          if (svgEl) {
            const r = it.open ? smooth(u / 0.2) : 1 - smooth(u / 0.2)
            svgEl.style.transform = `rotate(${(180 * (it.at < 0 ? 0 : r)).toFixed(1)}deg)`
          }
        }
      },
      destroy: () => items.forEach((i) => i.handle.destroy()),
    }
  },
})

// ---- 4. Select: blooms open, the highlight bulge follows the cursor, pick one ---------------

const SEL = { x: 214, y: 84, w: 212, h: 42 }
const SEL_PANEL_TOP = SEL.y + SEL.h + 5
const SEL_ITEM_Y = (i: number) => SEL_PANEL_TOP + 5 + 26 + 17 + 34 * i
const FRUITS = ['Apple', 'Banana', 'Blueberry', 'Grapes', 'Pineapple']
export const SEL_CLICKS = clicksAt([0.48, 1.92])

export const selectBeat: SceneScript<Rt> = beat({
  seed: 5404,
  clicks: SEL_CLICKS,
  cursor: cursorPath(
    { x: 600, y: 372 },
    0.04,
    [
      { t0: 0.05, t1: 0.4, via: { x: 520, y: 220 }, to: { x: SEL.x + 150, y: SEL.y + 23 }, ease: ease.outQuart },
      // Down the list (the highlight follows, its bulge under the cursor), past Blueberry, back.
      { t0: 0.92, t1: 1.12, to: { x: 296, y: SEL_ITEM_Y(0) + 2 }, ease: ease.inOutSine },
      { t0: 1.14, t1: 1.3, to: { x: 312, y: SEL_ITEM_Y(1) + 1 }, ease: ease.inOutSine },
      { t0: 1.32, t1: 1.46, to: { x: 326, y: SEL_ITEM_Y(2) + 2 }, ease: ease.inOutSine },
      { t0: 1.48, t1: 1.62, to: { x: 340, y: SEL_ITEM_Y(3) + 3 }, ease: ease.inOutSine },
      { t0: 1.66, t1: 1.84, to: { x: 318, y: SEL_ITEM_Y(2) + 1 }, ease: ease.inOutSine },
      { t0: 2.15, t1: 2.6, to: { x: 520, y: 200 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root) {
    const value = el('span', { text: 'Select a fruit' })
    const trigger = el('div', { class: 'sel-trigger', style: `left:${SEL.x}px;top:${SEL.y}px;width:${SEL.w}px;` }, [value, icon(ICON.chevron)])
    const surface = surfaceSpan()
    const host = el('div', {
      class: 'sel-panel',
      attrs: { 'data-side': 'bottom', 'data-state': 'closed', 'data-slot': 'select-content' },
      style: `left:${SEL.x}px;top:${SEL_PANEL_TOP}px;width:${SEL.w}px;isolation:isolate;visibility:hidden;`,
    })
    const list = el('div', { class: 'menu-list' })
    const items = FRUITS.map((f) => el('div', { class: 'menu-item', attrs: { role: 'option', 'data-variant': 'default' }, text: f }))
    list.append(el('div', { class: 'menu-label', text: 'Fruits' }), ...items)
    host.append(surface, el('div', { style: 'min-height:0;flex:1;border-radius:inherit;overflow:hidden;' }, [list]))
    root.append(trigger, host)

    // GoopSelectContent's defaults (resolveSelectProps / toSelectOptions): bloom from the
    // panel's middle, every toggle on, popover-coloured surface, the highlight under the cursor.
    const emerge: EmergeHandle = attachEmerge(host, {
      ...common,
      flow: true,
      flowStyle: 'bloom',
      bloomStart: 'single',
      bridge: true,
      wobble: true,
      momentum: true,
      fade: true,
      openSlosh: true,
      openDrips: true,
      closeSlosh: true,
      surfaceColor: 'popover',
      surface,
      anchor: trigger,
      side: 'bottom',
    })
    const highlight: MenuHighlightHandle = attachMenuHighlight(list, { ...common, wobble: true, momentum: true, pop: true, followPointer: true })
    let open = false
    const setOpen = (on: boolean) => {
      open = on
      host.setAttribute('data-state', on ? 'open' : 'closed')
      if (on) emerge.open()
      else emerge.close()
    }
    trigger.addEventListener('click', () => setOpen(!open))
    const highlightItem = (target: HTMLElement | null) => {
      for (const it of items) {
        if (it === target) {
          if (!it.hasAttribute('data-highlighted')) it.setAttribute('data-highlighted', '')
        } else it.removeAttribute('data-highlighted')
      }
    }
    for (const it of items) {
      it.addEventListener('pointermove', () => open && highlightItem(it))
      it.addEventListener('click', () => {
        if (!open) return
        const ms = highlight.pop()
        value.textContent = it.textContent
        trigger.setAttribute('data-value', '')
        setTimeout(() => setOpen(false), ms)
      })
    }
    host.addEventListener('pointerleave', () => open && highlightItem(null))
    return {
      enter: [trigger],
      tick() {
        host.style.visibility = emerge.state === 'closed' ? 'hidden' : 'visible'
      },
      destroy() {
        highlight.destroy()
        emerge.destroy()
      },
    }
  },
})

// ---- 5. Input focus ring + ToggleGroup flow ----------------------------------------------------

const IN = { x: 180, y: 104, w: 280 }
const TG = { x: 180, y: 196, item: 92 }
const TG_ITEM_X = (i: number) => TG.x + TG.item * i + TG.item / 2
const TYPED = 'you@goop.dev'
const TYPE_AT = 0.86
const TYPE_DT = 0.058
export const FORM_CLICKS = clicksAt([0.46, 1.9, 2.72])

export const formBeat: SceneScript<Rt> = beat({
  seed: 5505,
  clicks: FORM_CLICKS,
  cursor: cursorPath(
    { x: 600, y: 372 },
    0.04,
    [
      { t0: 0.05, t1: 0.38, via: { x: 480, y: 260 }, to: { x: 236, y: IN.y + 24 }, ease: ease.outQuart },
      // Hand off the mouse while typing, then the toggles.
      { t0: 0.7, t1: 1.2, to: { x: 300, y: 170 }, ease: ease.inOutSine },
      { t0: 1.5, t1: 1.84, to: { x: TG_ITEM_X(1) + 4, y: TG.y + 23 }, ease: ease.inOutCubic },
      { t0: 2.3, t1: 2.66, to: { x: TG_ITEM_X(2) + 2, y: TG.y + 22 }, ease: ease.inOutCubic },
      { t0: 2.95, t1: 3.4, to: { x: 540, y: 300 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root) {
    const lbl = el('div', { class: 'field-lbl', text: 'Email', style: `left:${IN.x}px;top:${IN.y - 22}px;` })
    const field = el('input', { class: 'input', attrs: { type: 'text', placeholder: 'name@example.com', tabindex: '-1' } })
    const inHost = el('div', { class: 'input-host', attrs: { 'data-goop-host': 'input', 'data-goop-active': '' }, style: `left:${IN.x}px;top:${IN.y}px;width:${IN.w}px;` }, [field])
    const tgLbl = el('div', { class: 'field-lbl', text: 'Align', style: `left:${TG.x}px;top:${TG.y - 22}px;` })
    const values = ['left', 'center', 'right'] as const
    const labels = ['Left', 'Center', 'Right']
    let value: string = 'left'
    const tgItems = values.map((v, i) =>
      el('button', { class: 'tg-item', attrs: { tabindex: '-1', 'aria-pressed': String(v === value), 'data-state': v === value ? 'on' : 'off' }, style: `width:${TG.item}px;` }, [
        icon(ICON[v]),
        el('span', { text: labels[i] }),
      ]),
    )
    const tg = el('div', { class: 'tg', attrs: { role: 'group', 'data-goop-host': 'toggle-group', 'data-goop-active': '' }, style: `left:${TG.x}px;top:${TG.y}px;` }, tgItems)
    const form = el('div', { style: 'position:absolute;inset:0;pointer-events:none;' }, [lbl, inHost])
    const form2 = el('div', { style: 'position:absolute;inset:0;pointer-events:none;' }, [tgLbl, tg])
    root.append(form, form2)

    const input: InputHandle = attachInput(inHost, field, common)
    const group: ToggleHandle = attachToggleGroup(tg, { ...common, value })
    let focused = false
    field.addEventListener('pointerdown', () => {
      if (focused) return
      focused = true
      field.dispatchEvent(new FocusEvent('focus'))
    })
    tgItems.forEach((b, i) =>
      b.addEventListener('click', () => {
        if (focused) {
          focused = false
          field.dispatchEvent(new FocusEvent('blur'))
        }
        const v = values[i]!
        if (v === value) return
        value = v
        tgItems.forEach((x, j) => {
          const on = values[j] === value
          x.setAttribute('aria-pressed', String(on))
          x.setAttribute('data-state', on ? 'on' : 'off')
        })
        group.update({ ...common, value })
      }),
    )
    let typed = 0
    return {
      enter: [form, form2],
      tick(t) {
        const n = Math.max(0, Math.min(TYPED.length, Math.floor((t - TYPE_AT) / TYPE_DT) + 1))
        if (n !== typed && t >= TYPE_AT) {
          typed = n
          field.value = TYPED.slice(0, n)
          field.setSelectionRange(n, n)
          field.dispatchEvent(new InputEvent('input', { bubbles: true, data: TYPED[n - 1], inputType: 'insertText' }))
        }
      },
      destroy() {
        input.destroy()
        group.destroy()
      },
    }
  },
})
