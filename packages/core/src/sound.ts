// Opt-in interaction sounds, played by Cuelume (https://github.com/danielwh2/cuelume).
//
// Off by default. Cuelume is an OPTIONAL peer dependency: it is only imported (lazily, on the
// client) once sound is turned on, so apps that never enable sound never load it, and apps
// that turn it on without installing it get a silent no-op plus one console warning.
//
// Sound is not motion: nothing here reads prefers-reduced-motion. It has its own switch.
//
// Two halves:
//   - Markup: adapters put `data-cuelume-*` attributes on the right elements (see
//     GOOP_SOUND_CUES / cueAttrs) only when a component's sound is on. Cuelume's `bind()`
//     delegates listeners for them on the document.
//   - Playback: `enableSound()` loads Cuelume and binds it, `disableSound()` mutes it,
//     `playCue()` plays an outcome cue from code (toasts) and no-ops while sound is off.
//
// Nothing here touches `window`/`document` at import time (SSR-safe), and on the server every
// call is a no-op.

/** Every cue Cuelume plays. */
export type GoopCue =
  | 'tap'
  | 'type'
  | 'select'
  | 'toggle'
  | 'open'
  | 'close'
  | 'navigate'
  | 'success'
  | 'warning'
  | 'error'
  | 'loading'
  | 'ready'
  | 'attention'
  | 'count'

/** The interaction a `data-cuelume-*` attribute listens for (it names its default cue). */
export type GoopCueBinding = 'tap' | 'type' | 'select' | 'toggle' | 'open' | 'close' | 'navigate'

/** How much an action matters. Cuelume plays a different arrangement per level. */
export type GoopCueEmphasis = 'subtle' | 'normal' | 'strong'

/** Which cue an element plays: the binding (what it listens for), optionally another cue
 *  than the binding's default, and an emphasis. */
export interface GoopCueSpec {
  bind: GoopCueBinding
  /** Cue to play instead of the binding's default (e.g. `{ bind: 'tap', cue: 'close' }`). */
  cue?: GoopCue
  emphasis?: GoopCueEmphasis
}

/** Options for one `playCue()` (mirrors Cuelume's `PlayOptions`). */
export interface GoopCueOptions {
  /** 0..1, this play only. */
  volume?: number
  emphasis?: GoopCueEmphasis
  /** Shapes `select`; `back` plays `navigate`, `toggle` and `count` backwards. */
  direction?: 'forward' | 'back'
  /** Shapes `type`. */
  key?: 'printable' | 'space' | 'delete' | 'enter'
  /** Shapes `tap`. */
  input?: 'mouse' | 'touch' | 'pen' | 'keyboard'
  /** How long a `count` runs (ms). */
  duration?: number
}

/**
 * The cue each goopUI part plays, shared by every adapter (Vue now; React/Svelte later).
 * Follows Cuelume's guidance: buttons tap; checkbox/switch/toggle toggle; tabs, radios and
 * list options select; menus, popovers and accordions open/close subtly; dialogs, sheets and
 * drawers open/close; the command palette stays quiet except its items; text fields type.
 * Never hover (tooltips and hover cards have no cue).
 */
export const GOOP_SOUND_CUES = {
  button: { bind: 'tap' },
  switch: { bind: 'toggle' },
  checkbox: { bind: 'toggle' },
  toggle: { bind: 'toggle' },
  toggleGroupItem: { bind: 'select' },
  radioItem: { bind: 'select' },
  tabsTrigger: { bind: 'select' },
  paginationItem: { bind: 'select' },
  selectTrigger: { bind: 'open', emphasis: 'subtle' },
  // Reka selects on pointerup, then closes: adapters play this from the item's select event.
  selectItem: { bind: 'select' },
  menuTrigger: { bind: 'open', emphasis: 'subtle' },
  menuItem: { bind: 'select' },
  menuCheckboxItem: { bind: 'toggle' },
  menuRadioItem: { bind: 'select' },
  menuSubTrigger: { bind: 'open', emphasis: 'subtle' },
  popoverTrigger: { bind: 'open', emphasis: 'subtle' },
  accordionTrigger: { bind: 'open', emphasis: 'subtle' },
  collapsibleTrigger: { bind: 'open', emphasis: 'subtle' },
  dialogTrigger: { bind: 'open' },
  dialogClose: { bind: 'close' },
  alertDialogAction: { bind: 'tap' },
  alertDialogCancel: { bind: 'close' },
  sheetTrigger: { bind: 'open' },
  sheetClose: { bind: 'close' },
  drawerTrigger: { bind: 'open' },
  drawerClose: { bind: 'close' },
  comboboxItem: { bind: 'select' },
  commandItem: { bind: 'select', emphasis: 'subtle' },
  numberFieldStep: { bind: 'tap', cue: 'select', emphasis: 'subtle' },
  input: { bind: 'type' },
  textarea: { bind: 'type' },
  inputOtp: { bind: 'type' },
  sidebarTrigger: { bind: 'toggle' },
} as const satisfies Record<string, GoopCueSpec>

export type GoopSoundPart = keyof typeof GOOP_SOUND_CUES

/** Toast type → the cue for what it reports (played subtly). `default`/`info` → `ready`. */
export const GOOP_TOAST_CUES = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'ready',
  loading: 'loading',
  default: 'ready',
  normal: 'ready',
} as const satisfies Record<string, GoopCue>

/** The cue a toast of this type plays, or null for unknown types. */
export function toastCue(type: string | undefined): GoopCue | null {
  return (GOOP_TOAST_CUES as Record<string, GoopCue>)[type ?? 'default'] ?? null
}

/**
 * The `data-cuelume-*` attributes for a part (or spec): `{ 'data-cuelume-tap': '' }` etc.
 * `open: true` flips an `open` binding to `close` for triggers that also close what they
 * opened (accordion, collapsible, popover): the attribute is read at click time, before the
 * state change re-renders it.
 */
export function cueAttrs(part: GoopSoundPart | GoopCueSpec, state: { open?: boolean } = {}): Record<string, string> {
  const spec: GoopCueSpec = typeof part === 'string' ? GOOP_SOUND_CUES[part] : part
  const bind = spec.bind === 'open' && state.open ? 'close' : spec.bind
  const attrs: Record<string, string> = { [`data-cuelume-${bind}`]: spec.cue ?? '' }
  if (spec.emphasis) attrs['data-cuelume-emphasis'] = spec.emphasis
  return attrs
}

// --- Playback -------------------------------------------------------------------------------

/** The slice of Cuelume's API we use (typed here so core's types never need it installed). */
interface CuelumeApi {
  bind(root?: ParentNode): () => void
  play(sound?: string, options?: GoopCueOptions): void
  setEnabled(enabled: boolean): void
}

type SoundState = 'unset' | 'on' | 'off'

let state: SoundState = 'unset'
let engine: CuelumeApi | null = null
let loading: Promise<CuelumeApi | null> | null = null
let unbind: (() => void) | null = null
let warned = false
let loader: () => Promise<CuelumeApi> = () => import('cuelume') as unknown as Promise<CuelumeApi>

const onClient = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined'

function load(): Promise<CuelumeApi | null> {
  if (engine) return Promise.resolve(engine)
  if (!loading) {
    loading = loader().then(
      (mod) => (engine = mod),
      (err: unknown) => {
        if (!warned) {
          warned = true
          console.warn('[goopui] Sound is on but `cuelume` could not be loaded. Install it: `npm i cuelume`.', err)
        }
        loading = null
        return null
      },
    )
  }
  return loading
}

/** Apply the current state to the loaded engine (bind + unmute, or mute). */
function sync(api: CuelumeApi): void {
  if (state === 'on') {
    unbind ??= api.bind()
    api.setEnabled(true)
  } else {
    api.setEnabled(false)
  }
}

/**
 * Turn sound on: loads Cuelume (client only), binds its delegated listeners to the document
 * and unmutes it. Resolves true once it is ready, false on the server or when Cuelume isn't
 * installed. Call it from a user gesture if you can: browsers only start audio after one.
 */
export async function enableSound(): Promise<boolean> {
  state = 'on'
  if (!onClient()) return false
  const api = await load()
  if (!api) return false
  sync(api)
  return state === 'on'
}

/** Turn sound off (a mute): later cues are no-ops and ringing ones fade. Components that
 *  opted in keep their markup but stay silent, and no longer turn sound back on. */
export function disableSound(): void {
  state = 'off'
  if (engine) sync(engine)
}

/** `enableSound()` / `disableSound()` from a boolean. */
export function setSoundEnabled(on: boolean): Promise<boolean> {
  if (on) return enableSound()
  disableSound()
  return Promise.resolve(false)
}

/** True while sound is on. */
export function isSoundEnabled(): boolean {
  return state === 'on'
}

/**
 * What adapters call when a component with sound on mounts: turns sound on, unless the app
 * has explicitly turned it off with `disableSound()` / `setSoundEnabled(false)` (a mute wins
 * over a component's opt-in). No-op on the server.
 */
export function requestSound(): void {
  if (state === 'off' || !onClient()) return
  if (state === 'on' && engine) return
  void enableSound()
}

/**
 * Play an outcome cue from code (e.g. a toast's success / error). No-op while sound is off,
 * on the server, or when Cuelume isn't installed. Never on hover or per streamed token.
 */
export function playCue(cue: GoopCue, options?: GoopCueOptions): void {
  if (state !== 'on' || !onClient()) return
  if (engine) return engine.play(cue, options)
  void load().then((api) => {
    if (api && state === 'on') api.play(cue, options)
  })
}

/** @internal Tests: reset module state and swap the Cuelume loader. */
export function __resetSound(next?: () => Promise<unknown>): void {
  unbind?.()
  state = 'unset'
  engine = null
  loading = null
  unbind = null
  warned = false
  loader = (next as () => Promise<CuelumeApi>) ?? (() => import('cuelume') as unknown as Promise<CuelumeApi>)
}
