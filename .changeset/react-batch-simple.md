---
'@goopui/react': minor
---

React ports of Alert, Kbd, Breadcrumb, Empty, Button Group, Pagination, Accordion and Collapsible: shadcn/ui React's parts and current `radix-nova` classes (Radix Accordion, Collapsible, Separator and Slot where shadcn uses them) with the same goo as `@goopui/vue`. The alert blooms in, the kbd squishes, breadcrumb links and the current page share one goo blob each, the empty media sits in a breathing puddle, a button group flexes as one body (a `GoopButton` inside a `GoopButtonGroup` drops its own goo unless it sets `goo`), and accordion / collapsible rows flood from the click point while the content opens on a jelly spring. Pagination follows shadcn/ui React (you mark the current `GoopPaginationLink` with `isActive`); `GoopPaginationFirst` / `GoopPaginationLast` are goopUI extras, as in Vue. Engine props go through `goop-props.ts`, `ref` is the DOM node and `goopRef` the engine handle, and the goo attaches after hydration.
