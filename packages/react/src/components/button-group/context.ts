'use client'
import { createContext, useContext } from 'react'

/** Provided by GoopButtonGroup: `null` outside a group, else the group's `goo` switch.
 *  GoopButtons inside keep their own goo body (cut clean at the seams the group marks); the
 *  group's `goo={false}` makes them plain unless they set `goo` themselves. */
export const GoopButtonGroupContext = createContext<{ goo: boolean } | null>(null)
GoopButtonGroupContext.displayName = 'GoopButtonGroupContext'

/** The enclosing GoopButtonGroup's goo switch, or null outside one. */
export const useGoopButtonGroup = (): { goo: boolean } | null => useContext(GoopButtonGroupContext)
