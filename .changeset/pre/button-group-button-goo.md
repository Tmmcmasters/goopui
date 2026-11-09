---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/react': minor
---

Button Group: every GoopButton inside a GoopButtonGroup now keeps its own goo body (lean, momentum, drips, press squish and splash), exactly like a standalone button. The group marks each button's joined sides and the goo is cut clean at the seams: nothing crosses onto a neighbour, the body reaches under the seam so the strip never opens, and the outer edges bulge, drip and splash as usual. Outline buttons share one 1px seam line.

- core: new `seams` option on `attachGoop` (`true` follows the host's `data-goop-seams`, or pass the sides), plus `GOOP_SEAMS_ATTR`, `parseGoopSeams`, `goopSeamClip`, `buttonGroupSeams` and the optional renderer method `setBodyBleed`. `attachButtonGroup` gains the `seams` effect (default on) and its `press` / `tug` whole-button flex is now opt-in (default off).
- vue / react: `GoopButtonGroup` takes `seams`; its `goo={false}` now also makes its buttons plain. `press` and `tug` default to off.
