import { attachGoop, type GoopHandle, type GoopOptions } from '@goopui/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type ComputedRef, type ShallowRef } from 'vue'
import { diffOptions } from './goop-props'

export interface UseGoopReturn {
  /** The live engine handle; null on the server, before mount, after unmount, or when off. */
  handle: ShallowRef<GoopHandle | null>
  /** True while the goo is attached. Always false during SSR and hydration, so markup that
   *  depends on it can't mismatch. */
  active: ComputedRef<boolean>
}

/**
 * Attach the goo engine to an element for the lifetime of the calling component.
 *
 * SSR-safe by construction: nothing touches `document` until `onMounted`, and core builds
 * the aria-hidden goo layer itself on the client, so server markup never contains it.
 * Option changes go through `handle.update()` (renderer/finish hot-swap in core, so no
 * remount). `enabled` going false destroys the goo; true attaches it again.
 */
export function useGoop(
  target: () => Element | null | undefined,
  options: () => GoopOptions,
  enabled: () => boolean = () => true,
): UseGoopReturn {
  const handle = shallowRef<GoopHandle | null>(null)
  let sent: GoopOptions = {}
  let mounted = false

  const attach = (): void => {
    if (handle.value || !mounted || !enabled()) return
    const el = target()
    if (!el || el.nodeType !== 1) return
    sent = options()
    handle.value = attachGoop(el as HTMLElement, sent)
  }
  const detach = (): void => {
    handle.value?.destroy()
    handle.value = null
  }

  onMounted(() => {
    mounted = true
    attach()
  })
  onBeforeUnmount(() => {
    mounted = false
    detach()
  })

  // flush: 'post' so the DOM (classes, --goop-* vars) is patched before core re-reads it.
  watch(enabled, (on) => (on ? attach() : detach()), { flush: 'post' })
  watch(
    options,
    (next) => {
      const h = handle.value
      if (!h) return
      const patch = diffOptions(sent, next)
      sent = next
      if (patch) h.update(patch)
    },
    { flush: 'post' },
  )

  return { handle, active: computed(() => handle.value !== null) }
}

/** FNV-1a hash of a string (e.g. `useId()`) into a 32-bit engine seed. */
export function seedFrom(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}
