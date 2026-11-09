// shadcn/ui's ToggleGroup classes (React, style `radix-nova`; root, and the item extras on top of
// toggleVariants). shadcn's `data-vertical:` / `group-data-horizontal/...:` are spelled out from
// `data-orientation` (GoopToggleGroup sets it, default "horizontal", like shadcn/ui React).
// "horizontal" is written as "not vertical", the same classes as @goopui/vue.
import { cva } from 'class-variance-authority'

export const toggleGroupVariants = cva(
  'group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
)

export const toggleGroupItemVariants = cva(
  'shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-not-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-lg group-not-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-lg group-not-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-not-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t',
)
