---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

Opt-in interaction sounds via Cuelume (an optional peer dependency of core; off by default). Core: `enableSound` / `disableSound` / `setSoundEnabled` / `isSoundEnabled`, `playCue`, `cueAttrs`, and the shared cue map `GOOP_SOUND_CUES` / `GOOP_TOAST_CUES`. Vue: a `sound` prop on the interactive components (roots share it with their parts), `provideGoopSound`, and `GoopPlugin`'s `sound` option. Nuxt: `goop.sound`. With sound off, markup is unchanged and Cuelume is never loaded.
