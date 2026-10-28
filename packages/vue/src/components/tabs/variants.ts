import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

/**
 * shadcn-vue's TabsList classes, copied verbatim (style `reka-nova`, see
 * apps/playground/app/components/ui/tabs/index.ts). Keep identical so GoopTabsList is a
 * drop-in TabsList.
 */
export const tabsListVariants = cva(
  'rounded-lg p-0.75 group-data-[orientation=horizontal]/tabs:h-8 data-[variant=line]:rounded-none group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
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

/** shadcn-vue's TabsTrigger classes (verbatim), split so the goo can drop the active bg. */
const TRIGGER_BASE =
  'gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium [&_svg:not([class*=size-])]:size-4 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0'
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
