import { Composition } from 'remotion'
import { Promo } from './Promo'
import { DURATION, FPS, SIZE } from './timeline'

export const Root: React.FC = () => (
  <Composition
    id="GoopPromo"
    component={Promo}
    durationInFrames={Math.round(DURATION * FPS)}
    fps={FPS}
    // Authored at real component size; rendered at --scale (remotion.config.ts) to 1080.
    width={SIZE}
    height={SIZE}
  />
)
