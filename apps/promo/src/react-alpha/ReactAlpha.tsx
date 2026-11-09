// goopUI for React, alpha: a ~16 s 16:9 X clip. The launch clip's look (lava lamp, live
// puddle logo, dark theme, captions, cursor, dip cuts) around three beats of the React port's
// overlays: Dialog (new beat, react-alpha/dialog.ts), Select and Drawer (the launch clip's
// beats). Every goo scene is plain shadcn markup with @goopui/core on the replay clock
// (goo/scene.ts), so each frame is a pure function of its number. Authored at 640 x 360 CSS px,
// rendered at 3x = 1920 x 1080.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Cursor } from '../Cursor'
import { DYNAPUFF, GEIST, GEIST_MONO } from '../fonts'
import { cursorPath, ease } from '../goo/path'
import { SceneStage } from '../v7/SceneStage'
import { LOGO_ASPECT } from '../sneak/logo'
import { launchLogo } from '../launch/brand'
import { LAVA_DESKTOP, LAVA_OPEN, LavaLamp } from '../launch/LavaLamp'
import { drawerBeat, selectBeat } from '../launch/scenes'
import { DARK, H, W } from '../launch/theme'
import { dialogBeat } from './dialog'
import { reactAlphaCss } from './theme'

export const REACT_ALPHA_FPS = 60

type Script = typeof drawerBeat
type Seg =
  | { kind: 'open'; from: number; to: number }
  | { kind: 'scene'; from: number; to: number; id: string; script: Script; name: string }
  | { kind: 'end'; from: number; to: number }

export const SEGMENTS: Seg[] = [
  { kind: 'open', from: 0, to: 3.0 },
  { kind: 'scene', from: 3.0, to: 6.4, id: 'dialog', script: dialogBeat, name: 'Dialog' },
  { kind: 'scene', from: 6.4, to: 9.1, id: 'select', script: selectBeat, name: 'Select' },
  { kind: 'scene', from: 9.1, to: 11.7, id: 'drawer', script: drawerBeat, name: 'Drawer' },
  { kind: 'end', from: 11.7, to: 15.9 },
]
export const REACT_ALPHA_DURATION = 15.9

/** Lamp time: the site's lamp starts at 24 s and drifts at 1x; the clip runs it 3.5x. */
const lampTime = (t: number) => 24 + t * 3.5

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const CSS = reactAlphaCss()

const openLogo = launchLogo({ slot: 'open', seed: 61, at: 0.22 })
const endLogo = launchLogo({ slot: 'end', seed: 62, at: 0.05 })

export const ReactAlpha: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const idx = SEGMENTS.findIndex((s) => t >= s.from && t < s.to)
  const seg = SEGMENTS[idx >= 0 ? idx : SEGMENTS.length - 1]!
  const lt = t - seg.from
  const dur = seg.to - seg.from

  // Dip through the page colour at every cut (the goo scenes can't overlap).
  const dipIn = interpolate(lt, [0, 0.14], [1, 0], clamp)
  const dipOut = seg.kind === 'end' ? 0 : interpolate(lt, [dur - 0.16, dur], [0, 1], clamp)
  const dip = Math.max(seg.kind === 'open' ? 0 : dipIn, dipOut)

  return (
    <AbsoluteFill className="lc" style={{ background: DARK.bg, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
        {seg.kind === 'open' && <Open t={lt} dur={dur} />}
        {seg.kind === 'scene' && (
          <>
            <AbsoluteFill style={{ background: `radial-gradient(70% 70% at 50% 50%, #171411 0%, ${DARK.bg} 75%)` }} />
            <SceneStage key={seg.id} script={seg.script} t={lt} className="lc" width={W} height={H} />
            <Caption name={seg.name} t={lt} to={dur - 0.3} />
            <Cursor path={seg.script.cursor} clicks={seg.script.clicks} t={lt} ring={DARK.fg} w={W} h={H} trail={false} />
          </>
        )}
        {seg.kind === 'end' && <End t={lt} />}
        {dip > 0 && <AbsoluteFill style={{ background: DARK.bg, opacity: dip }} />}
      </div>
    </AbsoluteFill>
  )
}

// ---- bits --------------------------------------------------------------------------------------

const pop = (t: number, at: number, fps: number, config = { damping: 13, stiffness: 170, mass: 0.7 }) =>
  spring({ frame: (t - at) * fps, fps, config })

/** Rise-in for copy: [opacity, translateY]. */
function useRise(t: number, at: number, dist = 10): React.CSSProperties {
  const { fps } = useVideoConfig()
  const s = pop(t, at, fps, { damping: 15, stiffness: 150, mass: 0.9 })
  return { opacity: Math.min(1, s * 1.25), transform: `translateY(${((1 - s) * dist).toFixed(2)}px)` }
}

function LogoSlot({ slot, height }: { slot: string; height: number }) {
  return <div data-logo-slot={slot} style={{ width: height * LOGO_ASPECT, height, flexShrink: 0 }} />
}

/** The landing's status pill, reworded: "alpha · in development". */
function AlphaPill({ size = 1 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8 * size,
        height: 26 * size,
        padding: `0 ${12 * size}px 0 ${10 * size}px`,
        borderRadius: 999,
        font: `500 ${12 * size}px/1 ${GEIST}`,
        color: DARK.mutedFg,
        background: 'rgb(23 20 18 / 0.7)',
        boxShadow: `inset 0 0 0 1px ${DARK.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7 * size, height: 7 * size, borderRadius: 99, background: DARK.slime, boxShadow: `0 0 0 ${3 * size}px rgb(31 166 74 / 0.22)` }} />
      <span style={{ font: `500 ${11 * size}px/1 ${GEIST_MONO}`, letterSpacing: '0.03em', color: DARK.fg }}>alpha</span>
      <span style={{ color: DARK.subtle }}>·</span>
      <span>In development</span>
    </div>
  )
}

function Caption({ name, t, to }: { name: string; t: number; to: number }) {
  const { fps } = useVideoConfig()
  const s = pop(t, 0.1, fps, { damping: 14, stiffness: 190, mass: 0.6 })
  const out = interpolate(t, [to, to + 0.2], [1, 0], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        left: 30,
        top: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: Math.min(s * 1.2, out),
        transform: `translateY(${((1 - s) * -10).toFixed(2)}px)`,
      }}
    >
      <span
        style={{
          padding: '5px 8px 4px',
          borderRadius: 999,
          background: DARK.slime,
          color: DARK.gooFg,
          font: `600 11px/1 ${GEIST}`,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        React
      </span>
      <span style={{ font: `600 28px/1 ${DYNAPUFF}`, letterSpacing: '-0.01em', color: DARK.fg }}>{name}</span>
    </div>
  )
}

/** `import { GoopDialog } from '@goopui/react'`, editor-coloured. */
function CodeLine({ style }: { style?: React.CSSProperties }) {
  const kw = '#c792ea'
  const str = DARK.gooInk
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 30,
        padding: '0 12px',
        borderRadius: 8,
        background: 'rgb(23 20 18 / 0.85)',
        boxShadow: `inset 0 0 0 1px ${DARK.border}`,
        font: `400 12.5px/1 ${GEIST_MONO}`,
        color: DARK.fg,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      <span style={{ color: kw }}>import</span>
      {' { GoopDialog } '}
      <span style={{ color: kw }}>from</span>
      {/* A whitespace-only run between flex items is dropped: the space rides in the span. */}
      <span style={{ color: str }}>{" '@goopui/react'"}</span>
    </div>
  )
}

// ---- open: the lamp swells in, the puddle logo melts in, "for React" -----------------------

function Open({ t, dur }: { t: number; dur: number }) {
  const grow = interpolate(t, [0, 1.1], [0.15, 1], { ...clamp, easing: ease.outCubic }) * interpolate(t, [dur - 0.55, dur - 0.05], [1, 0.05], { ...clamp, easing: ease.inCubic })
  const lampO = interpolate(t, [0, 0.5], [0, 1], clamp)
  const line = useRise(t, 0.75)
  const pill = useRise(t, 1.05)
  return (
    <>
      <LavaLamp time={lampTime(t)} blobs={LAVA_OPEN} width={W} height={H} grow={grow} style={{ opacity: lampO }} />
      <AbsoluteFill style={{ background: `radial-gradient(42% 46% at 50% 50%, ${DARK.bg} 0%, rgb(16 14 12 / 0.85) 45%, transparent 100%)` }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: -4 }}>
          <LogoSlot slot="open" height={58} />
          {/* The logo above reads "goopUI": together, "goopUI for React". */}
          <div style={{ font: `600 34px/1 ${DYNAPUFF}`, letterSpacing: '-0.01em', color: DARK.fg, ...line }}>
            for <span style={{ color: DARK.gooInk }}>React</span>
          </div>
          <div style={pill}>
            <AlphaPill />
          </div>
        </div>
      </AbsoluteFill>
      <SceneStage key="open-logo" script={openLogo} t={t} className="lc" width={W} height={H} />
    </>
  )
}

// ---- end card ---------------------------------------------------------------------------------

const END_CURSOR = cursorPath(
  { x: 690, y: 330 },
  1.25,
  [
    { t0: 1.3, t1: 2.2, via: { x: 560, y: 300 }, to: { x: 480, y: 196 }, ease: ease.outCubic },
    { t0: 2.3, t1: 3.3, via: { x: 530, y: 120 }, to: { x: 565, y: 150 }, ease: ease.inOutSine },
  ],
  0.6,
)

function End({ t }: { t: number }) {
  const grow = interpolate(t, [0, 1.0], [0.1, 1], { ...clamp, easing: ease.outCubic })
  // The cursor's mound trails the cursor a little (the site eases it in).
  const p = END_CURSOR.at(Math.max(0, t - 0.08))
  const ps = interpolate(t, [1.35, 1.9], [0, 1], clamp)
  const header = useRise(t, 0.05, 6)
  const pill = useRise(t, 0.15)
  const head = useRise(t, 0.25, 14)
  const meta = useRise(t, 0.4)
  const code = useRise(t, 0.5)
  const cta = useRise(t, 0.62)
  return (
    <>
      <LavaLamp time={lampTime(11.7 + t)} blobs={LAVA_DESKTOP} width={W} height={H} grow={grow} pointer={p ? { x: p.x, y: p.y, s: ps } : undefined} />
      {/* LavaLamp.vue's veil: the page colour washes over the lamp behind the copy. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${DARK.bg} 0%, transparent 16%), linear-gradient(100deg, ${DARK.bg} 0%, rgb(16 14 12 / 0.82) 34%, rgb(16 14 12 / 0.3) 56%, transparent 70%)`,
        }}
      />
      <div style={{ position: 'absolute', left: 30, top: 20, display: 'flex', alignItems: 'center', ...header }}>
        <LogoSlot slot="end" height={22} />
      </div>
      <div style={{ position: 'absolute', left: 40, top: 62, width: 440 }}>
        <div style={pill}>
          <AlphaPill />
        </div>
        <div style={{ marginTop: 14, font: `600 50px/0.95 ${DYNAPUFF}`, letterSpacing: '-0.02em', color: DARK.fg, ...head }}>
          goopUI
          <br />
          for <span style={{ color: DARK.gooInk }}>React</span>.
        </div>
        <div style={{ marginTop: 14, font: `500 11px/1 ${GEIST_MONO}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: DARK.subtle, ...meta }}>
          <span style={{ color: DARK.mutedFg, textTransform: 'none', letterSpacing: '0.02em' }}>@goopui/react</span> <span style={{ opacity: 0.7 }}>·</span> shadcn + Radix
        </div>
        <CodeLine style={{ marginTop: 12, ...code }} />
        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', ...cta }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: '0 18px',
              borderRadius: 10,
              background: DARK.slime,
              color: DARK.gooFg,
              font: `600 15px/1 ${GEIST}`,
              whiteSpace: 'nowrap',
            }}
          >
            goop.timmcmasters.work
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      <SceneStage key="end-logo" script={endLogo} t={t} className="lc" width={W} height={H} />
      <Cursor path={END_CURSOR} clicks={[]} t={t} ring={DARK.fg} w={W} h={H} trail={false} />
    </>
  )
}
