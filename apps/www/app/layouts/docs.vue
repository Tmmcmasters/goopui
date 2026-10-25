<script setup lang="ts">
// Docs shell: header, left nav (sticky, scrolls natively), content slot (the page renders
// its own TOC column via the #toc slot so it can pass its headings).
const route = useRoute()
const { data: nav } = await useDocsNav()
const title = computed(() => {
  for (const s of nav.value ?? []) for (const i of s.children ?? []) if (i.path === route.path) return i.title
  return ''
})
</script>

<template>
  <div class="flex min-h-dvh flex-col overflow-x-clip">
    <!-- overflow-x: clip keeps goo layers that pad past the viewport edge from adding
         horizontal scroll, without making a scroll container (sticky still works). -->

    <SiteHeader wide />
    <div class="pt-[var(--header-h)]">
      <DocsMobileNav :title="title" />
      <div class="mx-auto flex w-full max-w-[1440px] px-4 sm:px-6">
        <aside class="hidden w-60 shrink-0 lg:block">
          <div
            class="sticky top-[var(--header-h)] -ml-2.5 h-[calc(100dvh-var(--header-h))] overflow-y-auto overscroll-contain pb-10 pr-4 pt-10"
            data-lenis-prevent
          >
            <DocsNav />
          </div>
        </aside>
        <main id="main" class="min-w-0 flex-1">
          <slot />
        </main>
      </div>
    </div>
    <SiteFooter wide />
  </div>
</template>
