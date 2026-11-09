// The React alpha clip's Dialog beat: shadcn's DialogContent markup (React, radix-nova: popover
// panel with a ring, ghost X close, header, fields, muted footer) over shadcn's blurred,
// fading overlay, with @goopui/core attached the way GoopDialogContent attaches it: the panel
// blooms detached from its own center (attachEmerge + DIALOG_FEEL, toDialogOptions'
// defaults). Radix's behaviour is wired by hand: the trigger opens it, "Save changes" closes it.
// Scene-local seconds, 640 x 360 composition px.

import { attachEmerge, DIALOG_FEEL, type EmergeHandle } from '@goopui/core'
import { cursorPath, ease } from '../goo/path'
import type { SceneScript } from '../goo/scene'
import { beat, centered, clicksAt, common, icon, ICON, outlineButton, surfaceSpan, type Rt } from '../launch/scenes'
import { el, smooth } from '../v7/dom'

const TRIGGER = { x: 320, y: 186 }
/** The panel: sm:max-w-sm, scaled to the 640 px stage; centred a touch below the caption. */
const PANEL = { w: 360, h: 276, cy: 200 }
const PANEL_X = (640 - PANEL.w) / 2
const PANEL_Y = PANEL.cy - PANEL.h / 2
/** "Save changes" in the footer, relative to the panel's bottom-right corner. */
const SAVE_FROM_BR = { dx: -66, dy: -32 }
/** Overlay fade (shadcn: duration-100; a touch longer so it reads at 60 fps). */
const OVERLAY_IN = 0.16

export const DIALOG_CLICKS = clicksAt([0.5, 2.12])

function makeDialogBeat(): SceneScript<Rt> {
  // The panel has a fixed height (footer pinned to its bottom), so the cursor's targets are known.
  const save = { x: PANEL_X + PANEL.w + SAVE_FROM_BR.dx, y: PANEL_Y + PANEL.h + SAVE_FROM_BR.dy }
  return beat({
    seed: 6101,
    clicks: DIALOG_CLICKS,
    cursor: cursorPath(
        { x: 610, y: 372 },
        0.04,
        [
          { t0: 0.05, t1: 0.42, via: { x: 500, y: 290 }, to: { x: TRIGGER.x + 16, y: TRIGGER.y + 5 }, ease: ease.outQuart },
          // Wait for the bloom to settle, then over to the footer's primary button.
          { t0: 1.3, t1: 1.92, via: { x: 430, y: 250 }, to: { x: save.x + 4, y: save.y + 2 }, ease: ease.inOutCubic },
          { t0: 2.45, t1: 3.0, to: { x: 540, y: 330 }, ease: ease.inOutSine },
        ],
        0.6,
      ),
    build(root, ctx) {
      const trigger = outlineButton('Edit profile')
      const row = centered(TRIGGER.x, TRIGGER.y - 20, trigger)
      trigger.style.pointerEvents = 'auto'
      root.append(row)

      let emerge: EmergeHandle | null = null
      let overlay: HTMLElement | null = null
      let host: HTMLElement | null = null
      let openedAt = -1
      let closedAt = -1

      const field = (label: string, value: string) =>
        el('div', { class: 'dlg-field' }, [el('div', { class: 'dlg-lbl', text: label }), el('div', { class: 'dlg-input', text: value })])

      trigger.addEventListener('click', () => {
        if (host) return
        overlay = el('div', { class: 'dlg-overlay', attrs: { 'data-state': 'open' } })
        const surface = surfaceSpan()
        const save = el('button', { class: 'btn btn-primary btn-sm', attrs: { tabindex: '-1' }, text: 'Save changes' })
        host = el(
          'div',
          {
            class: 'dlg',
            attrs: { role: 'dialog', 'data-slot': 'dialog-content', 'data-state': 'open' },
            style: `left:${PANEL_X}px;top:${PANEL_Y}px;width:${PANEL.w}px;height:${PANEL.h}px;`,
          },
          [
            surface,
            el('div', { class: 'dlg-hd' }, [
              el('div', { class: 'dlg-ttl', text: 'Edit profile' }),
              el('div', { class: 'dlg-dsc', text: "Make changes to your profile here." }),
            ]),
            el('div', { class: 'dlg-fields' }, [field('Name', 'Pedro Duarte'), field('Username', '@peduarte')]),
            el('div', { class: 'dlg-ft' }, [el('button', { class: 'btn btn-outline btn-sm', attrs: { tabindex: '-1' }, text: 'Cancel' }), save]),
            el('div', { class: 'dlg-x', attrs: { 'data-slot': 'dialog-close' } }, [icon(ICON.x)]),
          ],
        )
        root.append(overlay, host)
        // toDialogOptions' defaults: detached bloom, every momentum effect on, popover surface.
        emerge = attachEmerge(host, {
          ...common,
          feel: DIALOG_FEEL,
          detached: true,
          bloomStart: 'single',
          wobble: true,
          fade: true,
          openSlosh: true,
          openDrips: true,
          closeSlosh: true,
          surfaceColor: 'popover',
          speed: 1,
          surface,
          anchor: trigger,
        })
        emerge.open()
        openedAt = ctx.now()
        save.addEventListener('click', () => {
          if (!emerge || closedAt >= 0) return
          host?.setAttribute('data-state', 'closed')
          overlay?.setAttribute('data-state', 'closed')
          emerge.close()
          closedAt = ctx.now()
        })
      })
      return {
        enter: [row],
        tick(t) {
          if (overlay && openedAt >= 0) {
            let o = smooth((t - openedAt) / OVERLAY_IN)
            if (closedAt >= 0) o *= 1 - smooth((t - closedAt) / Math.max(0.15, (emerge?.closeDuration ?? 300) / 1000))
            overlay.style.opacity = o.toFixed(3)
          }
          if (host && emerge) host.style.visibility = emerge.state === 'closed' && closedAt >= 0 ? 'hidden' : 'visible'
        },
        destroy: () => emerge?.destroy(),
      }
    },
  })
}

export const dialogBeat = makeDialogBeat()
