// shadcn/ui's Resizable classes (React, style `radix-nova`), verbatim but for the grip, whose
// nova `cn-resizable-handle-icon` class is spelled out. react-resizable-panels marks the
// handle with its LINE's `aria-orientation` (a horizontal line in a vertical group).
export const RESIZABLE_PANEL_GROUP = 'flex h-full w-full aria-[orientation=vertical]:flex-col'
export const RESIZABLE_HANDLE =
  'relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90'
/** The grip (`withHandle`): nova's bar, the goo bead's rest shape. */
export const RESIZABLE_HANDLE_GRIP = 'z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border'
