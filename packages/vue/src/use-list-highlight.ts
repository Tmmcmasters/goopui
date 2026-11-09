import { attachListHighlight, type ListHighlightHandle, type ListHighlightOptions } from '@goopui/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue'
import { useGoopConfig } from './config'

export interface UseGoopListHighlightReturn {
  /** The live highlight handle; null on the server, before mount, after unmount, or when off. */
  handle: ShallowRef<ListHighlightHandle | null>
  /** True while the blob is attached. Always false during SSR and hydration. */
  active: ComputedRef<boolean>
}

/**
 * The goo highlight blob of the menus (core `attachListHighlight`) over your own list of
 * links or buttons: a docs nav, a table of contents, a header's links, a segmented switch.
 * The blob follows hover (mouse / pen) and keyboard focus, and rests on `active` (e.g.
 * `'[aria-current="page"]'`) otherwise.
 *
 * SSR-safe: nothing touches the DOM until `onMounted`, and core inserts the aria-hidden blob
 * itself. While attached the list carries `data-goop-menu`: style the items' own flat
 * hover / active background with `:not([data-goop-menu])` on the list so SSR and first paint
 * keep it and the goo replaces it. App config (`preset`, `renderer`, `reducedMotion`) fills
 * what `options` leaves out. `enabled` going false removes the blob.
 */
export function useGoopListHighlight(
  target: () => HTMLElement | null | undefined,
  options: () => ListHighlightOptions = () => ({}),
  enabled: () => boolean = () => true,
): UseGoopListHighlightReturn {
  const config = useGoopConfig()
  const handle = shallowRef<ListHighlightHandle | null>(null)
  const mounted = shallowRef(false)
  const resolved = (): ListHighlightOptions => {
    const o = options()
    return {
      ...o,
      preset: o.preset ?? config.preset,
      renderer: o.renderer ?? config.renderer,
      reducedMotion: o.reducedMotion ?? config.reducedMotion,
    }
  }

  let el: HTMLElement | null = null
  const detach = (): void => {
    handle.value?.destroy()
    handle.value = null
    el = null
  }
  const sync = (): void => {
    const next = mounted.value && enabled() ? (target() ?? null) : null
    if (next !== el) detach()
    if (!next || next.nodeType !== 1) return
    if (!handle.value) {
      el = next
      handle.value = attachListHighlight(next, resolved())
    }
  }

  onMounted(() => {
    mounted.value = true
    sync()
  })
  onBeforeUnmount(() => {
    mounted.value = false
    detach()
  })
  // flush: 'post' so the list's DOM is patched before core re-reads it.
  watch([target, enabled], sync, { flush: 'post' })
  watch(resolved, (next) => handle.value?.update(next), { flush: 'post' })

  return { handle, active: computed(() => handle.value !== null) }
}
