// goopUI v7: a 28s square montage of the v0.1 component set, every component driven by
// @goopui/core on the replay clock (see goo/scene.ts), cut together with dripping curtains.

import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Cursor } from '../Cursor'
import { DYNAPUFF, GEIST } from '../fonts'
import { COLORS, SIZE } from '../timeline'
import { SceneStage } from './SceneStage'
import { themeCss } from './theme'
import { CARD_AT, SCENES, V7_DURATION, type Bg } from './timeline'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const CSS = themeCss()

const bgColor = (bg: Bg): string => (bg === 'night' ? COLORS.night : COLORS.paper)

/** Curtain timing for the cut that ends at `at`: the slime sheet leads, the next background follows. */
const SLIME_CURTAIN = (at: number): [number, number] => [at - 0.5, at - 0.1]
const BG_CURTAIN = (at: number): [number, number] => [at - 0.36, at]

export const PromoV7: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  const idx = SCENES.findIndex((s) => t >= s.from && t < s.to)
  const scene = idx >= 0 ? SCENES[idx]! : null
  const bg: Bg = scene ? scene.bg : 'paper'
  const lt = scene ? t - scene.from : 0
  // The cut out of this scene (into the next one, or the end card).
  const cutAt = scene ? scene.to : null
  const nextBg: Bg = idx >= 0 && idx + 1 < SCENES.length ? SCENES[idx + 1]!.bg : 'paper'

  return (
    <AbsoluteFill style={{ background: bgColor(bg), overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{CSS}</style>
      <AbsoluteFill
        style={{
          background:
            bg === 'paper'
              ? `radial-gradient(60% 55% at 50% 48%, #fbf8f1 0%, ${COLORS.paper} 72%)`
              : `radial-gradient(60% 55% at 50% 48%, #18201b 0%, ${COLORS.night} 70%)`,
        }}
      />
      {scene && (
        <SceneStage key={scene.id} script={scene.script} t={lt} className={`v7 v7-${scene.bg}`} />
      )}
      {scene && scene.captions.map((c) => <Caption key={c.text} text={c.text} t={lt} from={c.from} to={c.to} dark={bg === 'night'} />)}
      {scene && (
        <Cursor path={scene.script.cursor} clicks={scene.script.clicks} t={lt} ring={bg === 'night' ? COLORS.chalk : COLORS.ink} />
      )}
      {t >= CARD_AT && <EndCard t={t - CARD_AT} />}
      <Watermark t={t} dark={bg === 'night'} />
      {cutAt !== null && t >= SLIME_CURTAIN(cutAt)[0] && (
        <>
          <Curtain t={t} span={SLIME_CURTAIN(cutAt)} color={COLORS.slime} seed={idx * 3 + 1} />
          <Curtain t={t} span={BG_CURTAIN(cutAt)} color={bgColor(nextBg)} seed={idx * 3 + 2} />
        </>
      )}
    </AbsoluteFill>
  )
}

export const V7_FRAMES = (fps: number): number => Math.round(V7_DURATION * fps)

// ---- curtain: a sheet with a dripping edge falls over the frame -------------------------------

const DRIPS = [
  { x: 22, w: 26, len: 70 },
  { x: 78, w: 18, len: 36 },
  { x: 128, w: 30, len: 104 },
  { x: 186, w: 16, len: 44 },
  { x: 236, w: 24, len: 80 },
  { x: 290, w: 34, len: 120 },
  { x: 345, w: 18, len: 52 },
  { x: 392, w: 28, len: 92 },
  { x: 446, w: 20, len: 58 },
]

function Curtain({ t, span, color, seed }: { t: number; span: [number, number]; color: string; seed: number }) {
  const [a, b] = span
  if (t < a) return null
  const u = interpolate(t, [a, b], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
  const edge = interpolate(u, [0, 1], [-130, SIZE + 30])
  const grow = 0.55 + 0.45 * u
  const id = `curtain-goo-${seed}`
  // Shuffle drip lengths per cut so no two curtains look the same.
  const lens = DRIPS.map((d, i) => d.len * (0.7 + 0.6 * (((i * 7 + seed * 5) % 9) / 8)))
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} fill={color}>
        <rect x={-40} y={-800} width={SIZE + 80} height={800 + edge} />
        {DRIPS.map((d, i) => {
          const len = lens[i]! * grow
          return (
            <g key={i}>
              <rect x={d.x - d.w / 2} y={edge - 12} width={d.w} height={len + 12} rx={d.w / 2} />
              <circle cx={d.x} cy={edge + len} r={d.w * 0.62} />
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ---- captions / watermark / end card ------------------------------------------------------

function Caption({ text, t, from, to, dark }: { text: string; t: number; from: number; to: number; dark: boolean }) {
  const { fps } = useVideoConfig()
  if (t < from - 0.01 || t > to + 0.3) return null
  const inS = spring({ frame: (t - from) * fps, fps, config: { damping: 13, stiffness: 190, mass: 0.6 } })
  const out = interpolate(t, [to, to + 0.22], [1, 0], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        top: 58,
        left: 0,
        right: 0,
        textAlign: 'center',
        font: `600 32px/1 ${DYNAPUFF}`,
        letterSpacing: '0.01em',
        color: dark ? COLORS.chalk : COLORS.ink,
        opacity: Math.min(inS, out),
        transform: `translateY(${(1 - inS) * -14 + (1 - out) * 6}px) scale(${0.92 + 0.08 * inS})`,
      }}
    >
      {text}
    </div>
  )
}

function Watermark({ t, dark }: { t: number; dark: boolean }) {
  const o = interpolate(t, [0, 0.4, CARD_AT - 0.6, CARD_AT - 0.3], [0, 0.55, 0.55, 0], clamp)
  if (o <= 0) return null
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 26,
        left: 0,
        right: 0,
        textAlign: 'center',
        font: `600 19px/1 ${DYNAPUFF}`,
        color: dark ? COLORS.chalk : COLORS.ink,
        opacity: o,
      }}
    >
      goopUI
    </div>
  )
}

function EndCard({ t }: { t: number }) {
  const { fps } = useVideoConfig()
  const logo = spring({ frame: (t - 0.1) * fps, fps, config: { damping: 10, stiffness: 150, mass: 0.8 } })
  const tag = spring({ frame: (t - 0.42) * fps, fps, config: { damping: 14, stiffness: 160 } })
  const pill = spring({ frame: (t - 0.72) * fps, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } })
  const small = interpolate(t, [1.0, 1.3], [0, 1], clamp)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -10 }}>
        <Img
          src={staticFile('lockup.svg')}
          style={{
            width: 300,
            opacity: Math.min(1, logo * 1.4),
            transform: `translateY(${(1 - logo) * 18}px) scale(${0.7 + 0.3 * logo})`,
          }}
        />
        <div
          style={{
            marginTop: 30,
            font: `600 31px/1.1 ${DYNAPUFF}`,
            color: COLORS.ink,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 12}px)`,
          }}
        >
          shadcn, but it drips.
        </div>
        <div
          style={{
            marginTop: 26,
            padding: '11px 18px',
            borderRadius: 11,
            background: COLORS.ink,
            color: COLORS.chalk,
            font: `500 17px/1 ui-monospace, SFMono-Regular, Menlo, monospace`,
            letterSpacing: '0.01em',
            opacity: Math.min(1, pill * 1.3),
            transform: `translateY(${(1 - pill) * 10}px) scale(${0.85 + 0.15 * pill})`,
          }}
        >
          <span style={{ color: COLORS.slime }}>$</span> npm i @goopui/vue
        </div>
        <div
          style={{
            marginTop: 16,
            font: `500 15px/1.2 ${GEIST}`,
            letterSpacing: '0.01em',
            color: '#57534e',
            opacity: small,
          }}
        >
          Vue · Nuxt &nbsp;·&nbsp; React &amp; Svelte coming
        </div>
      </div>
    </AbsoluteFill>
  )
}
