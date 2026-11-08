// Shared setup of the button parts (First / Previous / Next / Last): ghost GoopButtons, so
// they press-squish and get the ghost hover goo. Their engine props inherit GoopPagination's.
import { computed } from 'vue'
import { resolvePaginationProps, toPaginationButtonProps, type GoopPaginationButtonProps } from '../../goop-props'
import { injectGoopPagination } from './context'

/** The GoopButton props of a button part: its own engine props over the root's. */
export function usePaginationButton(props: GoopPaginationButtonProps) {
  const root = injectGoopPagination()
  return computed(() => toPaginationButtonProps(resolvePaginationProps(props, root?.value)))
}

/** The inline SVG chevrons shadcn takes from lucide (`chevron-left`, `chevrons-left`, ...). */
export const CHEVRON_PATHS = {
  first: ['m11 17-5-5 5-5', 'm18 17-5-5 5-5'],
  previous: ['m15 18-6-6 6-6'],
  next: ['m9 18 6-6-6-6'],
  last: ['m6 17 5-5-5-5', 'm13 17 5-5-5-5'],
} as const
