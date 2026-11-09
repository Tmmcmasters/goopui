# @goopui/vue

## 0.1.0-alpha.1

### Minor Changes

- a3b973e: GoopCommand and GoopCommandDialog take `ignoreFilter` (reka-ui's Combobox name; cmdk's `shouldFilter={false}`): the built-in "contains" filter is off, every item and group renders as given so you can filter and order results yourself, and GoopCommandEmpty shows when there are no items. The goo highlight lands on the first result after each keystroke (and again when later results replace the highlighted item) and follows the arrow keys through your order.
- b8fe131: Flood fills (GoopToggle, GoopToggleGroup, GoopAccordion, GoopCollapsible): the label's text color now follows the goo's edge through the whole flood and drain (`textFollow`, default on). An aria-hidden copy of the label in the on-goo color (`--goop-toggle-text` / `--goop-accordion-text`) is clipped to the goo over the real label. `textFollow: false`, reduced motion, or a browser without `clip-path: path()` keep the old all-at-once flip.
- 6ba12e7: New component: GoopAlert (shadcn-vue's Alert with Title, Description and Action). When it mounts or appears, its body blooms out of its top edge in a low, wide mound and settles (core `attachAlert`), and the icon wobbles once. Toggles: `bloom`, `wobble`, plus `speed`, `preset` and `goo`.
- cf54a53: New component: GoopBreadcrumb (shadcn-vue's Breadcrumb with List, Item, Link, Page, Separator and Ellipsis). The links' hover / keyboard-focus highlight is one goo blob that flows from link to link with a calm feel and a low swell under the pointer (core `attachBreadcrumbHighlight`, the menu highlight fed `BREADCRUMB_FEEL`). Toggles: `highlight`, `wobble`, `momentum`, `followPointer`, plus `speed`, `preset`, `renderer` and `goo`.
- 4cdbe9c: New component: GoopButtonGroup (shadcn-vue's ButtonGroup with Separator and Text). The buttons flex as one goo body: pressing one squishes it and tugs its neighbours toward it, with no gaps or seams (core `attachButtonGroup`). GoopButtons inside a group leave their own goo off unless they set `goo`. Toggles: `press`, `tug`, plus `speed`, `preset` and `goo`.
- 70321d9: New `GoopCarousel` (shadcn-vue's Carousel on embla-carousel-vue, now a dependency of `@goopui/vue`): slides stretch with momentum and wobble on the snap (`stretch`), their edges slosh (`slosh`), a gooey rubber band past either end (`rubberBand`), goo `GoopCarouselDots` (`dots`), and Previous / Next squish (`squish`). Core: `attachCarousel`, `attachCarouselDots`, `CAROUSEL_FEEL`. Nuxt pre-bundles `embla-carousel-vue`.
- fb0d737: New component: GoopEmpty (shadcn-vue's Empty with Header, Media, Title, Description and Content). The media sits in a low, wide goo puddle of its muted tone that breathes very slowly, about 1px (core `attachEmptyPuddle`: one aria-hidden path and a CSS animation; still under reduced motion). Toggles: `puddle`, `breathe`, plus `speed`, `preset` and `goo`.
- 9661ebc: New component: GoopKbd and GoopKbdGroup (shadcn-vue's Kbd). Clicking a key, or pressing the keys in its opt-in `keys` prop (e.g. `['Meta', 'K']`), squishes it into its base like a soft key, with a small jelly rebound (core `attachKbd`). Toggles: `press`, plus `keys`, `speed`, `preset` and `goo`.
- d8f02ef: New GoopNavigationMenu (shadcn's NavigationMenu on reka-ui, same parts and `navigationMenuTriggerStyle`). One goo highlight flows between the top-level items with momentum (the tabs indicator's feel on the menu highlight engine), and the panel links get their own blob. The viewport blooms out of the active trigger; moving to another trigger slides and resizes it as one goo body with a gentle jelly settle instead of re-opening. With `:viewport="false"` each panel blooms from its own trigger. Toggles: `highlight`, `contentHighlight`, `bloom`, `jelly`, `wobble`, `momentum`, `fade`, `openSlosh`, `openDrips`, `closeSlosh`. Core: `attachNavigationMenuHighlight`, `attachNavigationMenuViewport`, `navigationMenuJellyStep`.
- 161a4ec: Goo page transition (experimental): core `createPageTransition`, Vue `GoopPageTransition` / `useGoopPageTransition` / `goopRouterTransition`, and the opt-in Nuxt module option `pageTransition`.
- d3d2893: New component: GoopPagination (shadcn-vue's Pagination on reka-ui, with Content, Item, Ellipsis, First, Previous, Next, Last and Link). The current page is one goo blob that slides between page numbers with momentum and a gentle stretch (core `attachPaginationIndicator`, the Tabs indicator fed `PAGINATION_FEEL`); First / Previous / Next / Last are ghost GoopButtons that press-squish. Toggles: `indicator`, `wobble`, `momentum`, `press`, plus `speed`, `preset`, `renderer` and `goo`.
- cee3453: Static set (experimental): `GoopSkeleton` (goo shimmer), `GoopBadge` (hover swell on links/buttons), `GoopCard` + parts (opt-in edge swell toward the pointer, core `attachCard`), `GoopAvatar` + image/fallback (gooey settle), and plain `GoopSeparator` / `GoopLabel` ports.
- c1d0536: Opt-in interaction sounds via Cuelume (an optional peer dependency of core; off by default). Core: `enableSound` / `disableSound` / `setSoundEnabled` / `isSoundEnabled`, `playCue`, `cueAttrs`, and the shared cue map `GOOP_SOUND_CUES` / `GOOP_TOAST_CUES`. Vue: a `sound` prop on the interactive components (roots share it with their parts), `provideGoopSound`, and `GoopPlugin`'s `sound` option. Nuxt: `goop.sound`. With sound off, markup is unchanged and Cuelume is never loaded.
- 3064ada: Page transition: a thick band of goo now sweeps through (cover() resolves with it over the middle; `band: false` keeps the full-screen wall), with see-through bubbles that rise, merge and pop into its edges (`bubbles`), an optional `highlight` glow, slower defaults (~1150 ms), and a quick fade-in of the new page as it swaps in (`goopPageFadeIn`, router / Nuxt `fade` option).
- cc9a759: `GoopSkeletonReveal` (core `attachSkeletonReveal`): wraps a loading state with a `#skeleton` slot and the content in the default slot, toggled by `loading`. While loading, the group's GoopSkeleton blocks pool into one goo layer: a slow sheen flows through the group and bridges close blocks, and each block breathes. When `loading` turns false, each block flows into the element replacing it (matched by overlap: avatar, text lines, button, taking the button's colour) with a stagger, then drains away. Effects `sheen`, `breathe`, `melt` (false: a cross-fade), plus `speed` and `preset`. Reduced motion: still blocks and a cross-fade. The standalone GoopSkeleton shimmer mound now swells a little as it crosses.
- f0fb9b5: Visual refresh: every component's classes now follow current shadcn (shadcn/ui React `radix-nova`, which shadcn-vue `reka-nova` shares), so `@goopui/vue` and `@goopui/react` look the same. The motion is unchanged. Highlights: Dialog / AlertDialog / Sheet / Drawer panels are `bg-popover` with a ring, a ghost X close button, a muted footer strip and a blurred `bg-black/10` overlay. Card uses a ring instead of a border, `--card-spacing` and a muted footer. Badge is a pill and its destructive variant is a tint. Toggle's pressed state is `bg-muted`, and its sizes are one step smaller. Accordion rows are tighter (`py-2.5`). Command highlights in `bg-muted`. Combobox uses the Input box. Classes like `data-open:` that reka never matched are spelled out as `data-[state=open]:`. Additive API: `size` on GoopCard, GoopAvatar and GoopAlertDialogContent, `ghost` / `link` badge variants, and a new `GoopAlertDialogMedia`. Apps need shadcn's base layer (`* { @apply border-border outline-ring/50 }`), as any shadcn app has.

### Patch Changes

- d90d56c: Types: cva variant props (`GoopButton` `variant`/`size`, Switch, Toggle, Tabs, ...) were `any` in apps, because the declarations imported the unexported `class-variance-authority/dist/types`. The build now resolves like tsconfig (`Bundler`) and fails on any private deep import. Nuxt: no more `Unknown at rule: @source` build warnings and no raw `@source` in the shipped CSS (the module no longer appends its `@source` to goop.css, whose header comment mentions `@import "tailwindcss"`, and strips goop.css's own `@source` when it injects the file as a separate root).
- 19f1694: GoopDrawerContent: the drag handle is clearly visible on dark. shadcn's `bg-muted` all but vanished on a dark popover, so on dark the handle (goo or plain) is the muted text color mixed into the panel.
- 29a7109: `vue-sonner` is now a regular dependency instead of a peer, so `@goopui/vue` installs and builds with yarn (which doesn't auto-install peers) even if you don't use the Toaster.
- Updated dependencies [b8fe131]
- Updated dependencies [6ba12e7]
- Updated dependencies [cf54a53]
- Updated dependencies [4cdbe9c]
- Updated dependencies [70321d9]
- Updated dependencies [fb0d737]
- Updated dependencies [9661ebc]
- Updated dependencies [d8f02ef]
- Updated dependencies [161a4ec]
- Updated dependencies [d3d2893]
- Updated dependencies [cee3453]
- Updated dependencies [c1d0536]
- Updated dependencies [3064ada]
- Updated dependencies [bc17b88]
- Updated dependencies [cc9a759]
  - @goopui/core@0.1.0-alpha.1

## 0.1.0-alpha.0

### Minor Changes

- First public alpha of goopUI: the `@goopui/core` engine, `@goopui/vue` components and the `@goopui/nuxt` module.

### Patch Changes

- Updated dependencies
  - @goopui/core@0.1.0-alpha.0
