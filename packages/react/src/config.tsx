'use client'
// App-wide defaults for goopUI components: <GoopProvider preset="subtle" sound>. Mirrors
// @goopui/vue's GoopPlugin / provideGoopConfig. Component props win over these.
import type { GoopOptions } from '@goopui/core'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { GoopSoundContext } from './sound'
import { useStableValue } from './utils'

/** App-wide defaults: engine options (e.g. `{ preset: 'subtle', renderer: 'canvas' }`) plus
 *  `sound`, the default for every component's `sound` prop (off unless set). */
export type GoopConfig = GoopOptions & {
  /** Interaction sounds (Cuelume) on by default for every component. Default false. */
  sound?: boolean
}

export const GoopConfigContext = createContext<GoopOptions>({})
GoopConfigContext.displayName = 'GoopConfigContext'

/** The engine defaults in effect here (empty when no GoopProvider is above). */
export function useGoopConfig(): GoopOptions {
  return useContext(GoopConfigContext)
}

export type GoopProviderProps = GoopConfig & { children?: ReactNode }

/**
 * Engine defaults (and `sound`) for everything inside. Nested providers merge over their
 * parent. Optional: without one every component uses core's defaults (playful, svg, no sound).
 *
 *   <GoopProvider preset="subtle" sound>{children}</GoopProvider>
 */
export function GoopProvider({ children, sound, ...engine }: GoopProviderProps) {
  const parent = useGoopConfig()
  const own = useStableValue(engine)
  const value = useMemo(() => ({ ...parent, ...own }), [parent, own])
  const inner = sound === undefined ? children : <GoopSoundContext.Provider value={sound}>{children}</GoopSoundContext.Provider>
  return <GoopConfigContext.Provider value={value}>{inner}</GoopConfigContext.Provider>
}
