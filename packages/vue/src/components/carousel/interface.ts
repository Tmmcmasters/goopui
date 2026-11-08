import type { EmblaCarouselType } from 'embla-carousel'
import type useEmblaCarousel from 'embla-carousel-vue'
import type { HTMLAttributes } from 'vue'
import type { GoopCarouselProps } from '../../goop-props'

// shadcn-vue's carousel types, verbatim, plus the goo props, `setApi` (shadcn React's name for
// `@init-api`) and reka's `as` / `asChild`.
// (shadcn's `UnwrapRef<ReturnType<typeof useEmblaCarousel>[1]>`, named so declarations emit.)
type CarouselApi = EmblaCarouselType | undefined
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

export type UnwrapRefCarouselApi = CarouselApi
export type CarouselEmblaOptions = CarouselOptions
export type CarouselEmblaPlugin = CarouselPlugin

export interface CarouselProps extends GoopCarouselProps {
  /** Embla options (`axis` comes from `orientation`). */
  opts?: CarouselOptions
  /** Embla plugins (e.g. embla-carousel-autoplay). */
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  /** Called with the embla API once it exists (same as `@init-api`). */
  setApi?: (api: UnwrapRefCarouselApi) => void
}

export interface CarouselEmits {
  (e: 'init-api', payload: UnwrapRefCarouselApi): void
}

export interface WithClassAsProps {
  class?: HTMLAttributes['class']
}

/** reka-ui Primitive props: render another element, or merge onto the single child. */
export interface WithAsChildProps {
  as?: string | object
  asChild?: boolean
}
