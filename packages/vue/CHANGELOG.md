# @goopui/vue

## 0.1.0-alpha.2

### Minor Changes

- 776ac37: Button Group: every GoopButton inside a GoopButtonGroup now keeps its own goo body (lean, momentum, drips, press squish and splash), exactly like a standalone button. The group marks each button's joined sides and the goo is cut clean at the seams: nothing crosses onto a neighbour, the body reaches under the seam so the strip never opens, and the outer edges bulge, drip and splash as usual. Outline buttons share one 1px seam line.

  - core: new `seams` option on `attachGoop` (`true` follows the host's `data-goop-seams`, or pass the sides), plus `GOOP_SEAMS_ATTR`, `parseGoopSeams`, `goopSeamClip`, `buttonGroupSeams` and the optional renderer method `setBodyBleed`. `attachButtonGroup` gains the `seams` effect (default on) and its `press` / `tug` whole-button flex is now opt-in (default off).
  - vue / react: `GoopButtonGroup` takes `seams`; its `goo={false}` now also makes its buttons plain. `press` and `tug` default to off.

- 365aeba: Table, Item and Input Group, in `@goopui/vue` (shadcn-vue parts, reka-nova classes) and `@goopui/react` (shadcn/ui parts, radix-nova classes).

  - **Table** (`GoopTable` + Header, Body, Footer, Row, Head, Cell, Caption, Empty): the body rows' hover fill is one goo blob that glides from row to row (a calm menu highlight with the pointer swell). It lives in a clipping stage beside the table, on a pill inset into the row, so it never changes the container's scroll size. Opt-in `selected`: the blob rests on the selected row and is its fill. Toggles `highlight`, `wobble`, `momentum`, `followPointer`, `selected`.
  - **Item** (`GoopItem`, `GoopItemGroup` + Media, Content, Title, Description, Actions, Header, Footer, Separator): in a group the interactive items' hover / focus fill is one goo blob; an interactive item squishes a little when pressed and settles with a small jelly bounce (`press`, never past full size). Items inherit `goo`, `press`, `speed`, `preset` from the group.
  - **Input Group** (`GoopInputGroup` + Addon, Button, Text, Input, Textarea): GoopInput's goo focus ring around the whole group; the buttons inside are GoopButtons. Same toggles as GoopInput.
  - core: `attachTableHighlight`, `attachItemGroupHighlight`, `attachItemPress`, `attachInputGroup` (and their feels / constants). `attachMenuHighlight` / `attachListHighlight` take an optional third `layout` argument (`layer`, `rect`, `radius`).

- 2623a5f: Tags Input and Field. `GoopTagsInput` (+ `Item`, `ItemText`, `ItemDelete`, `Input`): shadcn-vue's TagsInput on reka-ui in Vue, and goopUI's own React TagsInput with the same parts and keyboard (shadcn/ui has none). It keeps GoopInput's goo focus ring around the whole box; a new tag plops in like a droplet joining (`merge`), a removed one drains away (`melt`). Core: `attachTagsInput`, `tagMergePose`, `tagMeltPose`, `TAGS_INPUT_EFFECTS`; `attachInput` takes an optional `frame` (the element the ring follows). `GoopField` and its parts (`FieldSet`, `FieldLegend`, `FieldGroup`, `FieldContent`, `FieldLabel`, `FieldTitle`, `FieldDescription`, `FieldSeparator`, `FieldError`): shadcn's Field family, the controls inside keep their own goo, and `GoopFieldError` drips in when it appears (`drip`, `reveal`; core `attachFieldError`, `fieldErrorPose`).
- b859252: New components in Vue and React: Aspect Ratio, Scroll Area and Resizable (shadcn parts and radix-nova classes; reka-ui in Vue, Radix and `react-resizable-panels` in React, which `@goopui/react` now depends on).

  - **GoopAspectRatio**: a plain port, no goo (it only sizes a box).
  - **GoopScrollArea / GoopScrollBar**: the scrollbar thumb is a goo body. It stretches a little with the scroll speed (`stretch`) and, pushed past an end by wheel, trackpad or touch, squashes against it and springs back with a small jelly wobble (`jelly`). Transforms on the thumb's body only: no layout shift, no scroll-size change, and the stretch stays inside the track. Core: `attachScrollArea`, `SCROLL_AREA_EFFECTS`, `SCROLL_AREA_FEEL`, `scrollStretch`, `scrollSquash`, `scrollThumbTransform`.
  - **GoopResizablePanelGroup / GoopResizablePanel / GoopResizableHandle**: the handle's grip (`withHandle`) is a goo bead that swells a little and bulges toward the drag direction in a low, wide mound (`bulge`), then wobbles back like jelly on release (`wobble`). Without a grip the mound rises on the line under the pointer. Props set on the group are inherited by its handles. Core: `attachResizableHandle`, `RESIZABLE_EFFECTS`, `RESIZABLE_FEEL`, `resizableBeadPath`.

  Every effect takes a boolean or a multiplier, plus `speed` and `preset` (`subtle | playful | wild`); `goo: false` renders plain shadcn. Reduced motion: static, no sim.

- 578195e: The menu highlight blob over any list of links or buttons: core `attachListHighlight(list, { items, active, hover })` and Vue `useGoopListHighlight(el, options, enabled)`. The blob follows hover (mouse / pen, never touch) and keyboard focus, and rests on the `active` item (the current page, the section in view) otherwise. Reduced motion: it snaps.

### Patch Changes

- 3cf30ef: Fixes found by the new demo smoke + axe check:

  - Core `attachToggleGroup` no longer counts its own text-follow copies as items. With an item selector like `[data-slot="toggle-group-item"]` (React's GoopToggleGroup) un-pressing a pressed item froze the page in a MutationObserver loop.
  - A one-thumb GoopSlider's `aria-label` / `aria-labelledby` also names its thumb (the focusable `role="slider"`).
  - GoopCarouselDots space the dots 16px apart, so each dot's target is 24px (WCAG 2.2 target size).
  - GoopCommandSeparator is decorative (`role="none"`): a listbox may only own groups and options. Vue's GoopCommandList is named "Suggestions" by default, like cmdk's.
  - Destructive menu items on a tinted goo surface (`surface="trigger"`) mix toward the surface's text color, so they stay readable.
  - Vue: GoopComboboxInput drops reka's stale `aria-activedescendant` while the list is closed; GoopDrawer no longer leaves the page `aria-hidden` after a second drawer closes (reka's aria-hidden cleanup ran twice).
  - React: GoopComboboxInput's `aria-expanded` / `aria-controls` follow the popover (cmdk hardcodes them); GoopTabs keeps every panel element in the DOM (hidden while inactive, children still unmounted), and a trigger without a panel names no `aria-controls`, as in reka-ui. GoopPopoverContent's dialog is named by its trigger (as in reka-ui), and GoopComboboxList's popup is no longer an unnamed `role="dialog"` around the listbox. GoopScrollArea's viewport is focusable (`tabIndex={0}`, as reka-ui's is), so keyboard users can scroll it.

- 1751ccc: GoopItemGroup / GoopItem: valid list semantics. A group of plain items is a `role="list"` of `role="listitem"` items; a group with a link or button item (`as-child` / `asChild`, `as="a" | "button"`, a component `as`) has no list role, so its items keep their link / button semantics (a `listitem` role would replace them). Decided from the items' props while rendering, so SSR and hydration match; a `role` on the group or an item wins. Fixes axe `aria-required-children` on shadcn's ItemGroup markup.
- 36a1d4f: Phone-review feel fixes.

  - Toggle / ToggleGroup: a pressed goo toggle is filled with the on color again, so on and off read at a glance (since the shadcn style refresh it was shadcn's grey, the same as hover). New tokens `--goop-toggle-on` / `--goop-toggle-on-foreground`, settable on `:root` or any ancestor, default the theme's `--primary` / `--primary-foreground`. Before the goo attaches (SSR, first paint) the pressed background is that color too. Un-pressed hover stays shadcn's grey.
  - Dark mode: the Command highlight blob, the Breadcrumb hover blob and the Empty puddle are foreground mixed into the surface instead of `--muted`, which is nearly the page color on dark. Light mode is unchanged.
  - vue: DropdownMenu, ContextMenu and Menubar items no longer match `:focus-visible` when reka focuses them on hover (same `quietFocus` as the React menus), so a page's focus ring shows only for keyboard focus.

- 927792c: Remove an unused import (GoopDrawerContent) and a string template ref vue-tsc reports as unused (GoopCarouselContent), so the components type-check in apps with `noUnusedLocals`, as when installed from the shadcn-vue registry.
- 3a1bd7d: Install fixes found by testing the packed packages in real apps:

  - `@goopui/nuxt`: auto-imported components are typed again with pnpm. The generated `components.d.ts` imports `@goopui/vue`, which an app that only installs `@goopui/nuxt` can't resolve under pnpm, so every component was `any`; the module now maps `@goopui/vue` for TypeScript.
  - `@goopui/nuxt`: builds no longer fail with `Rollup failed to resolve import "vue-sonner"` when the app doesn't have its own `vue-sonner` (pnpm, or npm in a Nuxt 3 app). `vue-sonner` is only deduped when the app installs it.
  - `@goopui/vue`: declarations use explicit `.js` / `/index.js` relative imports, so apps on `moduleResolution: "node16"` / `"nodenext"` get types.
  - `@goopui/vue`: the `vue` peer is now `^3.5.2`. Vue 3.5.0 and 3.5.1 run, but their types turn every component into `any`.

- Updated dependencies [776ac37]
- Updated dependencies [3cf30ef]
- Updated dependencies [365aeba]
- Updated dependencies [2623a5f]
- Updated dependencies [b859252]
- Updated dependencies [578195e]
  - @goopui/core@0.1.0-alpha.2

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
