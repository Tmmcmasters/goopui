import { Composition } from 'remotion'
import { Promo } from './Promo'
import { DURATION, FPS, SIZE } from './timeline'
import { PromoV7 } from './v7/PromoV7'
import { V7_DURATION } from './v7/timeline'
import { SNEAK_DURATION, SNEAK_FPS, SneakPeek } from './sneak/SneakPeek'
import { LAUNCH_DURATION, LAUNCH_FPS, LaunchClip } from './launch/LaunchClip'
import { H as LAUNCH_H, W as LAUNCH_W } from './launch/theme'
import { REACT_ALPHA_DURATION, REACT_ALPHA_FPS, ReactAlpha } from './react-alpha/ReactAlpha'

export const Root: React.FC = () => (
  <>
    <Composition
      id="GoopPromo"
      component={Promo}
      durationInFrames={Math.round(DURATION * FPS)}
      fps={FPS}
      // Authored at real component size; rendered at --scale (remotion.config.ts) to 1080.
      width={SIZE}
      height={SIZE}
    />
    <Composition
      id="GoopPromoV7"
      component={PromoV7}
      durationInFrames={Math.round(V7_DURATION * FPS)}
      fps={FPS}
      width={SIZE}
      height={SIZE}
    />
    <Composition
      id="SneakPeek"
      component={SneakPeek}
      durationInFrames={Math.round(SNEAK_DURATION * SNEAK_FPS)}
      fps={SNEAK_FPS}
      width={SIZE}
      height={SIZE}
    />
    <Composition
      id="LaunchClip"
      component={LaunchClip}
      durationInFrames={Math.round(LAUNCH_DURATION * LAUNCH_FPS)}
      fps={LAUNCH_FPS}
      // 16:9, authored at 640 x 360 CSS px and rendered with --scale=3 to 1920 x 1080.
      width={LAUNCH_W}
      height={LAUNCH_H}
    />
    <Composition
      id="ReactAlpha"
      component={ReactAlpha}
      durationInFrames={Math.round(REACT_ALPHA_DURATION * REACT_ALPHA_FPS)}
      fps={REACT_ALPHA_FPS}
      // Same frame as LaunchClip: 640 x 360 CSS px, rendered with --scale=3 to 1920 x 1080.
      width={LAUNCH_W}
      height={LAUNCH_H}
    />
  </>
)
