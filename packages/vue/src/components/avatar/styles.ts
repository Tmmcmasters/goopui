// shadcn/ui's Avatar classes (React, style `radix-nova`), verbatim, plus the settle tokens.
// The root no longer clips (`overflow-hidden` is gone): the image and fallback round
// themselves, and the hairline rim is an `after:` border blended over them.
export const AVATAR =
  'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten'
export const AVATAR_IMAGE = 'aspect-square size-full rounded-full object-cover'
export const AVATAR_FALLBACK =
  'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs'

/** Avatar sizes (shadcn's `size` prop, written to `data-size`). */
export type AvatarSize = 'default' | 'sm' | 'lg'

/** While settling, the root lets the soft overshoot show past its circle; the image rounds
 *  its own corners instead of relying on the root's clip. */
export const goopAvatarSettle = 'overflow-visible'
export const goopAvatarImageRound = 'rounded-[inherit]'
