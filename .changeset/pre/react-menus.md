---
'@goopui/react': minor
---

React menus: GoopDropdownMenu, GoopContextMenu, GoopMenubar and GoopNavigationMenu, 1:1 mirrors of shadcn/ui's React components (Radix, current `radix-nova` classes) with the same goo as `@goopui/vue`. Menu panels bloom open (a context menu from the right-click point), the item highlight is a goo blob that trails a low mound under the pointer and doesn't bump across labels or separators, selecting pops it before the menu closes, and submenus bloom out of their row. The menubar's trigger highlight is one goo body; the navigation menu's highlight flows between items and its viewport blooms out of the active trigger and jelly-slides between triggers, with `openDrips` on by default. Same props as Vue (`goo={false}` is plain shadcn); `ref` is the DOM node, `goopRef` / `highlightRef` the engine handles. Hovered items no longer match `:focus-visible` (Radix focuses them from script).
