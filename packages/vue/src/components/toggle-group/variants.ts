// shadcn-vue's ToggleGroup classes, verbatim (root, and the item extras on top of toggleVariants).
import { cva } from 'class-variance-authority'

export const toggleGroupVariants = cva(
  'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs',
)

export const toggleGroupItemVariants = cva(
  'w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l',
)
