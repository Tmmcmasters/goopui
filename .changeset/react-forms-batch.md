---
'@goopui/react': minor
---

React forms batch: `GoopInput`, `GoopTextarea`, `GoopRadioGroup` / `GoopRadioGroupItem`, `GoopSlider`, `GoopProgress`, `GoopToggle` and `GoopToggleGroup` / `GoopToggleGroupItem`. Each is shadcn/ui's React component on its Radix primitive (current `radix-nova` classes) with the same goo, props and defaults as `@goopui/vue`. They server-render shadcn's markup and the goo attaches after hydration; `ref` is the DOM element and `goopRef` the engine handle. React naming where it differs from Vue: `containerClassName` (Vue `containerClass`), `pressed` / `defaultPressed` / `onPressedChange`, `value` / `onValueChange`, and `value={null}` for an indeterminate progress bar.
