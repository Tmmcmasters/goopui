// shadcn/ui's Card classes (React, style `radix-nova`), verbatim.
export const CARD =
  'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl'
export const CARD_HEADER =
  'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)'
export const CARD_TITLE = 'cn-font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm'
export const CARD_DESCRIPTION = 'text-sm text-muted-foreground'
export const CARD_ACTION = 'col-start-2 row-span-2 row-start-1 self-start justify-self-end'
export const CARD_CONTENT = 'px-(--card-spacing)'
export const CARD_FOOTER = 'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)'

/** With the goo on, the card hosts core's goo-edge layer (an svg at z-index -1 whose mound is
 *  painted past the card's box), so it isolates and stops clipping its overflow. The footer
 *  and images round their own corners, so nothing pokes out. */
export const goopCardHost = 'relative isolate overflow-visible'
