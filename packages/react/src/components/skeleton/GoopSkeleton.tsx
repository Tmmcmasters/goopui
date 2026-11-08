'use client'
// GoopSkeleton: shadcn/ui's Skeleton (a div, `className` merge) whose grey pulse becomes a slow
// goo shimmer: a soft, low mound of slightly lighter goo drifts across the shape. CSS only
// (goop.css: one radial gradient on a pseudo-element, transform-animated), so a page full of
// skeletons stays smooth, and the server renders it exactly as the client does. Reduced
// motion: static. `shimmer={false}` is shadcn's pulse. Client module only because it reads
// <GoopProvider>'s preset (React context).
import { skeletonShimmerOn, skeletonStyle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react'
import { useGoopConfig } from '../../config'
import { SKELETON_PROP_KEYS, splitProps, toSkeletonOptions, type GoopSkeletonEngineProps } from '../../goop-props'
import { SKELETON_BASE, SKELETON_PULSE, goopSkeletonShimmer } from './variants'

export type GoopSkeletonProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopSkeletonEngineProps> & GoopSkeletonEngineProps

export const GoopSkeleton = forwardRef<HTMLDivElement, GoopSkeletonProps>(function GoopSkeleton(allProps, ref) {
  const [engine, props] = splitProps(allProps, SKELETON_PROP_KEYS)
  const { className, style, ...rest } = props
  const options = toSkeletonOptions(engine, useGoopConfig())
  const on = skeletonShimmerOn(options)
  return (
    <div
      ref={ref}
      data-slot="skeleton"
      data-goop-shimmer={on ? '' : undefined}
      data-goop-still={on && options.reducedMotion === true ? '' : undefined}
      style={{ ...(skeletonStyle(options) as CSSProperties), ...style }}
      className={cn(SKELETON_BASE, on ? goopSkeletonShimmer : SKELETON_PULSE, className)}
      {...rest}
    />
  )
})
GoopSkeleton.displayName = 'GoopSkeleton'
