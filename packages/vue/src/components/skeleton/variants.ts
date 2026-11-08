// shadcn-vue's Skeleton classes (`bg-accent animate-pulse rounded-md`), split so the goo
// shimmer can replace the pulse.
export const SKELETON_BASE = 'bg-accent rounded-md'
export const SKELETON_PULSE = 'animate-pulse'

/** The mound's crest colour and opacity (times the preset's lift). Light: white at 0.85 on the
 *  pale accent. Dark: the theme's `--foreground` at 0.16, enough to read clearly on a dark
 *  accent while staying calm. Override `--goop-shimmer-color` / `--goop-shimmer-base` to tune. */
export const goopSkeletonShimmer =
  '[--goop-shimmer-base:0.85] dark:[--goop-shimmer-base:0.16] dark:[--goop-shimmer-color:var(--foreground)]'
