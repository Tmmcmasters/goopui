---
'@goopui/vue': patch
'@goopui/nuxt': patch
---

Types: cva variant props (`GoopButton` `variant`/`size`, Switch, Toggle, Tabs, ...) were `any` in apps, because the declarations imported the unexported `class-variance-authority/dist/types`. The build now resolves like tsconfig (`Bundler`) and fails on any private deep import. Nuxt: no more `Unknown at rule: @source` build warnings and no raw `@source` in the shipped CSS (the module no longer appends its `@source` to goop.css, whose header comment mentions `@import "tailwindcss"`, and strips goop.css's own `@source` when it injects the file as a separate root).
