---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

New component: GoopPagination (shadcn-vue's Pagination on reka-ui, with Content, Item, Ellipsis, First, Previous, Next, Last and Link). The current page is one goo blob that slides between page numbers with momentum and a gentle stretch (core `attachPaginationIndicator`, the Tabs indicator fed `PAGINATION_FEEL`); First / Previous / Next / Last are ghost GoopButtons that press-squish. Toggles: `indicator`, `wobble`, `momentum`, `press`, plus `speed`, `preset`, `renderer` and `goo`.
