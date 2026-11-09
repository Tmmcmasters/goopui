---
'@goopui/core': minor
'@goopui/vue': minor
'@goopui/nuxt': minor
---

New GoopNavigationMenu (shadcn's NavigationMenu on reka-ui, same parts and `navigationMenuTriggerStyle`). One goo highlight flows between the top-level items with momentum (the tabs indicator's feel on the menu highlight engine), and the panel links get their own blob. The viewport blooms out of the active trigger; moving to another trigger slides and resizes it as one goo body with a gentle jelly settle instead of re-opening. With `:viewport="false"` each panel blooms from its own trigger. Toggles: `highlight`, `contentHighlight`, `bloom`, `jelly`, `wobble`, `momentum`, `fade`, `openSlosh`, `openDrips`, `closeSlosh`. Core: `attachNavigationMenuHighlight`, `attachNavigationMenuViewport`, `navigationMenuJellyStep`.
