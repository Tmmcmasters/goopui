'use client'
// GoopSkeletonReveal: a goopUI addition (shadcn has no equivalent). Wraps a loading state:
// while `loading`, the `skeleton` element renders and its GoopSkeleton blocks pool into one
// soft body of goo (a sheen flows through the group and bridges close neighbours; each block
// breathes). When `loading` turns false, `children` render in the same place and each block's
// goo melts into the element replacing it, then drains to reveal it. Engine: core's
// `attachSkeletonReveal` (same calls as @goopui/vue). Both render inside one
// `display: contents` wrapper each, so the root's classes lay them out the same way.
//
// The swap takes two commits, both before paint: `loading` turning false first re-renders
// with the skeleton still in place so core can measure it (`capture()`), then swaps in the
// content and melts into it (Vue does the same with a pre-flush watcher). SSR / before mount:
// just the element for the current state. Reduced motion: a cross-fade.
import { attachSkeletonReveal, type SkeletonRevealHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, useState, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { SKELETON_REVEAL_PROP_KEYS, splitProps, toSkeletonRevealOptions, type GoopSkeletonRevealEngineProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect } from '../../utils'

export type GoopSkeletonRevealProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopSkeletonRevealEngineProps> &
  GoopSkeletonRevealEngineProps & {
    /** Show the skeleton. Turning it false melts the skeleton into `children`. */
    loading?: boolean
    /** The placeholder: GoopSkeleton blocks laid out like the content. */
    skeleton?: ReactNode
    /** The real content (rendered once `loading` is false). */
    children?: ReactNode
    /** The melt finished (or was skipped): the content is fully shown. */
    onRevealed?: () => void
    /** Receives the live engine handle (null before mount). */
    goopRef?: Ref<SkeletonRevealHandle>
  }

export const GoopSkeletonReveal = forwardRef<HTMLDivElement, GoopSkeletonRevealProps>(function GoopSkeletonReveal(allProps, ref) {
  const [engine, props] = splitProps(allProps, SKELETON_REVEAL_PROP_KEYS)
  const { className, loading = false, skeleton, children, onRevealed, goopRef, ...rest } = props

  const root = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, root)
  const skeletonEl = useRef<HTMLDivElement | null>(null)
  const contentEl = useRef<HTMLDivElement | null>(null)
  const handle = useAttached(root, attachSkeletonReveal, toSkeletonRevealOptions(engine, useGoopConfig()))
  useImperativeHandle(goopRef, () => handle as SkeletonRevealHandle, [handle])

  // Which element is in the DOM. Lags `loading` by one (pre-paint) commit on the way out.
  const [shown, setShown] = useState(loading)
  const latest = useRef({ loading, onRevealed })
  latest.current = { loading, onRevealed }

  // Mount (the handle just attached): pool the skeleton that is already there.
  useIsomorphicLayoutEffect(() => {
    if (handle && shown) handle.pool(skeletonEl.current)
    // Only when the handle appears; later swaps are handled below.
  }, [handle])

  // `loading` changed: measure the blocks while they are still in the DOM, then swap.
  useIsomorphicLayoutEffect(() => {
    if (loading === shown) return
    if (!loading) handle?.capture()
    setShown(loading)
  }, [loading, shown, handle])

  // The swap is in the DOM: pool the new skeleton, or melt into the new content.
  const swapped = useRef(shown)
  useIsomorphicLayoutEffect(() => {
    if (swapped.current === shown) return
    swapped.current = shown
    if (!handle) return
    if (shown) handle.pool(skeletonEl.current)
    else if (contentEl.current) {
      void handle.reveal(contentEl.current).then(() => {
        if (!latest.current.loading) latest.current.onRevealed?.()
      })
    }
  }, [shown, handle])

  return (
    <div ref={composed} data-slot="skeleton-reveal" aria-busy={loading ? 'true' : undefined} className={cn('relative', className)} {...rest}>
      {shown ? (
        <div key="skeleton" ref={skeletonEl} data-slot="skeleton-reveal-skeleton" style={{ display: 'contents' }}>
          {skeleton}
        </div>
      ) : (
        <div key="content" ref={contentEl} data-slot="skeleton-reveal-content" style={{ display: 'contents' }}>
          {children}
        </div>
      )}
    </div>
  )
})
GoopSkeletonReveal.displayName = 'GoopSkeletonReveal'
