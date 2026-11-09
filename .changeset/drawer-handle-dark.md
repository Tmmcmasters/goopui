---
'@goopui/vue': patch
---

GoopDrawerContent: the drag handle is clearly visible on dark. shadcn's `bg-muted` all but vanished on a dark popover, so on dark the handle (goo or plain) is the muted text color mixed into the panel. `@goopui/react` gets the same Drawer (core's drawer engine on Radix Dialog, vaul's API).
