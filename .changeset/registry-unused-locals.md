---
"@goopui/vue": patch
---

Remove an unused import (GoopDrawerContent) and a string template ref vue-tsc reports as unused (GoopCarouselContent), so the components type-check in apps with `noUnusedLocals`, as when installed from the shadcn-vue registry.
