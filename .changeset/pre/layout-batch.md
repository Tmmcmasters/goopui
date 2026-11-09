---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/react': minor
---

New components in Vue and React: Aspect Ratio, Scroll Area and Resizable (shadcn parts and radix-nova classes; reka-ui in Vue, Radix and `react-resizable-panels` in React, which `@goopui/react` now depends on).

- **GoopAspectRatio**: a plain port, no goo (it only sizes a box).
- **GoopScrollArea / GoopScrollBar**: the scrollbar thumb is a goo body. It stretches a little with the scroll speed (`stretch`) and, pushed past an end by wheel, trackpad or touch, squashes against it and springs back with a small jelly wobble (`jelly`). Transforms on the thumb's body only: no layout shift, no scroll-size change, and the stretch stays inside the track. Core: `attachScrollArea`, `SCROLL_AREA_EFFECTS`, `SCROLL_AREA_FEEL`, `scrollStretch`, `scrollSquash`, `scrollThumbTransform`.
- **GoopResizablePanelGroup / GoopResizablePanel / GoopResizableHandle**: the handle's grip (`withHandle`) is a goo bead that swells a little and bulges toward the drag direction in a low, wide mound (`bulge`), then wobbles back like jelly on release (`wobble`). Without a grip the mound rises on the line under the pointer. Props set on the group are inherited by its handles. Core: `attachResizableHandle`, `RESIZABLE_EFFECTS`, `RESIZABLE_FEEL`, `resizableBeadPath`.

Every effect takes a boolean or a multiplier, plus `speed` and `preset` (`subtle | playful | wild`); `goo: false` renders plain shadcn. Reduced motion: static, no sim.
