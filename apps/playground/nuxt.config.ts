import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['shadcn-nuxt'],
  compatibilityDate: '2026-10-25',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: {
    // Unprefixed so pages read like shadcn docs (<Button>). Goop components use the Goop prefix.
    prefix: '',
    componentDir: '@/components/ui',
  },
})
