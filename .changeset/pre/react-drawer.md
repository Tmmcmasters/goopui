---
'@goopui/react': minor
---

New React component: GoopDrawer (shadcn/ui's Drawer API on Radix Dialog, vaul's root props: `direction`, `snapPoints`, `dismissible`, `handleOnly`...) with every part: `GoopDrawerTrigger`, `Portal`, `Overlay`, `Content`, `Header`, `Footer`, `Title`, `Description`, `Close`. Core's `createDrawer` drives the drag, snap points, springs and goo, as in `@goopui/vue`: the same effect props (`DRAWER_PROP_KEYS`, `toDrawerOptions`: lag, slosh, rise, stretch, handle, splash), plus `goopRef` (drawer controller). `goo={false}` is plain shadcn; reduced motion opens and closes plainly.
