---
'@goopui/react': minor
---

React bloom overlays: GoopPopover, GoopTooltip, GoopHoverCard, GoopAlertDialog (with `size` and GoopAlertDialogMedia) and GoopSheet, 1:1 mirrors of shadcn/ui's Radix components with the same goo as @goopui/vue. Each panel blooms on its own aria-hidden surface (never on the trigger) after hydration; the sheet blooms from the middle of its screen edge and shrinks back into it. `goo={false}` is plain shadcn; `goopRef` gets the engine handle.
