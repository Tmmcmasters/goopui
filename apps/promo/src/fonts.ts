import { loadFont as loadDynaPuff } from '@remotion/google-fonts/DynaPuff'
import { loadFont as loadGeist } from '@remotion/google-fonts/Geist'
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono'

const dyna = loadDynaPuff('normal', { weights: ['600'], subsets: ['latin'] })
const geist = loadGeist('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] })
const mono = loadGeistMono('normal', { weights: ['500'], subsets: ['latin'] })

export const DYNAPUFF = dyna.fontFamily
export const GEIST = geist.fontFamily
export const GEIST_MONO = mono.fontFamily

/** Resolves when the fonts are usable (the goo host is measured at attach time). */
export const fontsReady: Promise<void> = Promise.all([dyna.waitUntilDone(), geist.waitUntilDone(), mono.waitUntilDone()])
  .then(() => document.fonts.ready)
  .then(() => undefined)
