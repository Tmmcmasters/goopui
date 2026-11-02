// Wires one menu panel (GoopDropdownMenuContent or SubContent) to core: `attachEmerge` on the
// panel (the same engine and goop.css hold rules as GoopPopoverContent) and
// `attachMenuHighlight` on its item list. Browser-only: everything attaches when the surface
// element mounts, so SSR renders plain markup.
import {
  attachEmerge,
  attachMenuHighlight,
  type EmergeHandle,
  type EmergeOptions,
  type MenuHighlightHandle,
  type MenuHighlightOptions,
} from '@goopui/core'
import { onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

export interface MenuGooInput {
  surface: Readonly<ShallowRef<HTMLElement | null>>
  list: Readonly<ShallowRef<HTMLElement | null>>
  open: () => boolean
  anchor: () => HTMLElement | null | undefined
  emerge: Ref<EmergeOptions>
  /** null: the highlight blob is off. */
  highlight: Ref<MenuHighlightOptions | null>
  /** Close the whole menu (after the select pop). */
  close: () => void
  /** The panel is in place (default: reka's popper wrapper has left its parking spot). */
  ready?: (host: HTMLElement) => boolean
  /** Where a bloom starts (core `bloomOrigin`); null / absent: the panel's center. */
  origin?: () => Element | null | undefined
}

/** reka parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
const positioned = (host: HTMLElement) => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-reka-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

export function useMenuGoo(input: MenuGooInput) {
  const emerge = shallowRef<EmergeHandle | null>(null)
  const highlight = shallowRef<MenuHighlightHandle | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  const detachEmerge = () => {
    emerge.value?.destroy()
    emerge.value = null
  }
  const attachPanel = (el: HTMLElement | null) => {
    detachEmerge()
    const host = el?.parentElement
    if (!el || !host) return
    const ready = input.ready ?? positioned
    emerge.value = attachEmerge(host, {
      ...input.emerge.value,
      surface: el,
      anchor: () => input.anchor() ?? null,
      ready: () => ready(host),
      bloomOrigin: input.origin ? () => input.origin?.() ?? null : null,
    })
    if (input.open()) emerge.value.open()
  }

  const detachHighlight = () => {
    highlight.value?.destroy()
    highlight.value = null
  }
  const syncHighlight = () => {
    const el = input.list.value
    const opts = input.highlight.value
    if (!el || !opts) return detachHighlight()
    if (highlight.value) highlight.value.update(opts)
    else highlight.value = attachMenuHighlight(el, opts)
  }

  // The content mounts on every open (reka's Presence): attach whenever the parts appear.
  watch(input.surface, attachPanel, { flush: 'post' })
  watch(input.list, () => {
    detachHighlight()
    syncHighlight()
  }, { flush: 'post' })
  watch(input.emerge, (next) => emerge.value?.update(next), { flush: 'post' })
  watch(input.highlight, syncHighlight, { flush: 'post' })
  // Before render, so the hold animation picks up the close duration as data-state flips.
  watch(input.open, (open) => {
    if (open) emerge.value?.open()
    else {
      clearTimeout(timer)
      emerge.value?.close()
    }
  })

  onBeforeUnmount(() => {
    clearTimeout(timer)
    detachEmerge()
    detachHighlight()
  })

  /** Item selected: squish the highlight, and if the menu would close, close it once the pop
   *  has played. Respects a consumer's `event.preventDefault()` (menu stays open).
   *  `commit` runs right away in place of the primitive's default action (a select sets its
   *  value); `close: false` keeps the menu open (a multi-select). */
  const select = (event: Event, opts: { commit?: () => void; close?: boolean } = {}) => {
    const ms = highlight.value?.pop() ?? 0
    if (ms <= 0 || event.defaultPrevented) return
    event.preventDefault()
    opts.commit?.()
    if (opts.close === false) return
    clearTimeout(timer)
    timer = setTimeout(input.close, ms)
  }

  return { emerge, highlight, select }
}
