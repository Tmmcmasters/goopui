// shadcn-vue's Skeleton classes (`bg-accent animate-pulse rounded-md`), split so the goo
// shimmer can replace the pulse.
export const SKELETON_BASE = 'bg-accent rounded-md'
export const SKELETON_PULSE = 'animate-pulse'

/** The mound's crest is white at this opacity (times the preset's lift): strong on a light
 *  theme's pale accent, faint on a dark one. Override `--goop-shimmer-base` to tune. */
export const goopSkeletonShimmer = '[--goop-shimmer-base:0.85] dark:[--goop-shimmer-base:0.075]'
