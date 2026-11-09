---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

The menu highlight blob over any list of links or buttons: core `attachListHighlight(list, { items, active, hover })` and Vue `useGoopListHighlight(el, options, enabled)`. The blob follows hover (mouse / pen, never touch) and keyboard focus, and rests on the `active` item (the current page, the section in view) otherwise. Reduced motion: it snaps.
