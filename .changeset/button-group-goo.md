---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/react': minor
---

Button group: one goo body. `attachButtonGroup` now draws one aria-hidden goo layer behind the group: a hover / keyboard-focus highlight blob that slides between the buttons (the menu highlight engine; on touch it shows only while pressed), and on press a low, wide bulge past the pressed button plus a ripple of goo into its neighbours, alongside the existing press squish and neighbour tug. New effects, each a prop on `GoopButtonGroup` (Vue and React) taking `false` or a multiplier: `highlight`, `wobble`, `momentum`, `followPointer`, `bulge`, `ripple`. New core exports: `buttonGroupGooPose`, `BUTTON_GROUP_HIGHLIGHT_FEEL`, `BUTTON_GROUP_*_CIRCLES`, `BUTTON_GROUP_HIGHLIGHT_ATTR`, `BUTTON_GROUP_LIT_ATTR`, and an optional third `attachMenuHighlight` argument (`MenuHighlightHost`: `placement`, `extra`). The handle gains `light(index)`, `lit` and `element`.
