---
'@goopui/core': minor
---

InputOTP goo: `InputOTPHandle.setActive(index)` puts the goo in a cell (-1: none) as focusing it would (flood, flow from the previous cell, drain), for inputs whose cells aren't focusable themselves, like React's input-otp (one hidden input over render-only slots). Once an adapter drives it, focus on the hidden input no longer clears the cell, and a press over a cell floods it from the press point. Real cell focus (`@goopui/vue`) is unchanged. `@goopui/react` (still private) uses it for its new GoopInputOTP, alongside GoopToaster (sonner), GoopCommand (cmdk), GoopCombobox (cmdk + Popover) and GoopNumberField.
