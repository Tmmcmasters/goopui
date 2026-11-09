/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the layout batch (Aspect Ratio, Scroll Area, Resizable) and their
// /react/docs/components tiles. Each set mirrors its Vue twin (components/content/
// Demo{AspectRatio,ScrollArea,Resizable}.vue, components/docs/ComponentTile.vue) so the two
// pages compare 1:1; keep them in sync.
import {
  GoopAspectRatio,
  GoopResizableHandle,
  GoopResizablePanel,
  GoopResizablePanelGroup,
  GoopScrollArea,
  GoopScrollBar,
  GoopSeparator,
} from '@goopui/react'
import { Fragment } from 'react'

type Pg = Record<string, Record<string, unknown>>

// ---- Aspect Ratio (DemoAspectRatio.vue) ------------------------------------------------------

export function AspectRatioDemo({ set }: { set: string }) {
  if (set === 'square')
    return (
      <div className="w-full max-w-[12rem]">
        <GoopAspectRatio ratio={1} className="ratio-art rounded-lg">
          <span className="ratio-label">1 / 1</span>
        </GoopAspectRatio>
      </div>
    )
  return (
    <div className="w-full max-w-sm">
      <GoopAspectRatio ratio={16 / 9} className="ratio-art rounded-lg">
        <span className="ratio-label">16 / 9</span>
      </GoopAspectRatio>
    </div>
  )
}

// ---- Scroll Area (DemoScrollArea.vue) --------------------------------------------------------

const tags = Array.from({ length: 50 }, (_, i) => `v1.2.0-beta.${50 - i}`)
const works = ['Ornella Binni', 'Tom Byrom', 'Vladimir Malyavko', 'Annie Spratt', 'Pawel Czerwinski']

export function ScrollAreaDemo({ set, pg }: { set: string; pg: Pg }) {
  if (set === 'horizontal')
    return (
      <GoopScrollArea className="scroll-demo w-full max-w-96 rounded-md border whitespace-nowrap">
        <div className="flex w-max gap-4 p-4">
          {works.map((artist) => (
            <figure key={artist} className="shrink-0">
              <div className="ratio-art h-36 w-28 rounded-md" />
              <figcaption className="pt-2 text-xs text-muted-foreground">
                Photo by <span className="font-semibold text-foreground">{artist}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <GoopScrollBar orientation="horizontal" />
      </GoopScrollArea>
    )
  return (
    <GoopScrollArea className="scroll-demo h-72 w-48 rounded-md border" {...pg.main}>
      <div className="p-4">
        <h4 className="mb-4 text-sm leading-none font-medium">Tags</h4>
        {tags.map((tag) => (
          <Fragment key={tag}>
            <div className="text-sm">{tag}</div>
            <GoopSeparator className="my-2" />
          </Fragment>
        ))}
      </div>
    </GoopScrollArea>
  )
}

// ---- Resizable (DemoResizable.vue) -----------------------------------------------------------

export function ResizableDemo({ set, pg }: { set: string; pg: Pg }) {
  if (set === 'vertical')
    return (
      <GoopResizablePanelGroup orientation="vertical" className="min-h-[200px] max-w-md rounded-lg border">
        <GoopResizablePanel defaultSize="25%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Header</span>
          </div>
        </GoopResizablePanel>
        <GoopResizableHandle />
        <GoopResizablePanel defaultSize="75%">
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">Content</span>
          </div>
        </GoopResizablePanel>
      </GoopResizablePanelGroup>
    )
  return (
    <GoopResizablePanelGroup orientation="horizontal" className="max-w-md rounded-lg border" {...pg.main}>
      <GoopResizablePanel defaultSize="50%">
        <div className="flex h-[200px] items-center justify-center p-6">
          <span className="font-semibold">One</span>
        </div>
      </GoopResizablePanel>
      <GoopResizableHandle withHandle />
      <GoopResizablePanel defaultSize="50%">
        <GoopResizablePanelGroup orientation="vertical">
          <GoopResizablePanel defaultSize="25%">
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Two</span>
            </div>
          </GoopResizablePanel>
          <GoopResizableHandle withHandle />
          <GoopResizablePanel defaultSize="75%">
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Three</span>
            </div>
          </GoopResizablePanel>
        </GoopResizablePanelGroup>
      </GoopResizablePanel>
    </GoopResizablePanelGroup>
  )
}

// ---- /react/docs/components tiles (ComponentTile.vue's Vue cases, 1:1) -----------------------

export function LayoutTile({ slug }: { slug: string }) {
  switch (slug) {
    case 'aspect-ratio':
      return (
        <div className="w-28">
          <GoopAspectRatio ratio={16 / 9} className="ratio-tile" />
        </div>
      )
    case 'scroll-area':
      return (
        <GoopScrollArea type="always" className="sk-card h-16 w-28" tabIndex={-1}>
          <div className="flex flex-col gap-1.5 p-2 pr-3.5">
            {[90, 70, 100, 60, 85, 75, 95].map((w, i) => (
              <span key={i} className="sk-line" style={{ width: `${w}%` }} />
            ))}
          </div>
        </GoopScrollArea>
      )
    case 'resizable':
      return (
        <GoopResizablePanelGroup orientation="horizontal" className="sk-card h-16! w-28!">
          <GoopResizablePanel defaultSize="45%" />
          <GoopResizableHandle withHandle />
          <GoopResizablePanel defaultSize="55%" />
        </GoopResizablePanelGroup>
      )
    default:
      return null
  }
}
