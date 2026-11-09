'use client'
// The goo highlight blob on a cmdk list (GoopCommandList, GoopComboboxList): core's
// `attachMenuHighlight` on cmdk's list sizer (the element cmdk renders the items in, and moves
// them around in while it sorts). cmdk marks the active item `data-selected="true"` (core's
// default finder reads reka / Radix `data-highlighted`), so the blob follows a cmdk finder, and
// is re-aimed whenever cmdk's selection or search changes (core only watches
// `data-highlighted` / `data-state` itself). With `ignoreFilter` the parent renders and
// reorders the items, maybe after the search changed (async results): any change to the
// items re-aims it too. The list may mount later than the hook's component (a combobox's list
// lives in a popover that mounts on open), so it attaches whenever the list element appears.
import { attachMenuHighlight, isRenderedItem, MENU_CONTAINER_ATTR, type MenuHighlightHandle, type MenuHighlightOptions } from '@goopui/core'
import { useCommandState } from 'cmdk'
import { useCallback, useRef, useState } from 'react'
import { sameValue } from '../../goop-props'
import { useIsomorphicLayoutEffect } from '../../utils'

/** The highlighted, visible item of a cmdk list sizer (nested highlight containers skipped). */
export function findCmdkHighlight(container: HTMLElement): Element | null {
  for (const el of container.querySelectorAll('[cmdk-item][data-selected="true"]')) {
    const owner = el.closest(`[${MENU_CONTAINER_ATTR}]`)
    if (owner && owner !== container) continue
    if (isRenderedItem(el)) return el
  }
  return null
}

/**
 * Attach the highlight to the cmdk list whose element `setList` receives (put it on
 * `Command.List`). `options` null: off. Returns the ref callback and the live handle.
 */
export function useCmdkHighlight(
  options: MenuHighlightOptions | null,
  ignoreFilter: boolean,
): { setList: (node: HTMLDivElement | null) => void; handle: MenuHighlightHandle | null } {
  const [sizer, setSizer] = useState<HTMLElement | null>(null)
  const setList = useCallback((node: HTMLDivElement | null) => {
    setSizer(node?.querySelector<HTMLElement>(':scope > [cmdk-list-sizer]') ?? null)
  }, [])
  const [handle, setHandle] = useState<MenuHighlightHandle | null>(null)
  const on = options !== null
  const full = options ? { ...options, find: findCmdkHighlight } : null
  const latest = useRef(full)
  latest.current = full
  const sent = useRef(full)

  useIsomorphicLayoutEffect(() => {
    if (!on || !sizer || !latest.current) return
    sent.current = latest.current
    const h = attachMenuHighlight(sizer, sent.current)
    setHandle(h)
    return () => {
      h.destroy()
      setHandle(null)
    }
  }, [on, sizer])
  useIsomorphicLayoutEffect(() => {
    if (!handle || !full || sameValue(sent.current, full)) return
    sent.current = full
    handle.update(full)
  })

  const selected = useCommandState((s) => s.selectedItemId)
  const search = useCommandState((s) => s.search)
  useIsomorphicLayoutEffect(() => {
    handle?.refresh()
  }, [handle, selected, search])

  useIsomorphicLayoutEffect(() => {
    if (!handle || !sizer || !ignoreFilter || typeof MutationObserver === 'undefined') return
    const mo = new MutationObserver((records) => {
      // Skip the blob's own layer.
      const inBlob = (r: MutationRecord) => !!(r.target as Element).closest?.('[data-goop]')
      if (records.every(inBlob)) return
      handle.refresh()
    })
    mo.observe(sizer, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [handle, sizer, ignoreFilter])

  return { setList, handle }
}
