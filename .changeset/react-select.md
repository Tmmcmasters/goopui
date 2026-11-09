---
'@goopui/react': minor
---

New React component: GoopSelect (shadcn/ui's Select on Radix, `radix-nova` classes) with every part: `GoopSelectTrigger` (`size`), `Value`, `Content`, `Group`, `Label`, `Item`, `Separator`, `ScrollUpButton`, `ScrollDownButton`. The goo matches `@goopui/vue`'s GoopSelectContent: the list blooms out of the selected item (item-aligned) or its own center (popper), the highlight is a goo blob, choosing squishes it and holds the close until the pop has played, and the chosen check mark plops in. Same goo props (`SELECT_PROP_KEYS`, `toSelectOptions`), plus `goopRef` (emerge handle) and `highlightRef` (highlight handle). `goo={false}` is plain shadcn; reduced motion opens and closes plainly.
