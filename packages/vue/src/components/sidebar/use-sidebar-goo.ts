// Wires a sidebar panel to core: the goo menu highlight (`attachSidebarHighlight`) and the edge
// slosh (`attachSidebarEdge`). Browser-only: everything attaches when the panel mounts.
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
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

export interface SidebarGooInput {
  panel: Readonly<ShallowRef<HTMLElement | null>>
  highlight: Ref<SidebarHighlightOptions | null>
  /** null: no slosh (mobile sheet, collapsible none, slosh off). */
  edge: Ref<SidebarEdgeOptions | null>
  side: () => SidebarSide
  /** Changes when the sidebar starts to move (collapse / expand). */
  motion: () => unknown
}

export function useSidebarGoo(input: SidebarGooInput) {
  const highlight = shallowRef<MenuHighlightHandle | null>(null)
  const edge = shallowRef<SidebarEdgeHandle | null>(null)

  const syncHighlight = () => {
    const el = input.panel.value
    const opts = input.highlight.value
    if (!el || !opts) {
      highlight.value?.destroy()
      highlight.value = null
      return
    }
    if (highlight.value) highlight.value.update(opts)
    else highlight.value = attachSidebarHighlight(el, opts)
  }
  const syncEdge = () => {
    const el = input.panel.value
    const opts = input.edge.value
    if (!el || !opts) {
      edge.value?.destroy()
      edge.value = null
      return
    }
    const full = { ...opts, side: input.side }
    if (edge.value) edge.value.update(full)
    else edge.value = attachSidebarEdge(el, full)
  }

  watch(
    input.panel,
    () => {
      highlight.value?.destroy()
      highlight.value = null
      edge.value?.destroy()
      edge.value = null
      syncHighlight()
      syncEdge()
    },
    { flush: 'post' },
  )
  watch(input.highlight, syncHighlight, { flush: 'post', deep: true })
  watch(input.edge, syncEdge, { flush: 'post', deep: true })
  // Before the DOM updates, so core samples the edge where it starts.
  watch(input.motion, () => edge.value?.track(), { flush: 'pre' })

  onBeforeUnmount(() => {
    highlight.value?.destroy()
    edge.value?.destroy()
    highlight.value = null
    edge.value = null
  })

  return { highlight, edge }
}

export interface SidebarTravelInput {
  /** The desktop sidebar's outer element (holds the --sidebar-width vars). */
  wrapper: Readonly<ShallowRef<HTMLElement | null>>
  on: () => boolean
  state: () => 'expanded' | 'collapsed'
  collapsible: () => 'offcanvas' | 'icon' | 'none'
  /** floating / inset: the icon rail is 1rem wider (shadcn's padding). */
  floating: () => boolean
  preset: () => GoopPreset | undefined
  speed: () => number | undefined
  reducedMotion: () => boolean | 'auto' | undefined
}

/**
 * The collapse / expand transition (`travel`): the Drawer's momentum as a CSS transition on the
 * sidebar's gap and fixed container (core `sidebarMotionCurve`). Expanding launches fast and
 * lands with a small overshoot; collapsing accelerates away. null until mounted, when off, or
 * with `collapsible="none"`: shadcn's 200ms linear classes apply.
 */
export function useSidebarTravel(input: SidebarTravelInput) {
  const widths = shallowRef<{ full: number; icon: number } | null>(null)
  const reduced = shallowRef(false)
  let linear = true
  let unwatch: (() => void) | null = null

  const measure = () => {
    const el = input.wrapper.value
    if (!el) return
    const probe = el.ownerDocument.createElement('div')
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--sidebar-width)'
    el.append(probe)
    const full = probe.offsetWidth
    probe.style.width = 'var(--sidebar-width-icon)'
    const icon = probe.offsetWidth
    probe.remove()
    widths.value = { full: full || 256, icon: icon || 48 }
  }
  const readReduced = () => {
    const r = input.reducedMotion()
    reduced.value = r === true || (r !== false && typeof document !== 'undefined' && isReducedMotion(document))
  }

  onMounted(() => {
    linear = typeof CSS === 'undefined' || !CSS.supports || CSS.supports('transition-timing-function', 'linear(0, 1)')
    readReduced()
    unwatch = watchReducedMotion(document, readReduced)
    measure()
  })
  watch([input.wrapper, input.collapsible], measure, { flush: 'post' })
  watch(input.reducedMotion, readReduced)
  onBeforeUnmount(() => unwatch?.())

  return computed(() => {
    const w = widths.value
    const mode = input.collapsible()
    if (!w || !input.on() || mode === 'none') return null
    const rail = w.icon + (input.floating() ? 16 : 0)
    const distance = mode === 'icon' ? Math.max(0, w.full - rail) : w.full
    const c = sidebarMotionCurve({
      distance,
      opening: input.state() === 'expanded',
      preset: input.preset(),
      speed: input.speed(),
      reduced: reduced.value,
      linear,
    })
    return { transitionDuration: `${c.duration}s`, transitionTimingFunction: c.easing }
  })
}
