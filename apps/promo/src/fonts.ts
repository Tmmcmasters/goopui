import { loadFont as loadDynaPuff } from '@remotion/google-fonts/DynaPuff'
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist'

const dyna = loadDynaPuff('normal', { weights: ['600'], subsets: ['latin'] })
const geist = loadGeist('normal', { weights: ['400', '500'], subsets: ['latin'] })

export const DYNAPUFF = dyna.fontFamily
export const GEIST = geist.fontFamily

/** Resolves when both fonts are usable (the goo host is measured at attach time). */
export const fontsReady: Promise<void> = Promise.all([dyna.waitUntilDone(), geist.waitUntilDone()])
  .then(() => document.fonts.ready)
  .then(() => undefined)
