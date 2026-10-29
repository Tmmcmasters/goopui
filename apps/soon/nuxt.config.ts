import tailwindcss from '@tailwindcss/vite'

// goop.timmcmasters.work: a one-page "coming soon" with four live components.
// `nuxt generate` prerenders `/` into .output/public (fully static); the goo hydrates client-side.
const site = 'https://goop.timmcmasters.work'
const title = 'goopUI: coming soon'
const description =
  'goopUI: shadcn-style Vue components that drip, squish, and wobble. Coming soon. Poke a few of them now.'

export default defineNuxtConfig({
  modules: ['@goopui/nuxt'],
  compatibilityDate: '2026-10-25',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  nitro: { prerender: { routes: ['/'], crawlLinks: false } },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title,
      meta: [
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: site },
        { property: 'og:site_name', content: 'goopUI' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${site}/og.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'goopUI: Components that drip.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${site}/og.png` },
        { name: 'theme-color', content: '#faf8f3', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#141210', media: '(prefers-color-scheme: dark)' },
      ],
      link: [
        { rel: 'canonical', href: site },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      ],
    },
  },
})
