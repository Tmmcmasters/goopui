// shadcn-vue's Avatar classes, verbatim, plus the settle tokens.
export const AVATAR = 'relative flex size-8 shrink-0 overflow-hidden rounded-full'
export const AVATAR_IMAGE = 'aspect-square size-full'
export const AVATAR_FALLBACK = 'bg-muted flex size-full items-center justify-center rounded-full'

/** While settling, the root lets the soft overshoot show past its circle; the image rounds
 *  its own corners instead of relying on the root's clip. */
export const goopAvatarSettle = 'overflow-visible'
export const goopAvatarImageRound = 'rounded-[inherit]'
