// shadcn/ui's Skeleton classes (React, style `radix-nova`: `animate-pulse rounded-md bg-muted`),
// split so the goo shimmer can replace the pulse.
export const SKELETON_BASE = 'rounded-md bg-muted'
export const SKELETON_PULSE = 'animate-pulse'

/** The mound's crest colour and opacity (times the preset's lift). Light: white at 0.85 on the
 *  pale muted. Dark: the theme's `--foreground` at 0.16, enough to read clearly on a dark
 *  muted while staying calm. Override `--goop-shimmer-color` / `--goop-shimmer-base` to tune. */
export const goopSkeletonShimmer =
  '[--goop-shimmer-base:0.85] dark:[--goop-shimmer-base:0.16] dark:[--goop-shimmer-color:var(--foreground)]'
