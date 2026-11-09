---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

`GoopSkeletonReveal` (core `attachSkeletonReveal`): wraps a loading state with a `#skeleton` slot and the content in the default slot, toggled by `loading`. While loading, the group's GoopSkeleton blocks pool into one goo layer: a slow sheen flows through the group and bridges close blocks, and each block breathes. When `loading` turns false, each block flows into the element replacing it (matched by overlap: avatar, text lines, button, taking the button's colour) with a stagger, then drains away. Effects `sheen`, `breathe`, `melt` (false: a cross-fade), plus `speed` and `preset`. Reduced motion: still blocks and a cross-fade. The standalone GoopSkeleton shimmer mound now swells a little as it crosses.
