// v7 montage script: scene windows (global seconds), backgrounds, captions.
// 480 x 480 composition rendered at 2.25x (1080 x 1080), 60 fps, like v6.

import type { CursorPath } from '../goo/path'
import type { Click } from '../goo/replay'
import type { SceneRuntime, SceneScript } from '../goo/scene'
import { buttonScene } from './scenes/button'
import { spinnerScene } from './scenes/spinner'
import { switchScene } from './scenes/switch'
import { emergeScene } from './scenes/emerge'
import { toastScene } from './scenes/toast'
import { formScene } from './scenes/form'

export const V7_DURATION = 28

export type Bg = 'night' | 'paper'

export interface SceneDef {
  id: string
  from: number
  to: number
  bg: Bg
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  script: SceneScript<any> & { cursor: CursorPath; clicks: readonly Click[] }
  captions: { text: string; from: number; to: number }[]
}

/** Each cut: a slime curtain drips down, the next scene's background follows right behind it. */
export const CUT = 0.5

export const SCENES: SceneDef[] = [
  { id: 'button', from: 0, to: 4, bg: 'night', script: buttonScene, captions: [{ text: 'button', from: 0.35, to: 3.3 }] },
  { id: 'spinner', from: 4, to: 8, bg: 'paper', script: spinnerScene, captions: [{ text: 'spinner', from: 0.3, to: 3.3 }] },
  { id: 'switch', from: 8, to: 12, bg: 'night', script: switchScene, captions: [{ text: 'switch', from: 0.3, to: 3.3 }] },
  {
    id: 'emerge',
    from: 12,
    to: 16,
    bg: 'paper',
    script: emergeScene,
    captions: [
      { text: 'popover', from: 0.3, to: 1.85 },
      { text: 'dropdown menu', from: 2.05, to: 3.3 },
    ],
  },
  { id: 'toast', from: 16, to: 20, bg: 'night', script: toastScene, captions: [{ text: 'toast', from: 0.3, to: 3.3 }] },
  {
    id: 'form',
    from: 20,
    to: 24,
    bg: 'paper',
    script: formScene,
    captions: [
      { text: 'slider', from: 0.3, to: 1.05 },
      { text: 'progress', from: 1.15, to: 1.72 },
      { text: 'checkbox', from: 1.82, to: 2.32 },
      { text: 'radio group', from: 2.42, to: 3.3 },
    ],
  },
]

export const CARD_AT = 24

// Silence unused-type lint in editors.
export type { SceneRuntime }
