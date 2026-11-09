---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

Flood fills (GoopToggle, GoopToggleGroup, GoopAccordion, GoopCollapsible): the label's text color now follows the goo's edge through the whole flood and drain (`textFollow`, default on). An aria-hidden copy of the label in the on-goo color (`--goop-toggle-text` / `--goop-accordion-text`) is clipped to the goo over the real label. `textFollow: false`, reduced motion, or a browser without `clip-path: path()` keep the old all-at-once flip.
