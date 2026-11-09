'use client'
import type { AccordionOptions } from '@goopui/core'
import { createContext, useContext } from 'react'

/** Provided by GoopAccordion / GoopCollapsible to their parts: the engine options every item
 *  uses (null when the goo is off), and which items are open (for the triggers' sound cue). */
export interface GoopAccordionContextValue {
  options: AccordionOptions | null
  /** Open item values (GoopAccordion) or `['']` while open (GoopCollapsible). */
  open: readonly string[]
  /** GoopCollapsible: whether its trigger row fills with goo while open (false: the trigger
   *  skips `data-goop-accordion-trigger`, so core attaches no fill; the content's jelly spring
   *  still runs). Unset: it fills. */
  rowFill?: boolean
}

export const GoopAccordionContext = createContext<GoopAccordionContextValue | null>(null)
GoopAccordionContext.displayName = 'GoopAccordionContext'

export const useGoopAccordion = (): GoopAccordionContextValue | null => useContext(GoopAccordionContext)

/** Provided by GoopAccordionItem to its trigger: whether this item is open. */
export const GoopAccordionItemOpenContext = createContext(false)

/** Defaults a container gives the GoopCollapsibles inside it (GoopSidebar's `submenus`
 *  toggle: sub-menus spring open, or plain). `rowFill: false` leaves the trigger row unfilled
 *  while open (GoopSidebar: only the active item is a pill, an open parent just turns its
 *  chevron, as in shadcn); it applies unless the collapsible sets `flood` itself. The
 *  collapsible's own props win. Same as @goopui/vue's `provideGoopCollapsibleDefaults`. */
export interface GoopCollapsibleDefaults {
  goo?: boolean
  rowFill?: boolean
}

export const GoopCollapsibleDefaultsContext = createContext<GoopCollapsibleDefaults | null>(null)
GoopCollapsibleDefaultsContext.displayName = 'GoopCollapsibleDefaultsContext'

export const useGoopCollapsibleDefaults = (): GoopCollapsibleDefaults | null => useContext(GoopCollapsibleDefaultsContext)
