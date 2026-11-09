/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React preview for the Page transition page, mirroring components/content/DemoPageTransition.vue:
// a full cover -> short hold -> reveal in the picked direction, on its own GoopPageTransition
// (links={false}: the docs site's own navigation keeps the site-wide transition). Bubbles, band
// and the rest come from the page's Customize panel.
import { GoopButton, GoopPageTransition, type GoopPageTransitionApi } from '@goopui/react'
import { useRef, useState } from 'react'

type Pg = Record<string, Record<string, unknown>>
type Direction = 'down' | 'up' | 'left' | 'right'
const DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right']

export function PageTransitionDemo({ pg }: { pg: Pg }) {
  const [direction, setDirection] = useState<Direction>('down')
  const [busy, setBusy] = useState(false)
  const api = useRef<GoopPageTransitionApi>(null)
  const play = async (d: Direction) => {
    if (busy || !api.current) return
    setBusy(true)
    setDirection(d)
    // Let the new direction reach the engine first.
    await new Promise((r) => requestAnimationFrame(r))
    await api.current.cover()
    await new Promise((r) => setTimeout(r, 220))
    await api.current.reveal()
    setBusy(false)
  }
  return (
    <GoopPageTransition goopRef={api} links={false} {...pg.main} direction={direction}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {DIRECTIONS.map((d) => (
            <GoopButton key={d} variant="outline" disabled={busy} onClick={() => void play(d)}>
              Pour {d}
            </GoopButton>
          ))}
        </div>
      </div>
    </GoopPageTransition>
  )
}
