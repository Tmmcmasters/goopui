// shadcn-vue's Card classes, verbatim.
export const CARD = 'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm'
export const CARD_HEADER =
  '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6'
export const CARD_TITLE = 'leading-none font-semibold'
export const CARD_DESCRIPTION = 'text-muted-foreground text-sm'
export const CARD_ACTION = 'col-start-2 row-span-2 row-start-1 self-start justify-self-end'
export const CARD_CONTENT = 'px-6'
export const CARD_FOOTER = 'flex items-center px-6 [.border-t]:pt-6'

/** With the goo on, the card hosts core's goo-edge layer (an svg at z-index -1). */
export const goopCardHost = 'relative isolate'
