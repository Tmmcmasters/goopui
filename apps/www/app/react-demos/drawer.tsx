/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the Drawer page: real @goopui/react drawers. Each set mirrors its Vue twin
// (components/content/DemoDrawer.vue) so the two pages compare 1:1; keep them in sync.
import {
  GoopButton,
  GoopDrawer,
  GoopDrawerClose,
  GoopDrawerContent,
  GoopDrawerDescription,
  GoopDrawerFooter,
  GoopDrawerHeader,
  GoopDrawerTitle,
  GoopDrawerTrigger,
} from '@goopui/react'
import { useState } from 'react'

type Pg = Record<string, Record<string, unknown>>

const DIRECTIONS = ['bottom', 'top', 'left', 'right'] as const
const SNAP_POINTS = [0.35, 0.65, 1]

export function DrawerDemo({ set, pg }: { set: string; pg: Pg }) {
  const [goal, setGoal] = useState(350)
  const [snap, setSnap] = useState<number | string | null>(SNAP_POINTS[0]!)
  const bump = (d: number) => setGoal((g) => Math.min(400, Math.max(200, g + d)))

  if (set === 'directions')
    return (
      <>
        {DIRECTIONS.map((d) => (
          <GoopDrawer key={d} direction={d}>
            <GoopDrawerTrigger asChild>
              <GoopButton variant="outline" size="sm">
                {d}
              </GoopButton>
            </GoopDrawerTrigger>
            <GoopDrawerContent>
              <GoopDrawerHeader>
                <GoopDrawerTitle>Direction: {d}</GoopDrawerTitle>
                <GoopDrawerDescription>Drag it, flick it away, or pull it past full open.</GoopDrawerDescription>
              </GoopDrawerHeader>
            </GoopDrawerContent>
          </GoopDrawer>
        ))}
      </>
    )

  if (set === 'snap')
    return (
      <GoopDrawer snapPoints={SNAP_POINTS} activeSnapPoint={snap} setActiveSnapPoint={setSnap}>
        <GoopDrawerTrigger asChild>
          <GoopButton variant="outline">Snap points ({String(snap)})</GoopButton>
        </GoopDrawerTrigger>
        <GoopDrawerContent className="h-full max-h-[97%]">
          <GoopDrawerHeader>
            <GoopDrawerTitle>Snap points</GoopDrawerTitle>
            <GoopDrawerDescription>Drag between 35%, 65% and full height. The edge sloshes on every snap.</GoopDrawerDescription>
          </GoopDrawerHeader>
          <div className="flex flex-wrap justify-center gap-2 p-4">
            {SNAP_POINTS.map((p) => (
              <GoopButton key={p} size="sm" variant="outline" onClick={() => setSnap(p)}>
                {p}
              </GoopButton>
            ))}
          </div>
        </GoopDrawerContent>
      </GoopDrawer>
    )

  return (
    <GoopDrawer {...pg.root}>
      <GoopDrawerTrigger asChild>
        <GoopButton variant="outline">Open drawer</GoopButton>
      </GoopDrawerTrigger>
      <GoopDrawerContent {...pg.content}>
        <div className="mx-auto w-full max-w-sm">
          <GoopDrawerHeader>
            <GoopDrawerTitle>Move goal</GoopDrawerTitle>
            <GoopDrawerDescription>Set your daily activity goal.</GoopDrawerDescription>
          </GoopDrawerHeader>
          <div className="flex items-center justify-center gap-4 p-4 pb-0">
            <GoopButton variant="outline" size="icon" className="rounded-full" aria-label="Decrease" disabled={goal <= 200} onClick={() => bump(-10)}>
              -
            </GoopButton>
            <div className="text-center">
              <div className="text-7xl font-bold tracking-tighter">{goal}</div>
              <div className="text-[0.70rem] uppercase text-muted-foreground">Calories/day</div>
            </div>
            <GoopButton variant="outline" size="icon" className="rounded-full" aria-label="Increase" disabled={goal >= 400} onClick={() => bump(10)}>
              +
            </GoopButton>
          </div>
          <GoopDrawerFooter>
            <GoopButton>Submit</GoopButton>
            <GoopDrawerClose asChild>
              <GoopButton variant="outline">Cancel</GoopButton>
            </GoopDrawerClose>
          </GoopDrawerFooter>
        </div>
      </GoopDrawerContent>
    </GoopDrawer>
  )
}
