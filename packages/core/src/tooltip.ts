// Tooltip emerge: the popover's emerge engine (`./emerge` + `./emerge-momentum`) scaled down
// for a small surface. Quick, a small bulb and bridge, a light far-edge slosh on open and a
// light suck-back slosh on close. No open drips in the bulb emerge: at tooltip size they read
// as noise (`openDrips` is still available). The bloom flow style (`flow: true, flowStyle:
// 'bloom'`, the same pose as the popover's) gets a light splash instead: a few small drops,
// since a tooltip opens on every hover (TOOLTIP_BLOOM_SPLASH).

import type { GoopPreset } from './constants'
import type { EmergeFeel } from './emerge'
import type { EmergeDripOptions, EmergeMomentumEffects } from './emerge-momentum'

/** Per-preset emerge feel for tooltips. Pass as `attachEmerge(host, { feel: TOOLTIP_FEEL })`. */
export const TOOLTIP_FEEL: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.24, close: 0.15, bulb: 0.24, decay: 8, travel: 0.25, snap: 0.4, softness: 2.5, bloomOpen: 0.28, bloomClose: 0.15, bloomOvershoot: 1 }),
  playful: Object.freeze({ open: 0.32, close: 0.19, bulb: 0.3, decay: 6, travel: 0.55, snap: 0.5, softness: 3, bloomOpen: 0.36, bloomClose: 0.19, bloomOvershoot: 1.8 }),
  wild: Object.freeze({ open: 0.42, close: 0.24, bulb: 0.36, decay: 4.2, travel: 0.9, snap: 0.65, softness: 3.5, bloomOpen: 0.46, bloomClose: 0.24, bloomOvershoot: 2.8 }),
})

/** Default momentum strengths for tooltips (0..2, see EmergeMomentumEffects). */
export const TOOLTIP_MOMENTUM: Readonly<Required<EmergeMomentumEffects>> = Object.freeze({
  openSlosh: 0.4,
  openDrips: false,
  closeSlosh: 0.5,
})

/** Default splash for a blooming tooltip: a few small drops, flung a short way. */
export const TOOLTIP_BLOOM_SPLASH: Readonly<Required<Pick<EmergeMomentumEffects, 'openDrips'>> & Required<Pick<EmergeDripOptions, 'openDripAmount' | 'openDripSize' | 'openDripFling'>>> =
  Object.freeze({
    openDrips: 1,
    openDripAmount: 0.3,
    openDripSize: 0.6,
    openDripFling: 0.6,
  })
