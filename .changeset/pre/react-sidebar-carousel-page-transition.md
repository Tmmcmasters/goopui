---
'@goopui/react': minor
---

GoopSidebar, GoopCarousel and GoopPageTransition. Sidebar: shadcn/ui's Sidebar parts (Provider, Trigger, Rail, Inset, Menu*, collapsible modes, `inset` / `floating`) with the goo highlight, active pill, `travel`, edge `slosh` and sub-menu `pour`, and a GoopDrawer on mobile. Carousel: shadcn/ui's Carousel on `embla-carousel-react` (installed with `@goopui/react`) with stretch, slosh, rubber band, squishy Previous / Next and GoopCarouselDots. PageTransition: core's goo page transition with no router dependency: wrap your pages once (Next.js: `routeKey={usePathname()}`), in-app link clicks are held until the page is covered, and `useGoopPageTransition().navigate()` covers programmatic navigation.
