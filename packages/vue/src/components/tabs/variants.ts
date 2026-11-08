import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

// shadcn/ui's Tabs classes (React, style `radix-nova`), identical to @goopui/react's so Vue and
// React tabs look the same. shadcn writes `data-active:`,
// `data-horizontal:` and `data-vertical:`; those are spelled out as the `data-[state=active]` /
// `data-[orientation=...]` attributes Radix emits, so no extra custom variants are needed.

export const TABS_ROOT = 'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col'

export const tabsListVariants = cva(
  'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-8 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type TabsListVariants = VariantProps<typeof tabsListVariants>

/** shadcn's TabsTrigger classes, split so the goo can drop the active bg and shadow. */
const TRIGGER_BASE =
  "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
const TRIGGER_SHADOW = 'group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none'
const TRIGGER_LINE =
  'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent'
const TRIGGER_ACTIVE_BG = 'data-[state=active]:bg-background dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30'
const TRIGGER_ACTIVE_TEXT = 'data-[state=active]:text-foreground dark:data-[state=active]:text-foreground'
const TRIGGER_UNDERLINE =
  'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100'

/** Exactly shadcn's TabsTrigger. */
export const tabsTriggerClass = [TRIGGER_BASE, TRIGGER_SHADOW, TRIGGER_LINE, TRIGGER_ACTIVE_BG, TRIGGER_ACTIVE_TEXT, TRIGGER_UNDERLINE]
/** With the goo indicator: the blob paints the active bg and shadow (goop.css), not the trigger. */
export const tabsTriggerGooClass = [TRIGGER_BASE, TRIGGER_LINE, TRIGGER_ACTIVE_TEXT, TRIGGER_UNDERLINE]

export const TABS_CONTENT = 'flex-1 text-sm outline-none'
