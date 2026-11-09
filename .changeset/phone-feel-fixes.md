---
'@goopui/vue': patch
'@goopui/react': patch
---

Phone-review feel fixes.

- Toggle / ToggleGroup: a pressed goo toggle is filled with the on color again, so on and off read at a glance (since the shadcn style refresh it was shadcn's grey, the same as hover). New tokens `--goop-toggle-on` / `--goop-toggle-on-foreground`, settable on `:root` or any ancestor, default the theme's `--primary` / `--primary-foreground`. Before the goo attaches (SSR, first paint) the pressed background is that color too. Un-pressed hover stays shadcn's grey.
- Dark mode: the Command highlight blob, the Breadcrumb hover blob and the Empty puddle are foreground mixed into the surface instead of `--muted`, which is nearly the page color on dark. Light mode is unchanged.
- vue: DropdownMenu, ContextMenu and Menubar items no longer match `:focus-visible` when reka focuses them on hover (same `quietFocus` as the React menus), so a page's focus ring shows only for keyboard focus.
