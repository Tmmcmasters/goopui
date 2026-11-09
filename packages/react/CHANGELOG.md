# @goopui/react

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

- Updated dependencies [776ac37]
- Updated dependencies [3cf30ef]
- Updated dependencies [365aeba]
- Updated dependencies [2623a5f]
- Updated dependencies [b859252]
- Updated dependencies [578195e]
  - @goopui/core@0.1.0-alpha.2

## 0.1.0-alpha.1

### Minor Changes

- 02f6e76: `@goopui/react` is now published to npm. Gooey shadcn/ui components for React 18/19 on Radix UI, versioned together with `@goopui/core`, `@goopui/vue` and `@goopui/nuxt`. Every component file is a client component (`'use client'`), so they render from Next.js App Router Server Components. Setup is one line in your Tailwind entry CSS: `@import "@goopui/react/goop.css";`.
- 9aac1af: React ports of Alert, Kbd, Breadcrumb, Empty, Button Group, Pagination, Accordion and Collapsible: shadcn/ui React's parts and current `radix-nova` classes (Radix Accordion, Collapsible, Separator and Slot where shadcn uses them) with the same goo as `@goopui/vue`. The alert blooms in, the kbd squishes, breadcrumb links and the current page share one goo blob each, the empty media sits in a breathing puddle, a button group flexes as one body (a `GoopButton` inside a `GoopButtonGroup` drops its own goo unless it sets `goo`), and accordion / collapsible rows flood from the click point while the content opens on a jelly spring. Pagination follows shadcn/ui React (you mark the current `GoopPaginationLink` with `isActive`); `GoopPaginationFirst` / `GoopPaginationLast` are goopUI extras, as in Vue. Engine props go through `goop-props.ts`, `ref` is the DOM node and `goopRef` the engine handle, and the goo attaches after hydration.
- bc17b88: InputOTP goo: `InputOTPHandle.setActive(index)` puts the goo in a cell (-1: none) as focusing it would (flood, flow from the previous cell, drain), for inputs whose cells aren't focusable themselves, like React's input-otp (one hidden input over render-only slots). Once an adapter drives it, focus on the hidden input no longer clears the cell, and a press over a cell floods it from the press point. Real cell focus (`@goopui/vue`) is unchanged. `@goopui/react` uses it for its new GoopInputOTP, alongside GoopToaster (sonner), GoopCommand (cmdk), GoopCombobox (cmdk + Popover) and GoopNumberField.
- 16b1371: React bloom overlays: GoopPopover, GoopTooltip, GoopHoverCard, GoopAlertDialog (with `size` and GoopAlertDialogMedia) and GoopSheet, 1:1 mirrors of shadcn/ui's Radix components with the same goo as @goopui/vue. Each panel blooms on its own aria-hidden surface (never on the trigger) after hydration; the sheet blooms from the middle of its screen edge and shrinks back into it. `goo={false}` is plain shadcn; `goopRef` gets the engine handle.
- 6820b69: New React component: GoopDrawer (shadcn/ui's Drawer API on Radix Dialog, vaul's root props: `direction`, `snapPoints`, `dismissible`, `handleOnly`...) with every part: `GoopDrawerTrigger`, `Portal`, `Overlay`, `Content`, `Header`, `Footer`, `Title`, `Description`, `Close`. Core's `createDrawer` drives the drag, snap points, springs and goo, as in `@goopui/vue`: the same effect props (`DRAWER_PROP_KEYS`, `toDrawerOptions`: lag, slosh, rise, stretch, handle, splash), plus `goopRef` (drawer controller). `goo={false}` is plain shadcn; reduced motion opens and closes plainly.
- a49923e: React forms batch: `GoopInput`, `GoopTextarea`, `GoopRadioGroup` / `GoopRadioGroupItem`, `GoopSlider`, `GoopProgress`, `GoopToggle` and `GoopToggleGroup` / `GoopToggleGroupItem`. Each is shadcn/ui's React component on its Radix primitive (current `radix-nova` classes) with the same goo, props and defaults as `@goopui/vue`. They server-render shadcn's markup and the goo attaches after hydration; `ref` is the DOM element and `goopRef` the engine handle. React naming where it differs from Vue: `containerClassName` (Vue `containerClass`), `pressed` / `defaultPressed` / `onPressedChange`, `value` / `onValueChange`, and `value={null}` for an indeterminate progress bar.
- e9ffb28: React menus: GoopDropdownMenu, GoopContextMenu, GoopMenubar and GoopNavigationMenu, 1:1 mirrors of shadcn/ui's React components (Radix, current `radix-nova` classes) with the same goo as `@goopui/vue`. Menu panels bloom open (a context menu from the right-click point), the item highlight is a goo blob that trails a low mound under the pointer and doesn't bump across labels or separators, selecting pops it before the menu closes, and submenus bloom out of their row. The menubar's trigger highlight is one goo body; the navigation menu's highlight flows between items and its viewport blooms out of the active trigger and jelly-slides between triggers, with `openDrips` on by default. Same props as Vue (`goo={false}` is plain shadcn); `ref` is the DOM node, `goopRef` / `highlightRef` the engine handles. Hovered items no longer match `:focus-visible` (Radix focuses them from script).
- 6fbc35f: New React component: GoopSelect (shadcn/ui's Select on Radix, `radix-nova` classes) with every part: `GoopSelectTrigger` (`size`), `Value`, `Content`, `Group`, `Label`, `Item`, `Separator`, `ScrollUpButton`, `ScrollDownButton`. The goo matches `@goopui/vue`'s GoopSelectContent: the list blooms out of the selected item (item-aligned) or its own center (popper), the highlight is a goo blob, choosing squishes it and holds the close until the pop has played, and the chosen check mark plops in. Same goo props (`SELECT_PROP_KEYS`, `toSelectOptions`), plus `goopRef` (emerge handle) and `highlightRef` (highlight handle). `goo={false}` is plain shadcn; reduced motion opens and closes plainly.
- 863829e: GoopSidebar, GoopCarousel and GoopPageTransition. Sidebar: shadcn/ui's Sidebar parts (Provider, Trigger, Rail, Inset, Menu*, collapsible modes, `inset` / `floating`) with the goo highlight, active pill, `travel`, edge `slosh` and sub-menu `pour`, and a GoopDrawer on mobile. Carousel: shadcn/ui's Carousel on `embla-carousel-react` (installed with `@goopui/react`) with stretch, slosh, rubber band, squishy Previous / Next and GoopCarouselDots. PageTransition: core's goo page transition with no router dependency: wrap your pages once (Next.js: `routeKey={usePathname()}`), in-app link clicks are held until the page is covered, and `useGoopPageTransition().navigate()` covers programmatic navigation.
- 2ad5136: GoopSidebar uses goopUI's own parts, as in `@goopui/vue`: icon-mode tooltips are GoopTooltips (`tooltips`), the mobile sidebar with `drawer={false}` is a GoopSheet that blooms from its edge (`bloom`), GoopSidebarInput is a GoopInput, and nested GoopCollapsibles get goo by default with their row unfilled (`submenus`; a collapsible's own `goo` / `flood` wins). GoopCollapsible reads these defaults from a small new context.

### Patch Changes

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
