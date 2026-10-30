// Shared by GoopDialog and GoopAlertDialog: attach core's goo to the content panel (detached
// bloom) and to the overlay (pouring backdrop) whenever their surface element mounts. reka's
// Presence remounts both on every open, often through a deferred teleport.
import {
  attachBackdrop,
  attachEmerge,
  type BackdropHandle,
  type BackdropOptions,
  type EmergeHandle,
  type EmergeOptions,
} from '@goopui/core'
import { onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

interface Attachable<O> {
  open(): void
  close(): number
  update(o: O): void
  destroy(): void
}

function useGoo<O, H extends Attachable<O>>(
  surface: Readonly<Ref<HTMLElement | null>>,
  options: () => O | null,
  open: () => boolean,
  create: (host: HTMLElement, el: HTMLElement, o: O) => H,
): ShallowRef<H | null> {
  const handle = shallowRef<H | null>(null) as ShallowRef<H | null>
  const detach = (): void => {
    handle.value?.destroy()
    handle.value = null
  }
  const attach = (): void => {
    const el = surface.value
    const host = el?.parentElement
    const o = options()
    if (!el || !host || !o) return
    if (handle.value) detach()
    handle.value = create(host, el, o)
    if (open()) handle.value.open()
  }
  watch(surface, (el) => (el ? attach() : detach()), { flush: 'post' })
  onBeforeUnmount(detach)
  watch(options, (next) => {
    if (next) handle.value?.update(next)
  }, { flush: 'post' })
  // Before render, so the hold animation picks up the close duration as data-state flips.
  watch(open, (o) => {
    if (o) handle.value?.open()
    else handle.value?.close()
  })
  return handle
}

/** The content panel: blooms from its own center (core `attachEmerge`, detached). `anchor`
 *  is only read for a `surface: 'trigger'` color. */
export function useDialogPanel(
  surface: Readonly<Ref<HTMLElement | null>>,
  options: () => EmergeOptions,
  open: () => boolean,
  anchor: () => HTMLElement | null,
): ShallowRef<EmergeHandle | null> {
  return useGoo<EmergeOptions, EmergeHandle>(surface, options, open, (host, el, o) =>
    attachEmerge(host, { ...o, surface: el, anchor }),
  )
}

/** The overlay: a goo sheet that pours down and drains off (core `attachBackdrop`). */
export function useDialogBackdrop(
  surface: Readonly<Ref<HTMLElement | null>>,
  options: () => BackdropOptions | null,
  open: () => boolean,
): ShallowRef<BackdropHandle | null> {
  return useGoo<BackdropOptions, BackdropHandle>(surface, options, open, (host, el, o) =>
    attachBackdrop(host, { ...o, surface: el }),
  )
}
