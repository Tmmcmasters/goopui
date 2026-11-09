<script setup lang="ts">
// On-page TOC. The section in view is marked by the site chrome's goo blob (useChromeGoo),
// which also follows hover / keyboard focus and slides back to it. Links are plain #anchors;
// the Lenis plugin intercepts them (smooth + header offset), or the browser jumps natively
// under reduced motion.
import type { TocLink } from '@nuxt/content'

const props = defineProps<{ links: TocLink[] }>()

const flat = computed(() => {
  const out: { id: string; text: string; depth: number }[] = []
  const walk = (ls: TocLink[]) => {
    for (const l of ls) {
      out.push({ id: l.id, text: l.text, depth: l.depth })
      if (l.children) walk(l.children)
    }
  }
  walk(props.links)
  return out
})

const active = ref<string | null>(null)
const list = ref<HTMLElement | null>(null)
useChromeGoo(() => list.value, { active: '[aria-current]' })

let raf = 0
const measure = () => {
  raf = 0
  const offset = headerOffset() + 8
  let current: string | null = null
  for (const item of flat.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= offset) current = item.id
  }
  // At the very bottom, the last heading wins even if it can't reach the top.
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    current = flat.value.at(-1)?.id ?? current
  }
  active.value = current ?? flat.value[0]?.id ?? null
}
const onScroll = () => {
  if (!raf) raf = requestAnimationFrame(measure)
}

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
watch(flat, () => nextTick(measure))
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <nav v-if="flat.length" aria-label="On this page" class="text-[13px]">
    <p class="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">On this page</p>
    <div class="border-l border-border pl-1.5">
      <ul ref="list" class="toc-list" data-chrome-goo>
        <li v-for="l in flat" :key="l.id">
          <a
            :href="`#${l.id}`"
            :data-id="l.id"
            class="toc-link block rounded-md py-1 pr-2 leading-snug"
            :class="l.depth > 2 ? 'pl-6' : 'pl-2.5'"
            data-chrome-item
            :aria-current="active === l.id ? 'location' : undefined"
          >
            {{ l.text }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.toc-link {
  color: var(--muted-foreground);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.toc-link:hover {
  color: var(--foreground);
}
.toc-link:focus-visible {
  outline-offset: -2px;
  border-radius: 0.375rem;
}
.toc-link[aria-current] {
  color: var(--foreground);
  background: var(--muted);
}
</style>
