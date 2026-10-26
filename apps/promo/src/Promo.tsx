import { useRef } from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import { Cursor } from './Cursor'
import { DYNAPUFF, GEIST } from './fonts'
import { GooButton } from './GooButton'
import { BTN, CAPTIONS, COLORS, T, cursorA, cursorB, scriptA, scriptB, SIZE } from './timeline'

const clamp01 = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

// Stable host vars for the oil button (GooButton expects a stable object).
const OIL_VARS = { '--goop-oil-intensity': '1', '--goop-oil-scale': '0.9', '--goop-oil-shift': '0.1' }

export const Promo: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps
  const overlaySlot = useRef<HTMLDivElement>(null)

  const inA = t < T.aEnd
  const inB = t >= T.b && t < T.bEnd
  const onPaper = t >= T.b
  const bt = t - T.b

  // Scene B: the button pops in under the curtain, then fades for the end card.
  const pop = spring({ frame: Math.max(0, bt * fps), fps, config: { damping: 11, stiffness: 170, mass: 0.7 } })
  const bOut = interpolate(t, [T.bEnd - 0.2, T.bEnd], [1, 0], { ...clamp01, easing: Easing.in(Easing.quad) })

  return (
    <AbsoluteFill style={{ background: onPaper ? COLORS.paper : COLORS.night, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: onPaper
            ? `radial-gradient(60% 55% at 50% 48%, #fbf8f1 0%, ${COLORS.paper} 72%)`
            : `radial-gradient(60% 55% at 50% 48%, #18201b 0%, ${COLORS.night} 70%)`,
        }}
      />
      {/* The escape overlay (splash flying across the frame) lands here during renders:
          under the button, so goo landing on it never covers the label. */}
      <div ref={overlaySlot} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      {inA && (
        <GooButton script={scriptA} t={t} color={COLORS.slime} labelColor={COLORS.ink} overlaySlot={overlaySlot} />
      )}
      {inB && (
        <AbsoluteFill
          style={{
            opacity: bOut,
            transform: `scale(${(0.4 + 0.6 * pop) * (0.94 + 0.06 * bOut)})`,
            transformOrigin: `50% ${(BTN.cy / SIZE) * 100}%`,
          }}
        >
          <GooButton
            script={scriptB}
            t={bt}
            color="#111113"
            labelColor="#fafafa"
            hostVars={OIL_VARS}
            overlaySlot={overlaySlot}
          />
        </AbsoluteFill>
      )}

      {t >= T.curtain[0] && t < T.curtain[1] + 0.05 && <Curtain t={t} />}

      <Captions t={t} />
      {t >= T.cardIn && <EndCard t={t - T.cardIn} />}
      <Watermark t={t} onPaper={onPaper} />

      {inA && <Cursor path={cursorA} clicks={scriptA.clicks} t={t} ring="#f4f4f0" />}
      {inB && <Cursor path={cursorB} clicks={scriptB.clicks} t={bt} ring={COLORS.ink} opacity={bOut} />}
    </AbsoluteFill>
  )
}

// ---- curtain: a paper sheet with a dripping edge falls over the dark scene ------------------

const CURTAIN_DRIPS = [
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

function Curtain({ t }: { t: number }) {
  const [a, b] = T.curtain
  const u = interpolate(t, [a, b], [0, 1], { ...clamp01, easing: Easing.in(Easing.quad) })
  // Edge travels from above the frame to past the bottom (drips lead it).
  const edge = interpolate(u, [0, 1], [-130, SIZE + 30])
  const grow = 0.55 + 0.45 * u
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id="curtain-goo" x="-10%" y="-10%" width="120%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
        </filter>
      </defs>
      <g filter="url(#curtain-goo)" fill={COLORS.paper}>
        <rect x={-40} y={-800} width={SIZE + 80} height={800 + edge} />
        {CURTAIN_DRIPS.map((d, i) => {
          const len = d.len * grow
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

// ---- captions ---------------------------------------------------------------------------

function Captions({ t }: { t: number }) {
  const { fps } = useVideoConfig()
  return (
    <>
      {CAPTIONS.map((c) => {
        if (t < c.from - 0.01 || t > c.to + 0.3) return null
        const inS = spring({ frame: (t - c.from) * fps, fps, config: { damping: 13, stiffness: 190, mass: 0.6 } })
        const out = interpolate(t, [c.to, c.to + 0.22], [1, 0], clamp01)
        return (
          <div
            key={c.text}
            style={{
              position: 'absolute',
              top: 58,
              left: 0,
              right: 0,
              textAlign: 'center',
              font: `600 32px/1 ${DYNAPUFF}`,
              letterSpacing: '0.01em',
              color: c.dark ? COLORS.chalk : COLORS.ink,
              opacity: Math.min(inS, out),
              transform: `translateY(${(1 - inS) * -14 + (1 - out) * 6}px) scale(${0.92 + 0.08 * inS})`,
            }}
          >
            {c.text}
          </div>
        )
      })}
    </>
  )
}

// ---- watermark + end card -----------------------------------------------------------------

function Watermark({ t, onPaper }: { t: number; onPaper: boolean }) {
  const o = interpolate(t, [0, 0.4, T.cardIn - 0.1, T.cardIn + 0.1], [0, 0.55, 0.55, 0], clamp01)
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
        color: onPaper ? COLORS.ink : COLORS.chalk,
        opacity: o,
      }}
    >
      goopUI
    </div>
  )
}

function EndCard({ t }: { t: number }) {
  const { fps } = useVideoConfig()
  const logo = spring({ frame: (t - 0.12) * fps, fps, config: { damping: 10, stiffness: 150, mass: 0.8 } })
  const tag = spring({ frame: (t - 0.42) * fps, fps, config: { damping: 14, stiffness: 160 } })
  const small = interpolate(t, [0.7, 1.0], [0, 1], clamp01)
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -16 }}>
        <Img
          src={staticFile('lockup.svg')}
          style={{
            width: 318,
            opacity: Math.min(1, logo * 1.4),
            transform: `translateY(${(1 - logo) * 18}px) scale(${0.7 + 0.3 * logo})`,
          }}
        />
        <div
          style={{
            marginTop: 34,
            font: `600 33px/1.1 ${DYNAPUFF}`,
            color: COLORS.ink,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 12}px)`,
          }}
        >
          Components that drip.
        </div>
        <div
          style={{
            marginTop: 18,
            font: `500 16px/1.2 ${GEIST}`,
            letterSpacing: '0.01em',
            color: '#57534e',
            opacity: small,
          }}
        >
          goopUI · Vue &amp; Nuxt · coming soon
        </div>
      </div>
    </AbsoluteFill>
  )
}
