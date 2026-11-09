---
'@goopui/core': patch
'@goopui/vue': patch
'@goopui/react': patch
'@goopui/nuxt': patch
---

Fixes found by the new demo smoke + axe check:

- Core `attachToggleGroup` no longer counts its own text-follow copies as items. With an item selector like `[data-slot="toggle-group-item"]` (React's GoopToggleGroup) un-pressing a pressed item froze the page in a MutationObserver loop.
- A one-thumb GoopSlider's `aria-label` / `aria-labelledby` also names its thumb (the focusable `role="slider"`).
- GoopCarouselDots space the dots 16px apart, so each dot's target is 24px (WCAG 2.2 target size).
- GoopCommandSeparator is decorative (`role="none"`): a listbox may only own groups and options. Vue's GoopCommandList is named "Suggestions" by default, like cmdk's.
- Destructive menu items on a tinted goo surface (`surface="trigger"`) mix toward the surface's text color, so they stay readable.
- Vue: GoopComboboxInput drops reka's stale `aria-activedescendant` while the list is closed; GoopDrawer no longer leaves the page `aria-hidden` after a second drawer closes (reka's aria-hidden cleanup ran twice).
- React: GoopComboboxInput's `aria-expanded` / `aria-controls` follow the popover (cmdk hardcodes them); GoopTabs keeps every panel element in the DOM (hidden while inactive, children still unmounted), and a trigger without a panel names no `aria-controls`, as in reka-ui. GoopPopoverContent's dialog is named by its trigger (as in reka-ui), and GoopComboboxList's popup is no longer an unnamed `role="dialog"` around the listbox.
