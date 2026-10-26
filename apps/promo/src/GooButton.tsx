// A "Get started" GoopButton whose goo is rebuilt + replayed for every frame (see
// goo/replay.ts). The host is a plain <button>; core paints the goo body under the label.

import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cancelRender, continueRender, delayRender, getInputProps, getRemotionEnvironment } from 'remotion'
import { GOOP_OVERLAY_ATTR, gooCanvasBackend, liveParticleCount } from '@goopui/core'
import { GooReplayer, type GooScript } from './goo/replay'
import { DYNAPUFF, fontsReady } from './fonts'
import { BTN, SIZE } from './timeline'

/**
 * Remotion first mounts the composition in an off-screen portal (position:fixed,
 * top:-999999px) and moves it into the visible canvas in a parent effect. Core works in client
 * coordinates (the escape overlay is a fixed, viewport-sized layer), so wait for the move.
 */
async function placed(el: HTMLElement | null): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (el && el.getBoundingClientRect().top > -100_000) return
    await new Promise((r) => setTimeout(r, 5))
  }
  throw new Error('[promo] composition never left the off-screen portal')
}

export interface GooButtonProps {
  script: GooScript
  /** Local scene time (s). */
  t: number
  color: string
  labelColor: string
  /** Extra host styles (e.g. --goop-oil-* vars). Must be stable. */
  hostVars?: Record<string, string>
  /** Element the escape overlay is moved into during renders (layered under the button, above the background). */
  overlaySlot?: React.RefObject<HTMLDivElement | null>
}

export const GooButton: React.FC<GooButtonProps> = ({ script, t, color, labelColor, hostVars, overlaySlot }) => {
  const stage = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLButtonElement>(null)
  const replayer = useMemo(() => new GooReplayer(script), [script])

  // Static: React must not fight core over the host's inline styles.
  const hostStyle = useMemo<CSSProperties>(
    () =>
      ({
        // The demo's .btn.hero-btn box.
        height: BTN.h,
        padding: `0 ${BTN.padX}px`,
        borderRadius: BTN.radius,
        border: 0,
        margin: 0,
        background: 'transparent',
        color: labelColor,
        font: `600 ${BTN.fontSize}px/1 ${DYNAPUFF}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'none',
        outline: 'none',
        '--goop-color': color,
        ...hostVars,
      }) as CSSProperties,
    [color, labelColor, hostVars],
  )

  useLayoutEffect(() => {
    const handle = delayRender(`goo replay t=${t.toFixed(3)}`)
    let done = false
    fontsReady
      .then(() => placed(stage.current))
      .then(() => {
        if (!host.current || !stage.current) throw new Error('goo host not mounted')
        return replayer.show(t, host.current, stage.current, SIZE)
      })
      .then((stats) => {
        if (getInputProps().trace === true) {
          console.log(
            `[goo] t=${t.toFixed(3)} steps=${stats.steps} replay=${stats.ms.toFixed(0)}ms ` +
              `backend=${gooCanvasBackend(document)} particles=${liveParticleCount()} ${JSON.stringify(replayer.inspect())}`,
          )
        }
        // During a render the escape overlay (position:fixed, inset:0 = the composition,
        // since the render viewport IS the composition) is moved into our tree, under the
        // button and the cursor, so goo landing on them never covers the label or the arrow.
        // Skipped in the scaled Studio view, where it stays a fixed page overlay.
        const overlay = document.querySelector<HTMLElement>(`[${GOOP_OVERLAY_ATTR}]`)
        if (overlay && overlaySlot?.current && getRemotionEnvironment().isRendering) {
          overlay.style.zIndex = '0'
          overlaySlot.current.append(overlay)
        }
        done = true
        continueRender(handle)
      })
      .catch((err) => cancelRender(err))
    return () => {
      if (!done) continueRender(handle)
    }
  }, [t, replayer, overlaySlot])

  useEffect(() => () => void replayer.dispose(), [replayer])

  return (
    <div ref={stage} style={{ position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE }}>
      {/* Centering row: the host itself stays position:static, as in the demo. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: BTN.cy - BTN.h / 2,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button ref={host} style={hostStyle} tabIndex={-1}>
          {/* Label rides the goo body (core's default labelRide). */}
          <span data-goop-label="" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Get started
          </span>
        </button>
      </div>
    </div>
  )
}
