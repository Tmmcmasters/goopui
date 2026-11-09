---
'@goopui/vue': patch
'@goopui/react': patch
---

GoopItemGroup / GoopItem: valid list semantics. A group of plain items is a `role="list"` of `role="listitem"` items; a group with a link or button item (`as-child` / `asChild`, `as="a" | "button"`, a component `as`) has no list role, so its items keep their link / button semantics (a `listitem` role would replace them). Decided from the items' props while rendering, so SSR and hydration match; a `role` on the group or an item wins. Fixes axe `aria-required-children` on shadcn's ItemGroup markup.
