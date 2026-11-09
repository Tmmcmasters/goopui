/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the Carousel page: real @goopui/react carousels. Each set mirrors its Vue
// twin (components/content/DemoCarousel.vue) so the two pages compare 1:1; keep them in sync.
import { GoopCard, GoopCarousel, GoopCarouselContent, GoopCarouselDots, GoopCarouselItem, GoopCarouselNext, GoopCarouselPrevious } from '@goopui/react'

type Pg = Record<string, Record<string, unknown>>

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
const VARIANTS = [{ preset: 'wild' }, { stretch: false, slosh: false }, { goo: false }] as const

export function CarouselDemo({ set, pg }: { set: string; pg: Pg }) {
  if (set === 'sizes')
    return (
      <div className="flex w-full justify-center px-12">
        <GoopCarousel className="w-full max-w-56 sm:max-w-sm" opts={{ align: 'start' }}>
          <GoopCarouselContent>
            {range(8).map((i) => (
              <GoopCarouselItem key={i} className="basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <GoopCard className="aspect-square items-center justify-center">
                    <span className="text-2xl font-semibold">{i}</span>
                  </GoopCard>
                </div>
              </GoopCarouselItem>
            ))}
          </GoopCarouselContent>
          <GoopCarouselPrevious />
          <GoopCarouselNext />
        </GoopCarousel>
      </div>
    )

  if (set === 'vertical')
    return (
      <div className="flex w-full justify-center py-12">
        <GoopCarousel orientation="vertical" className="w-full max-w-40" opts={{ align: 'start' }}>
          <GoopCarouselContent className="-mt-1 h-[200px]">
            {range(5).map((i) => (
              <GoopCarouselItem key={i} className="basis-1/2 pt-1">
                <div className="p-1">
                  <GoopCard className="h-20 items-center justify-center py-0">
                    <span className="text-2xl font-semibold">{i}</span>
                  </GoopCard>
                </div>
              </GoopCarouselItem>
            ))}
          </GoopCarouselContent>
          <GoopCarouselPrevious />
          <GoopCarouselNext />
        </GoopCarousel>
      </div>
    )

  if (set === 'plain')
    return (
      <div className="grid w-full justify-items-center gap-8 px-12">
        {VARIANTS.map((v, n) => (
          <GoopCarousel key={n} className="w-full max-w-48" {...v}>
            <GoopCarouselContent>
              {range(4).map((i) => (
                <GoopCarouselItem key={i}>
                  <div className="p-1">
                    <GoopCard className="aspect-[4/3] items-center justify-center">
                      <span className="text-2xl font-semibold">{i}</span>
                    </GoopCard>
                  </div>
                </GoopCarouselItem>
              ))}
            </GoopCarouselContent>
            <GoopCarouselPrevious />
            <GoopCarouselNext />
          </GoopCarousel>
        ))}
      </div>
    )

  return (
    <div className="flex w-full justify-center px-12">
      <GoopCarousel className="w-full max-w-56 sm:max-w-xs" {...pg.main}>
        <GoopCarouselContent>
          {range(5).map((i) => (
            <GoopCarouselItem key={i}>
              <div className="p-1">
                <GoopCard className="aspect-square items-center justify-center">
                  <span className="text-4xl font-semibold">{i}</span>
                </GoopCard>
              </div>
            </GoopCarouselItem>
          ))}
        </GoopCarouselContent>
        <GoopCarouselPrevious />
        <GoopCarouselNext />
        <GoopCarouselDots className="mt-4" />
      </GoopCarousel>
    </div>
  )
}
