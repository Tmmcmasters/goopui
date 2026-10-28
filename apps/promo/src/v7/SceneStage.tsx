// Mounts one v7 scene: an empty, composition-sized div that the SceneReplayer fills (DOM +
// core goo) and replays to local time `t` for every frame. React never renders children
// into it, so core and the scene builder own its subtree.

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cancelRender, continueRender, delayRender, getInputProps } from 'remotion'
import { GOOP_OVERLAY_ATTR } from '@goopui/core'
import { SceneReplayer, type SceneRuntime, type SceneScript } from '../goo/scene'
import { fontsReady } from '../fonts'
import { SIZE } from '../timeline'

async function placed(el: HTMLElement | null): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (el && el.getBoundingClientRect().top > -100_000) return
    await new Promise((r) => setTimeout(r, 5))
  }
  throw new Error('[promo] composition never left the off-screen portal')
}

export interface SceneStageProps<R extends SceneRuntime> {
  script: SceneScript<R>
  t: number
  /** Theme class + CSS vars for the scene's components. */
  className?: string
  style?: CSSProperties
}

export function SceneStage<R extends SceneRuntime>({ script, t, className, style }: SceneStageProps<R>) {
  const root = useRef<HTMLDivElement>(null)
  const replayer = useMemo(() => new SceneReplayer(script), [script])

  useLayoutEffect(() => {
    const handle = delayRender(`scene replay t=${t.toFixed(3)}`)
    let done = false
    fontsReady
      .then(() => placed(root.current))
      .then(() => {
        if (!root.current) throw new Error('scene root not mounted')
        return replayer.show(t, root.current, SIZE)
      })
      .then((stats) => {
        if (getInputProps().trace === true) console.log(`[goo] scene t=${t.toFixed(3)} steps=${stats.steps} replay=${stats.ms.toFixed(0)}ms`)
        // The escape overlay (fixed, viewport-sized) is kept inside the scene, under its content.
        const overlay = document.querySelector<HTMLElement>(`[${GOOP_OVERLAY_ATTR}]`)
        if (overlay && root.current && overlay.parentElement !== root.current) {
          overlay.style.zIndex = '0'
          root.current.prepend(overlay)
        }
        done = true
        continueRender(handle)
      })
      .catch((err) => cancelRender(err))
    return () => {
      if (!done) continueRender(handle)
    }
  }, [t, replayer])

  useEffect(() => () => void replayer.dispose(), [replayer])

  return (
    <div
      ref={root}
      className={className}
      style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, pointerEvents: 'auto', isolation: 'isolate', ...style }}
    />
  )
}
