'use client'
import type { AccordionOptions } from '@goopui/core'
import { createContext, useContext } from 'react'

/** Provided by GoopAccordion / GoopCollapsible to their parts: the engine options every item
 *  uses (null when the goo is off), and which items are open (for the triggers' sound cue). */
export interface GoopAccordionContextValue {
  options: AccordionOptions | null
  /** Open item values (GoopAccordion) or `['']` while open (GoopCollapsible). */
  open: readonly string[]
}

export const GoopAccordionContext = createContext<GoopAccordionContextValue | null>(null)
GoopAccordionContext.displayName = 'GoopAccordionContext'

export const useGoopAccordion = (): GoopAccordionContextValue | null => useContext(GoopAccordionContext)

/** Provided by GoopAccordionItem to its trigger: whether this item is open. */
export const GoopAccordionItemOpenContext = createContext(false)
