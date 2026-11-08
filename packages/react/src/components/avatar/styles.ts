// shadcn/ui's Avatar classes (React, style `radix-nova`), verbatim, plus the settle tokens.
export const AVATAR =
  'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten'
export const AVATAR_IMAGE = 'aspect-square size-full rounded-full object-cover'
export const AVATAR_FALLBACK =
  'flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs'
export const AVATAR_BADGE = [
  'absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none',
  'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
  'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
  'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
].join(' ')
export const AVATAR_GROUP = 'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background'
export const AVATAR_GROUP_COUNT =
  'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3'

/** While settling, the root lets the soft overshoot show past its circle; the image rounds
 *  its own corners instead of relying on the root's clip (same tokens as @goopui/vue). */
export const goopAvatarSettle = 'overflow-visible'
export const goopAvatarImageRound = 'rounded-[inherit]'
