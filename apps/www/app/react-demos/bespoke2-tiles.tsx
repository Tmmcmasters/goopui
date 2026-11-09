/** @jsxRuntime automatic */
/** @jsxImportSource react */
// /react/docs/components tiles (ComponentTile.vue) for Select, Carousel, Drawer, Sidebar and
// Page transition, mirroring their Vue tiles: Select is a real closed GoopSelect, Carousel the
// real GoopCarousel with its dots; Drawer, Sidebar and Page transition are the same still
// sketches as the Vue tiles (a live drawer, app shell or route change doesn't fit a tile; the
// sketch tokens are ComponentTile.vue's unscoped `.tile-art [data-react-island]` rules).
import { GoopCarousel, GoopCarouselContent, GoopCarouselDots, GoopCarouselItem, GoopSelect, GoopSelectTrigger, GoopSelectValue } from '@goopui/react'

export function Bespoke2Tile({ slug }: { slug: string }) {
  switch (slug) {
    case 'select':
      return (
        <GoopSelect>
          <GoopSelectTrigger size="sm" className="w-32 text-[11px]" tabIndex={-1} aria-label="Fruit">
            <GoopSelectValue placeholder="Pick a fruit" />
          </GoopSelectTrigger>
        </GoopSelect>
      )
    case 'carousel':
      return (
        <GoopCarousel className="w-28" tabIndex={-1}>
          <GoopCarouselContent className="-ml-2">
            {[1, 2, 3, 4].map((n) => (
              <GoopCarouselItem key={n} className="basis-4/5 pl-2">
                <div className="flex h-14 items-center justify-center rounded-lg border bg-card text-sm font-semibold">{n}</div>
              </GoopCarouselItem>
            ))}
          </GoopCarouselContent>
          <GoopCarouselDots className="mt-2.5 gap-2" />
        </GoopCarousel>
      )
    case 'drawer':
      return (
        <div className="sk-screen">
          <span className="sk-panel absolute inset-x-0 bottom-0 flex h-1/2 justify-center rounded-t-xl pt-1.5">
            <span className="h-1 w-6 rounded-full bg-[color-mix(in_oklch,var(--foreground)_25%,transparent)]" />
          </span>
        </div>
      )
    case 'sidebar':
      return (
        <div className="sk-screen flex overflow-hidden">
          <span className="sk-panel flex w-2/5 flex-col gap-1.5 p-2">
            <span className="sk-line goo w-3/4" />
            <span className="sk-line w-full" />
            <span className="sk-line w-2/3" />
            <span className="sk-line w-4/5" />
          </span>
          <span className="flex flex-1 flex-col gap-1.5 p-2">
            <span className="sk-line w-1/2" />
            <span className="sk-line w-full opacity-60" />
          </span>
        </div>
      )
    case 'page-transition':
      return (
        <div className="sk-screen overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-3/5 rounded-b-[40%] bg-[var(--goo)] opacity-85" />
        </div>
      )
    default:
      return null
  }
}
