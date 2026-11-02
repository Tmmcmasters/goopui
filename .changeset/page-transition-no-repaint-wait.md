---
'@goopui/nuxt': patch
---

`goop.pageTransition` (split, the default) turns off Nuxt's `experimental.navigationRepaint`: its wait for a painted frame never succeeds while the old page is held as a view-transition snapshot, so every navigation sat frozen for its full 100ms timeout.
