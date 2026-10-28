// Scene 4 (paper): GoopPopover oozes out of its trigger (trigger-colored surface, far edge
// bursts into drops), closes back into it; then GoopDropdownMenu: the panel emerges, the goo
// highlight slides down the items after the cursor, and a select pops it before closing.

import { attachEmerge, attachMenuHighlight, type EmergeHandle, type MenuHighlightHandle } from '@goopui/core'
import { cursorPath, ease } from '../../goo/path'
import type { Click } from '../../goo/replay'
import type { SceneScript } from '../../goo/scene'
import { el, entrance, svg } from '../dom'

interface Rt {
  wraps: HTMLElement[]
  panels: { host: HTMLElement; handle: EmergeHandle }[]
  highlight: MenuHighlightHandle
  destroy(): void
}

const TRIG_Y = 132
const POP = { trigger: { x: 132 }, panel: { left: 36, top: TRIG_Y + 26 } }
const MENU = { trigger: { x: 352 }, panel: { left: 226, top: TRIG_Y + 26, width: 182 } }
// Item rows inside the menu panel (y centers, composition px), for the cursor.
const ITEM_Y = (i: number): number => MENU.panel.top + 5 + 26 + 9 + 16 + i * 32

export const clicks: Click[] = [
  { down: 0.6, up: 0.68 }, // open popover
  { down: 1.6, up: 1.68 }, // close popover
  { down: 2.06, up: 2.14 }, // open menu
  { down: 3.16, up: 3.24 }, // select "Settings"
]

export const cursor = cursorPath(
  { x: 250, y: 520 },
  0.15,
  [
    { t0: 0.18, t1: 0.53, via: { x: 120, y: 300 }, to: { x: POP.trigger.x + 10, y: TRIG_Y + 4 }, ease: ease.outQuart },
    // Drift down over the panel while it settles, then back to the trigger.
    { t0: 0.8, t1: 1.2, to: { x: 150, y: 250 }, ease: ease.inOutSine },
    { t0: 1.24, t1: 1.54, to: { x: POP.trigger.x + 4, y: TRIG_Y + 2 }, ease: ease.inOutCubic },
    { t0: 1.74, t1: 2.0, via: { x: 250, y: 160 }, to: { x: MENU.trigger.x + 6, y: TRIG_Y + 3 }, ease: ease.inOutCubic },
    // Down the items (the highlight follows), past "Settings", back up to it.
    { t0: 2.3, t1: 2.48, to: { x: 300, y: ITEM_Y(0) + 2 }, ease: ease.inOutSine },
    { t0: 2.5, t1: 2.66, to: { x: 306, y: ITEM_Y(1) + 1 }, ease: ease.inOutSine },
    { t0: 2.68, t1: 2.82, to: { x: 310, y: ITEM_Y(2) + 2 }, ease: ease.inOutSine },
    { t0: 2.84, t1: 2.96, to: { x: 312, y: ITEM_Y(3) + 10 }, ease: ease.inOutSine },
    { t0: 2.98, t1: 3.12, to: { x: 309, y: ITEM_Y(2) + 1 }, ease: ease.inOutSine },
    { t0: 3.3, t1: 3.9, to: { x: 400, y: 420 }, ease: ease.inOutSine },
  ],
  0.6,
)

const chevron = () =>
  svg(
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  )

function panelHost(left: number, top: number, cls: string, width?: number): { host: HTMLElement; surface: HTMLElement } {
  const surface = el('span', {
    attrs: { 'data-goop': 'surface', 'aria-hidden': 'true' },
    style: 'position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;',
  })
  const host = el('div', {
    class: cls,
    attrs: { 'data-side': 'bottom', 'data-state': 'closed' },
    style: `left:${left}px;top:${top}px;${width ? `width:${width}px;` : ''}isolation:isolate;visibility:hidden;`,
  })
  host.append(surface)
  return { host, surface }
}

export const emergeScene: SceneScript<Rt> = {
  seed: 31337,
  cursor,
  clicks,
  build(root) {
    // ---- popover ----
    const popTrigger = el('button', { class: 'btn btn-slime', attrs: { tabindex: '-1' } }, ['Edit size', chevron()])
    const popRow = el('div', { style: `position:absolute;left:${POP.trigger.x - 100}px;width:200px;top:${TRIG_Y - 20}px;display:flex;justify-content:center;pointer-events:none;` }, [popTrigger])
    popTrigger.style.pointerEvents = 'auto'
    const pop = panelHost(POP.panel.left, POP.panel.top, 'pop-panel')
    pop.host.append(
      el('div', { class: 'title', text: 'Dimensions' }),
      el('div', { class: 'desc', text: 'Set the size of the layer.' }),
      el('div', { class: 'field' }, ['Width', el('div', { class: 'input', text: '100%' })]),
      el('div', { class: 'field' }, ['Height', el('div', { class: 'input', text: 'auto' })]),
    )

    // ---- dropdown menu ----
    const menuTrigger = el('button', { class: 'btn btn-ink', attrs: { tabindex: '-1' } }, ['Options', chevron()])
    const menuRow = el('div', { style: `position:absolute;left:${MENU.trigger.x - 100}px;width:200px;top:${TRIG_Y - 20}px;display:flex;justify-content:center;pointer-events:none;` }, [menuTrigger])
    menuTrigger.style.pointerEvents = 'auto'
    const menu = panelHost(MENU.panel.left, MENU.panel.top, 'menu-panel', MENU.panel.width)
    const list = el('div', { class: 'menu-list' })
    const items: HTMLElement[] = []
    const item = (text: string, kbd: string) => {
      const it = el('div', { class: 'menu-item', attrs: { role: 'menuitem', 'data-variant': 'default' } }, [el('span', { text }), el('span', { class: 'kbd', text: kbd })])
      items.push(it)
      return it
    }
    list.append(
      el('div', { class: 'menu-label', text: 'My account' }),
      el('div', { class: 'menu-sep' }),
      item('Profile', '⇧⌘P'),
      item('Billing', '⌘B'),
      item('Settings', '⌘,'),
      item('Log out', '⇧⌘Q'),
    )
    menu.host.append(el('div', { style: 'min-height:0;flex:1;border-radius:inherit;overflow:hidden;' }, [list]))

    const wraps = [popRow, menuRow]
    root.append(pop.host, menu.host, popRow, menuRow)

    const common = { renderer: 'svg' as const, reducedMotion: false, surfaceColor: 'trigger' as const }
    const popHandle = attachEmerge(pop.host, { ...common, surface: pop.surface, anchor: popTrigger, side: 'bottom' })
    const menuHandle = attachEmerge(menu.host, { ...common, surface: menu.surface, anchor: menuTrigger, side: 'bottom' })
    const highlight = attachMenuHighlight(list, { renderer: 'svg', reducedMotion: false })

    const setOpen = (h: EmergeHandle, host: HTMLElement, open: boolean) => {
      host.setAttribute('data-state', open ? 'open' : 'closed')
      if (open) h.open()
      else h.close()
    }
    let popOpen = false
    popTrigger.addEventListener('click', () => {
      popOpen = !popOpen
      setOpen(popHandle, pop.host, popOpen)
    })
    let menuOpen = false
    const closeMenu = () => {
      menuOpen = false
      setOpen(menuHandle, menu.host, false)
    }
    menuTrigger.addEventListener('click', () => {
      menuOpen = !menuOpen
      setOpen(menuHandle, menu.host, menuOpen)
    })
    // reka: the item under the pointer is highlighted; leaving the menu clears it.
    const highlightItem = (target: HTMLElement | null) => {
      for (const it of items) {
        if (it === target) {
          if (!it.hasAttribute('data-highlighted')) it.setAttribute('data-highlighted', '')
        } else it.removeAttribute('data-highlighted')
      }
    }
    for (const it of items) {
      it.addEventListener('pointermove', () => menuOpen && highlightItem(it))
      it.addEventListener('click', () => {
        if (!menuOpen) return
        const ms = highlight.pop()
        setTimeout(closeMenu, ms)
      })
    }
    menu.host.addEventListener('pointerleave', () => menuOpen && highlightItem(null))

    return {
      wraps,
      panels: [
        { host: pop.host, handle: popHandle },
        { host: menu.host, handle: menuHandle },
      ],
      highlight,
      destroy() {
        highlight.destroy()
        popHandle.destroy()
        menuHandle.destroy()
      },
    }
  },
  step(rt, t) {
    rt.wraps.forEach((w, i) => {
      const [o, y] = entrance(t, 0.04 + i * 0.08)
      w.style.opacity = String(o)
      w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
    })
    for (const p of rt.panels) p.host.style.visibility = p.handle.state === 'closed' ? 'hidden' : 'visible'
  },
}
