'use client'
import { createContext, useContext } from 'react'

/** Provided by GoopButtonGroup: GoopButtons inside leave their own goo off unless they set
 *  `goo` (the group's joined corners and borders are shadcn's; the group flexes them). */
export const GoopButtonGroupContext = createContext(false)
GoopButtonGroupContext.displayName = 'GoopButtonGroupContext'

/** Is this inside a GoopButtonGroup? */
export const useInGoopButtonGroup = (): boolean => useContext(GoopButtonGroupContext)
