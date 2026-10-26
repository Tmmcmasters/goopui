// Remotion CLI config for the goopUI promo.
// See src/goo/replay.ts for how the goo is made frame-exact.
import { Config } from '@remotion/cli/config'

// The composition is authored at 480x480 CSS px (real component size, so the engine's
// px-based physics look exactly like they do on a web page) and rendered at 2.25x device
// pixels = 1080x1080. The canvas goo renderer reads devicePixelRatio, so it stays crisp.
Config.setScale(2.25)

// The goo canvas renderer + oil finish use WebGL2. ANGLE (Metal on macOS) gives the
// headless browser a real GPU backend; `swangle` (SwiftShader) also works, slower.
Config.setChromiumOpenGlRenderer('angle')

// X/Twitter: H.264, yuv420p, <= 60 fps, <= 512 MB.
Config.setCodec('h264')
Config.setPixelFormat('yuv420p')
Config.setCrf(16)
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(95)
Config.setOverwriteOutput(true)
// Away from 3000 (the Nuxt playground's default) so the renderer never talks to it.
Config.setPort(3417)
// Each frame replays the timeline from t=0, so late frames take a while.
Config.setDelayRenderTimeoutInMilliseconds(120_000)
