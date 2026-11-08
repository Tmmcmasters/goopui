// shadcn/ui's Card classes (React, style `radix-nova`), verbatim. shadcn-vue's reka-nova is the
// same look, with the spacing written per size instead of through --card-spacing.
export const CARD =
  'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl'
export const CARD_HEADER =
  'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)'
export const CARD_TITLE = 'cn-font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm'
export const CARD_DESCRIPTION = 'text-sm text-muted-foreground'
export const CARD_ACTION = 'col-start-2 row-span-2 row-start-1 self-start justify-self-end'
export const CARD_CONTENT = 'px-(--card-spacing)'
export const CARD_FOOTER = 'flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)'

/** Card sizes (shadcn's `size` prop, written to `data-size`). */
export type CardSize = 'default' | 'sm'

/** With the goo on, the card hosts core's goo-edge layer (an svg at z-index -1). The mound is
 *  painted past the card's box, so the card stops clipping (shadcn's overflow-hidden only
 *  rounds images, header and footer, which round themselves too). The ring follows the mound
 *  through goop.css (a stroke on the edge path). */
export const goopCardHost = 'relative isolate overflow-visible'
