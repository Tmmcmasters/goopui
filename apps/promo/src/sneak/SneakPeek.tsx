// goopUI sneak peek: a ~20s square teaser for the coming-soon page (goop.timmcmasters.work).
// Logo hook -> one beat per sneak-peek component (button, switch, slider, tooltip) -> all four
// in the page's grid -> end card. Every component is @goopui/core on the replay clock (see
// goo/scene.ts), cut together with v7's dripping slime curtains. Light theme like the page.

import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Cursor } from '../Cursor'
import { DYNAPUFF, GEIST } from '../fonts'
import { SIZE } from '../timeline'
import { SceneStage } from '../v7/SceneStage'
import { themeCss } from '../v7/theme'
import { SOON } from './parts'
import { buttonBeat, gridBeat, sliderBeat, switchBeat, tooltipBeat } from './scenes'

export const SNEAK_FPS = 30

type Seg =
  | { kind: 'open'; from: number; to: number }
  | { kind: 'scene'; from: number; to: number; id: string; script: (typeof SCENES)[number]; caption: string }
  | { kind: 'end'; from: number; to: number }

const SCENES = [buttonBeat, switchBeat, sliderBeat, tooltipBeat, gridBeat] as const

export const SEGMENTS: Seg[] = [
  { kind: 'open', from: 0, to: 2 },
  { kind: 'scene', from: 2, to: 5, id: 'button', script: buttonBeat, caption: 'Poke it.' },
  { kind: 'scene', from: 5, to: 8, id: 'switch', script: switchBeat, caption: 'Flip it.' },
  { kind: 'scene', from: 8, to: 11, id: 'slider', script: sliderBeat, caption: 'Slosh it.' },
  { kind: 'scene', from: 11, to: 14, id: 'tooltip', script: tooltipBeat, caption: 'Hover it.' },
  { kind: 'scene', from: 14, to: 17.2, id: 'grid', script: gridBeat, caption: 'Poke them yourself.' },
  { kind: 'end', from: 17.2, to: 20 },
]
export const SNEAK_DURATION = 20

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

const CSS =
  themeCss() +
  `
.v7-soon {
  --background: ${SOON.bg}; --foreground: ${SOON.ink};
  --primary: ${SOON.slime}; --primary-foreground: ${SOON.slimeFg};
  --input: ${SOON.input}; --muted: ${SOON.muted}; --muted-foreground: ${SOON.mutedFg};
  --popover: ${SOON.card}; --popover-foreground: ${SOON.ink};
  --accent: ${SOON.muted}; --accent-foreground: ${SOON.ink};
  --border: ${SOON.border}; --ring: ${SOON.ink};
  color: var(--foreground);
}
.v7-soon .switch { --goop-switch-thumb: #ffffff; }
.v7 .peek { background: ${SOON.card}; border: 1px solid ${SOON.border}; box-shadow: 0 1px 2px rgb(40 30 10 / 0.04), 0 8px 24px -12px rgb(40 30 10 / 0.12); }
.v7 .peek-hint { color: ${SOON.mutedFg}; }
.v7 [data-goop-host='stroke'][data-goop-active]::after {
  content: ''; position: absolute; inset: 1px; z-index: -1; border-radius: inherit; pointer-events: none;
  background: var(--goop-fill, ${SOON.card});
  transform: translate(var(--goop-x, 0px), var(--goop-y, 0px)) skewX(var(--goop-skew, 0deg)) scale(var(--goop-sx, 1), var(--goop-sy, 1));
}
.v7 [data-goop-host='stroke'] > [data-goop-label] { position: relative; z-index: 1; }
`

/** Curtain timing for the cut that ends at `at`: the slime sheet leads, the background follows. */
const SLIME_CURTAIN = (at: number): [number, number] => [at - 0.5, at - 0.1]
const BG_CURTAIN = (at: number): [number, number] => [at - 0.36, at]

export const SneakPeek: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  const idx = SEGMENTS.findIndex((s) => t >= s.from && t < s.to)
  const seg = SEGMENTS[idx >= 0 ? idx : SEGMENTS.length - 1]!
  const lt = t - seg.from
  const cutAt = seg.kind === 'end' ? null : seg.to

  return (
    <AbsoluteFill style={{ background: SOON.bg, overflow: 'hidden', pointerEvents: 'none' }}>
      <style>{CSS}</style>
      <AbsoluteFill style={{ background: `radial-gradient(70% 60% at 50% 45%, #ffffff 0%, ${SOON.bg} 75%)` }} />
      {seg.kind === 'open' && <Open t={lt} />}
      {seg.kind === 'scene' && (
        <>
          <SceneStage key={seg.id} script={seg.script} t={lt} className="v7 v7-soon" />
          <Caption text={seg.caption} t={lt} from={0.12} to={seg.to - seg.from - 0.55} />
          <Cursor path={seg.script.cursor} clicks={seg.script.clicks} t={lt} ring={SOON.ink} />
          <Url t={lt} />
        </>
      )}
      {seg.kind === 'end' && <End t={lt} />}
      {cutAt !== null && t >= SLIME_CURTAIN(cutAt)[0] && (
        <>
          <Curtain t={t} span={SLIME_CURTAIN(cutAt)} color={SOON.slime} seed={idx * 3 + 1} />
          <Curtain t={t} span={BG_CURTAIN(cutAt)} color={SOON.bg} seed={idx * 3 + 2} />
        </>
      )}
    </AbsoluteFill>
  )
}

// ---- curtain (v7's): a sheet with a dripping edge falls over the frame ------------------------

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
  const id = `sneak-curtain-${seed}`
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

// ---- text bits --------------------------------------------------------------------------------

const pop = (t: number, at: number, fps: number, config = { damping: 12, stiffness: 170, mass: 0.7 }) =>
  spring({ frame: (t - at) * fps, fps, config })

function Caption({ text, t, from, to }: { text: string; t: number; from: number; to: number }) {
  const { fps } = useVideoConfig()
  if (t < from - 0.01 || t > to + 0.3) return null
  const inS = pop(t, from, fps, { damping: 13, stiffness: 190, mass: 0.6 })
  const out = interpolate(t, [to, to + 0.22], [1, 0], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        top: 56,
        left: 0,
        right: 0,
        textAlign: 'center',
        font: `600 40px/1 ${DYNAPUFF}`,
        letterSpacing: '-0.01em',
        color: SOON.ink,
        opacity: Math.min(inS, out),
        transform: `translateY(${(1 - inS) * -14 + (1 - out) * 6}px) scale(${0.92 + 0.08 * inS})`,
      }}
    >
      {text}
    </div>
  )
}

function Url({ t }: { t: number }) {
  const o = interpolate(t, [0.1, 0.4], [0, 0.6], clamp)
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        textAlign: 'center',
        font: `500 15px/1 ${GEIST}`,
        letterSpacing: '0.01em',
        color: SOON.ink,
        opacity: o,
      }}
    >
      goop.timmcmasters.work
    </div>
  )
}

function Pill({ t, at }: { t: number; at: number }) {
  const { fps } = useVideoConfig()
  const s = pop(t, at, fps)
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 15px',
        borderRadius: 999,
        background: SOON.slime,
        color: SOON.slimeFg,
        font: `500 16px/1 ${GEIST}`,
        opacity: Math.min(1, s * 1.3),
        transform: `translateY(${(1 - s) * 10}px) scale(${0.85 + 0.15 * s})`,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 99, background: SOON.slimeFg }} />
      Coming soon
    </div>
  )
}

function Logo({ t, at, width }: { t: number; at: number; width: number }) {
  const { fps } = useVideoConfig()
  const s = pop(t, at, fps, { damping: 10, stiffness: 150, mass: 0.8 })
  return (
    <Img
      src={staticFile('lockup.svg')}
      style={{ width, opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 18}px) scale(${0.7 + 0.3 * s})` }}
    />
  )
}

function Headline({ t, at, size }: { t: number; at: number; size: number }) {
  const { fps } = useVideoConfig()
  const s = pop(t, at, fps, { damping: 14, stiffness: 160, mass: 1 })
  return (
    <div
      style={{
        font: `600 ${size}px/0.95 ${DYNAPUFF}`,
        letterSpacing: '-0.02em',
        color: SOON.ink,
        textAlign: 'center',
        opacity: s,
        transform: `translateY(${(1 - s) * 14}px)`,
      }}
    >
      Components
      <br />
      that drip.
    </div>
  )
}

/** Hook: logo, the page's headline, the "Coming soon" pill. */
function Open({ t }: { t: number }) {
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, marginTop: -6 }}>
        <Logo t={t} at={0.05} width={190} />
        <Headline t={t} at={0.35} size={62} />
        <Pill t={t} at={0.75} />
      </div>
    </AbsoluteFill>
  )
}

/** End card: logo, headline, "Coming soon", the URL; held ~3s. */
function End({ t }: { t: number }) {
  const { fps } = useVideoConfig()
  const url = pop(t, 0.85, fps, { damping: 13, stiffness: 160, mass: 0.7 })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -8 }}>
        <Logo t={t} at={0.08} width={260} />
        <div style={{ height: 30 }} />
        <Headline t={t} at={0.32} size={44} />
        <div style={{ height: 28 }} />
        <Pill t={t} at={0.6} />
        <div
          style={{
            marginTop: 18,
            font: `600 24px/1 ${DYNAPUFF}`,
            letterSpacing: '-0.005em',
            color: SOON.gooInk,
            opacity: Math.min(1, url * 1.3),
            transform: `translateY(${(1 - url) * 10}px)`,
          }}
        >
          goop.timmcmasters.work
        </div>
      </div>
    </AbsoluteFill>
  )
}

export const SNEAK_SCENES = SCENES
