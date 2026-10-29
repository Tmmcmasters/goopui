import { Composition } from 'remotion'
import { Promo } from './Promo'
import { DURATION, FPS, SIZE } from './timeline'
import { PromoV7 } from './v7/PromoV7'
import { V7_DURATION } from './v7/timeline'
import { SNEAK_DURATION, SNEAK_FPS, SneakPeek } from './sneak/SneakPeek'

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
  </>
)
