---
'@goopui/react': minor
---

GoopSidebar uses goopUI's own parts, as in `@goopui/vue`: icon-mode tooltips are GoopTooltips (`tooltips`), the mobile sidebar with `drawer={false}` is a GoopSheet that blooms from its edge (`bloom`), GoopSidebarInput is a GoopInput, and nested GoopCollapsibles get goo by default with their row unfilled (`submenus`; a collapsible's own `goo` / `flood` wins). GoopCollapsible reads these defaults from a small new context.
