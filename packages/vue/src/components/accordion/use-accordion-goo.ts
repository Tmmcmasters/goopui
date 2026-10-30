import { attachAccordion, type AccordionHandle, type AccordionOptions } from '@goopui/core'
import { onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type Ref, type ShallowRef } from 'vue'

/** A template ref setter that keeps the rendered element (reka components expose `$el`). */
export function useElementRef(): [ShallowRef<HTMLElement | null>, (c: Element | ComponentPublicInstance | null) => void] {
  const el = shallowRef<HTMLElement | null>(null)
  const set = (c: Element | ComponentPublicInstance | null): void => {
    const node = c && '$el' in c ? (c.$el as unknown) : c
    el.value = node instanceof HTMLElement ? node : null
  }
  return [el, set]
}

/** Attach core's accordion goo to `el` while `options` is non-null (browser-only: refs are
 *  only set on mount). Option changes update it; an `open` change animates. */
export function useAccordionGoo(
  el: Ref<HTMLElement | null>,
  options: Ref<AccordionOptions | null>,
): ShallowRef<AccordionHandle | null> {
  const handle = shallowRef<AccordionHandle | null>(null)
  const detach = (): void => {
    handle.value?.destroy()
    handle.value = null
  }
  const sync = (): void => {
    const node = el.value
    const opts = options.value
    if (!node || !opts) return detach()
    if (handle.value) handle.value.update(opts)
    else handle.value = attachAccordion(node, opts)
  }
  watch(
    el,
    () => {
      detach()
      sync()
    },
    { flush: 'post' },
  )
  watch(options, sync, { flush: 'post' })
  onBeforeUnmount(detach)
  return handle
}
