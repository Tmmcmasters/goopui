// v-reveal: fade + rise once when an element scrolls into view.
// SSR renders `data-reveal`; CSS hides it only when <html class="js"> and motion is allowed,
// so content is never stuck invisible. Value = stagger delay in ms.
import type { Directive } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  let io: IntersectionObserver | null = null
  const observer = () => {
    if (io || !import.meta.client) return io
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          ;(e.target as HTMLElement).dataset.revealed = ''
          io?.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 },
    )
    return io
  }

  const reveal: Directive<HTMLElement, number | undefined> = {
    getSSRProps(binding) {
      return {
        'data-reveal': '',
        style: binding.value ? `--reveal-delay:${binding.value}ms` : undefined,
      }
    },
    mounted(el, binding) {
      el.dataset.reveal = ''
      if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
      observer()?.observe(el)
    },
    unmounted(el) {
      io?.unobserve(el)
    },
  }

  nuxtApp.vueApp.directive('reveal', reveal)
})

declare module 'vue' {
  interface GlobalDirectives {
    vReveal: Directive<HTMLElement, number | undefined>
  }
}
