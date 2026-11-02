// Wires a sidebar panel to core: the goo menu highlight (`attachSidebarHighlight`) and the edge
// slosh (`attachSidebarEdge`). Browser-only: everything attaches when the panel mounts.
import {
  attachSidebarEdge,
  attachSidebarHighlight,
  type MenuHighlightHandle,
  type SidebarEdgeHandle,
  type SidebarEdgeOptions,
  type SidebarHighlightOptions,
  type SidebarSide,
} from '@goopui/core'
import { onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

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
