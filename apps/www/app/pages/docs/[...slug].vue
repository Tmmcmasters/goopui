<script setup lang="ts">
definePageMeta({ layout: 'docs' })

const route = useRoute()

const { data: page } = await useAsyncData(`docs:${route.path}`, () => queryCollection('docs').path(route.path).first(), {
  watch: [() => route.path],
})
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: surround } = await useAsyncData(
  `docs-surround:${route.path}`,
  () => queryCollectionItemSurroundings('docs', route.path, { fields: ['title', 'description'] }),
  { watch: [() => route.path] },
)

const { data: nav } = await useDocsNav()
const section = computed(() => nav.value?.find((s) => route.path.startsWith(s.path))?.title)

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
})
</script>

<template>
  <div v-if="page" class="flex gap-12 xl:gap-16">
    <article class="min-w-0 max-w-[46rem] flex-1 pb-24 pt-10 lg:pl-10 lg:pt-12 xl:pl-14">
      <header class="mb-10">
        <p v-if="section" class="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{{ section }}</p>
        <h1 class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[2.6rem]">
          {{ page.title }}
          <span
            v-if="page.status === 'soon'"
            class="rounded-full px-2 py-0.5 align-middle font-mono text-[11px] font-normal uppercase tracking-wider text-muted-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]"
          >
            Coming soon
          </span>
        </h1>
        <p v-if="page.description" class="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {{ page.description }}
        </p>
      </header>

      <ContentRenderer :value="page" class="prose" />

      <DocsPager :prev="surround?.[0]" :next="surround?.[1]" />
    </article>

    <aside class="hidden w-52 shrink-0 xl:block">
      <div class="sticky top-[var(--header-h)] max-h-[calc(100dvh-var(--header-h))] overflow-y-auto pb-10 pt-12" data-lenis-prevent>
        <DocsToc :links="page.body?.toc?.links ?? []" />
      </div>
    </aside>
  </div>
</template>
