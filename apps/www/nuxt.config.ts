import { tmpdir } from 'node:os'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

// SQLite can't write on this repo's exFAT drive ("attempt to write a readonly database"),
// so Nuxt Content's databases live in the OS temp dir. Override with CONTENT_DB_DIR
// (e.g. on a deploy target that wants them elsewhere).
// Runs before first paint on every page (including error pages): theme class,
// the site's reduced-motion switch, and the `js` class that lets scroll reveals hide
// content (no JS = everything visible). Keys match useTheme / useMotionPreference.
const boot = `(function(){try{var d=document.documentElement;d.classList.add('js');var t=localStorage.getItem('goop-theme');var dark=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);if(localStorage.getItem('goop-reduced-motion')==='true')d.dataset.reducedMotion='true'}catch(e){}})()`

const dbDir = process.env.CONTENT_DB_DIR || join(tmpdir(), 'goopui-www-content')

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@goopui/nuxt'],
  compatibilityDate: '2026-10-25',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', 'vue-sonner/style.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { include: ['lenis'] },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'goopUI',
      meta: [
        { name: 'description', content: 'goopUI: shadcn-style components that drip, squish, and wobble. Same API, built on reka-ui.' },
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: '/og.png' },
        { name: 'theme-color', content: '#faf8f3', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#141210', media: '(prefers-color-scheme: dark)' },
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
