// shadcn/ui's Resizable classes (style `radix-nova`, the same look as @goopui/react's). React's
// react-resizable-panels marks the handle with the LINE's `aria-orientation`; reka's Splitter
// marks it with the GROUP's `data-orientation`, so `aria-[orientation=horizontal]` (a
// horizontal line) is spelled `data-[orientation=vertical]` here.
export const RESIZABLE_PANEL_GROUP = 'flex h-full w-full data-[orientation=vertical]:flex-col'
export const RESIZABLE_HANDLE =
  'relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:translate-x-0 data-[orientation=vertical]:after:-translate-y-1/2 [&[data-orientation=vertical]>div]:rotate-90'
/** The grip (`withHandle`): nova's bar, the goo bead's rest shape. */
export const RESIZABLE_HANDLE_GRIP = 'z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border'
