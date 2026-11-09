'use client'
// Wires a sidebar panel to core (mirrors @goopui/vue's use-sidebar-goo): the goo menu highlight
// (`attachSidebarHighlight`), the edge slosh (`attachSidebarEdge`) and the collapse / expand
// `travel` curve (`sidebarMotionCurve`). Browser-only: everything attaches after hydration.
import {
  attachSidebarEdge,
  attachSidebarHighlight,
  isReducedMotion,
  sidebarMotionCurve,
  watchReducedMotion,
  type GoopPreset,
  type MenuHighlightHandle,
  type SidebarEdgeHandle,
  type SidebarEdgeOptions,
  type SidebarHighlightOptions,
  type SidebarSide,
} from '@goopui/core'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useIsomorphicLayoutEffect } from '../../utils'

/**
 * Attach the highlight blob and the edge slosh to `panel` while it is mounted. `motion`
 * changes when the sidebar starts to move (collapse / expand): the edge samples its start
 * there (a layout effect, so the CSS transition is at its first frame).
 */
export function useSidebarGoo(
  panel: HTMLElement | null,
  highlight: SidebarHighlightOptions | null,
  edge: SidebarEdgeOptions | null,
  side: SidebarSide,
  motion: unknown,
): void {
  const hl = useRef<MenuHighlightHandle | null>(null)
  const ed = useRef<SidebarEdgeHandle | null>(null)
  const latest = useRef({ highlight, edge, side })
  latest.current = { highlight, edge, side }

  const syncHighlight = (el: HTMLElement | null) => {
    const opts = latest.current.highlight
    if (!el || !opts) {
      hl.current?.destroy()
      hl.current = null
      return
    }
    if (hl.current) hl.current.update(opts)
    else hl.current = attachSidebarHighlight(el, opts)
  }
  const syncEdge = (el: HTMLElement | null) => {
    const opts = latest.current.edge
    if (!el || !opts) {
      ed.current?.destroy()
      ed.current = null
      return
    }
    const full = { ...opts, side: latest.current.side }
    if (ed.current) ed.current.update(full)
    else ed.current = attachSidebarEdge(el, full)
  }

  useIsomorphicLayoutEffect(() => {
    syncHighlight(panel)
    syncEdge(panel)
    return () => {
      hl.current?.destroy()
      hl.current = null
      ed.current?.destroy()
      ed.current = null
    }
  }, [panel])
  useIsomorphicLayoutEffect(() => syncHighlight(panel), [highlight])
  useIsomorphicLayoutEffect(() => syncEdge(panel), [edge, side])

  const first = useRef(true)
  useIsomorphicLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ed.current?.track()
  }, [motion])
}

export interface SidebarTravelInput {
  /** The desktop sidebar's outer element (holds the --sidebar-width vars). */
  wrapper: HTMLElement | null
  on: boolean
  state: 'expanded' | 'collapsed'
  collapsible: 'offcanvas' | 'icon' | 'none'
  /** floating / inset: the icon rail is 1rem wider (shadcn's padding). */
  floating: boolean
  preset?: GoopPreset
  speed?: number
  reducedMotion?: boolean | 'auto'
}

/**
 * The collapse / expand transition (`travel`): the Drawer's momentum as a CSS transition on the
 * sidebar's gap and fixed container (core `sidebarMotionCurve`). Expanding launches fast and
 * lands with a small overshoot; collapsing accelerates away. undefined until mounted (so SSR
 * and hydration render shadcn's 200ms linear classes), when off, or with `collapsible="none"`.
 */
export function useSidebarTravel(i: SidebarTravelInput): CSSProperties | undefined {
  const [widths, setWidths] = useState<{ full: number; icon: number } | null>(null)
  const [reduced, setReduced] = useState(false)
  const [linear, setLinear] = useState(true)

  useIsomorphicLayoutEffect(() => {
    setLinear(typeof CSS === 'undefined' || !CSS.supports || CSS.supports('transition-timing-function', 'linear(0, 1)'))
  }, [])
  useIsomorphicLayoutEffect(() => {
    const read = () => {
      const r = i.reducedMotion
      setReduced(r === true || (r !== false && isReducedMotion(document)))
    }
    read()
    return watchReducedMotion(document, read)
  }, [i.reducedMotion])
  useIsomorphicLayoutEffect(() => {
    const el = i.wrapper
    if (!el) return
    const probe = el.ownerDocument.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--sidebar-width)'
    el.append(probe)
    const full = probe.offsetWidth
    probe.style.width = 'var(--sidebar-width-icon)'
    const icon = probe.offsetWidth
    probe.remove()
    setWidths({ full: full || 256, icon: icon || 48 })
  }, [i.wrapper, i.collapsible])

  return useMemo(() => {
    if (!widths || !i.on || i.collapsible === 'none') return undefined
    const rail = widths.icon + (i.floating ? 16 : 0)
    const distance = i.collapsible === 'icon' ? Math.max(0, widths.full - rail) : widths.full
    const c = sidebarMotionCurve({
      distance,
      opening: i.state === 'expanded',
      preset: i.preset,
      speed: i.speed,
      reduced,
      linear,
    })
    return { transitionDuration: `${c.duration}s`, transitionTimingFunction: c.easing }
  }, [widths, i.on, i.collapsible, i.floating, i.state, i.preset, i.speed, reduced, linear])
}
