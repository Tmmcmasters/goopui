import { tmpdir } from 'node:os'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

// SQLite can't write on this repo's exFAT drive ("attempt to write a readonly database"),
// so Nuxt Content's databases live in the OS temp dir. Override with CONTENT_DB_DIR
// (e.g. on a deploy target that wants them elsewhere).
// Dark is the default theme (the landing is designed dark); the toggle stores 'light'.
// Runs before first paint on every page (including error pages): theme class,
// the site's reduced-motion switch, and the `js` class that lets scroll reveals hide
// content (no JS = everything visible). Keys match useTheme / useMotionPreference.
const boot = `(function(){try{var d=document.documentElement;d.classList.add('js');var t=localStorage.getItem('goop-theme');var dark=t!=='light';d.classList.toggle('dark',dark);if(localStorage.getItem('goop-reduced-motion')==='true')d.dataset.reducedMotion='true'}catch(e){}})()`

const site = 'https://goop.timmcmasters.work'
const description =
  'goopUI is the shadcn catalog made gooey: same components, same API, built on reka-ui, with drips and squish from a tiny physics engine. Alpha.'

const dbDir = process.env.CONTENT_DB_DIR || join(tmpdir(), 'goopui-www-content')

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@goopui/nuxt'],
  // Interaction sounds (Cuelume) on every goop component.
  goop: { sound: true },
  compatibilityDate: '2026-10-25',
  experimental: {
    // Prefetch a link's page chunk + payload when it scrolls into view (on idle) AND as soon as
    // it's hovered, focused or touched: idle can come late on a busy page (the landing's lava
    // lamp).
    defaults: { nuxtLink: { prefetchOn: { visibility: true, interaction: true } } },
  },
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { include: ['lenis', 'cuelume'] },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'goopUI',
      meta: [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: site },
        { property: 'og:site_name', content: 'goopUI' },
        { property: 'og:title', content: 'goopUI: components that drip' },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${site}/og.png` },
        { property: 'og:image:alt', content: 'goopUI: Components that drip.' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'goopUI: components that drip' },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${site}/og.png` },
        { name: 'theme-color', content: '#141210' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      ],
      script: [{ innerHTML: boot, tagPosition: 'head' }],
    },
  },
  content: {
    _localDatabase: { type: 'sqlite', filename: join(dbDir, 'local.sqlite') },
    database: { type: 'sqlite', filename: join(dbDir, 'contents.sqlite') },
    experimental: {
      // Node >= 22.5 ships node:sqlite, so no native addon (and no blocked install script).
      sqliteConnector: 'native',
    },
    build: {
      markdown: {
        toc: { depth: 3, searchDepth: 3 },
        highlight: {
          theme: { default: 'github-light', dark: 'github-dark' },
          langs: ['ts', 'js', 'vue', 'html', 'css', 'shell', 'bash', 'json'],
        },
      },
    },
  },
})
