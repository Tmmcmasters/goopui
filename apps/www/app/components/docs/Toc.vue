<script setup lang="ts">
// On-page TOC with a sliding active marker. Links are plain #anchors; the Lenis plugin
// intercepts them (smooth + header offset), or the browser jumps natively under reduced motion.
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
const marker = reactive({ y: 0, h: 0, show: false })

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

watch(active, async (id) => {
  await nextTick()
  const a = id ? list.value?.querySelector<HTMLElement>(`a[data-id="${CSS.escape(id)}"]`) : null
  if (!a) {
    marker.show = false
    return
  }
  marker.y = a.offsetTop
  marker.h = a.offsetHeight
  marker.show = true
})

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
    <div ref="list" class="relative border-l border-border">
      <span
        class="marker"
        aria-hidden="true"
        :style="{ transform: `translateY(${marker.y}px)`, height: `${marker.h}px`, opacity: marker.show ? 1 : 0 }"
      />
      <ul>
        <li v-for="l in flat" :key="l.id">
          <a
            :href="`#${l.id}`"
            :data-id="l.id"
            class="toc-link block py-1 leading-snug"
            :class="l.depth > 2 ? 'pl-7' : 'pl-4'"
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
.marker {
  position: absolute;
  left: -1px;
  top: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--foreground);
  transition:
    transform 260ms var(--ease-out-strong),
    height 260ms var(--ease-out-strong),
    opacity 150ms ease;
}
.toc-link {
  color: var(--muted-foreground);
  transition: color 150ms ease;
}
.toc-link:hover {
  color: var(--foreground);
}
.toc-link[aria-current] {
  color: var(--foreground);
}
@media (prefers-reduced-motion: reduce) {
  .marker {
    transition: opacity 150ms ease;
  }
}
html[data-reduced-motion='true'] .marker {
  transition: opacity 150ms ease;
}
</style>
