'use client'
// Small React helpers shared by the components.
import { useEffect, useLayoutEffect, useRef, type Ref, type RefCallback } from 'react'
import { sameValue } from './goop-props'

/** useLayoutEffect on the client, useEffect on the server (no SSR warning on React 18).
 *  Layout effects run after hydration, before paint: the goo attaches without a flash. */
export const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect

/** Set one ref (callback or object). */
export function setRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}

/** One callback ref that sets every given ref. Stable while the refs are. */
export function useComposedRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  const latest = useRef(refs)
  latest.current = refs
  const cb = useRef<RefCallback<T> | null>(null)
  if (!cb.current) cb.current = (node: T | null) => latest.current.forEach((r) => setRef(r, node))
  return cb.current
}

/** The previous value when the new one is deep-equal (options objects built every render). */
export function useStableValue<T>(value: T): T {
  const ref = useRef(value)
  if (!sameValue(ref.current, value)) ref.current = value
  return ref.current
}
