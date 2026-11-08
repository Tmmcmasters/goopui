'use client'
// Opt-in interaction sounds (Cuelume) for the React components. Off by default.
//
// The logic lives in @goopui/core (cue map, lazy Cuelume loading, mute). This file only
// resolves each component's `sound` (its prop, else the nearest ancestor's, else the app
// default from <GoopProvider sound>, else off), shares it with the component's parts (a
// GoopDialog's trigger and close button, a GoopTabs' triggers, ...), and turns the
// `data-cuelume-*` attributes on. With sound off the markup is untouched. Mirrors
// packages/vue/src/sound.ts.
import { cueAttrs, requestSound, type GoopCueSpec, type GoopSoundPart } from '@goopui/core'
import { createContext, useContext, useEffect, type ReactNode } from 'react'

/** The inherited `sound` (undefined: nobody above set it). */
export const GoopSoundContext = createContext<boolean | undefined>(undefined)
GoopSoundContext.displayName = 'GoopSoundContext'

/** Set by parts that pass their cue to an `asChild` child (a GoopDialogClose around a
 *  GoopButton): the child must not add its own cue to the same element. */
const ClaimContext = createContext(false)

/**
 * Whether sound is on here: `own` (the component's `sound` prop) if set, else inherited.
 * While on, it asks core to load and bind Cuelume after mount (client only; a
 * `disableSound()` mute wins).
 */
export function useGoopSound(own?: boolean): boolean {
  const parent = useContext(GoopSoundContext)
  const on = own ?? parent ?? false
  useEffect(() => {
    if (on) requestSound()
  }, [on])
  return on
}

/** Shares a component's resolved `sound` with its parts. Renders no element. */
export function GoopSoundScope({ sound, children }: { sound?: boolean; children?: ReactNode }) {
  const parent = useContext(GoopSoundContext)
  if (sound === undefined || sound === parent) return <>{children}</>
  return <GoopSoundContext.Provider value={sound}>{children}</GoopSoundContext.Provider>
}

/** Marks the subtree as claimed: descendants' useGoopCue returns {} (see ClaimContext). */
export function GoopCueClaim({ children }: { children?: ReactNode }) {
  return <ClaimContext.Provider value>{children}</ClaimContext.Provider>
}

/**
 * The `data-cuelume-*` attributes for a part while sound is on, else `{}`.
 * `open` (for triggers that also close) plays `close` while open.
 */
export function useGoopCue(
  part: GoopSoundPart | GoopCueSpec | null,
  options: { sound?: boolean; open?: boolean } = {},
): Record<string, string> {
  const on = useGoopSound(options.sound)
  const claimed = useContext(ClaimContext)
  if (!on || claimed || !part) return {}
  return cueAttrs(part, { open: options.open })
}
