// The TagsInput classes: shadcn-vue's (style `reka-nova`), verbatim, so @goopui/vue and
// @goopui/react look the same (shadcn/ui React has no TagsInput; this one is goopUI's own),
// plus the goo overrides.

export const TAGS_INPUT =
  'flex flex-wrap gap-2 items-center rounded-md border border-input bg-background px-2 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'

export const TAGS_INPUT_ITEM =
  'flex h-5 items-center rounded-md bg-secondary data-[state=active]:ring-ring data-[state=active]:ring-2 data-[state=active]:ring-offset-2 ring-offset-background'

export const TAGS_INPUT_ITEM_TEXT = 'py-0.5 px-2 text-sm rounded bg-transparent'

export const TAGS_INPUT_ITEM_DELETE = 'flex rounded bg-transparent mr-1'

export const TAGS_INPUT_INPUT = 'text-sm min-h-5 focus:outline-none flex-1 bg-transparent px-1'

/** The element core puts the ring layer in (around the bordered box). It sizes like the box
 *  does (a block, full width); pass `containerClassName` to change that. */
export const goopTagsInputContainer = 'relative w-full min-w-0'

/** While the goo ring is attached it is the focus indicator: it replaces the box-shadow ring
 *  (border colours stay), and any app-level `:focus-visible` outline on the inner field
 *  (it would sit inside the goo ring). Reduced motion still draws the ring (static). */
export const goopTagsInputActive = 'focus-within:ring-0 aria-invalid:ring-0 [&_[data-slot=tags-input-input]]:focus-visible:outline-none!'
