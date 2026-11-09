---
'@goopui/vue': minor
---

GoopCommand and GoopCommandDialog take `ignoreFilter` (reka-ui's Combobox name; cmdk's `shouldFilter={false}`): the built-in "contains" filter is off, every item and group renders as given so you can filter and order results yourself, and GoopCommandEmpty shows when there are no items. The goo highlight lands on the first result after each keystroke (and again when later results replace the highlighted item) and follows the arrow keys through your order.
