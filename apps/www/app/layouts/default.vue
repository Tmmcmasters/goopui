<template>
  <div class="flex min-h-dvh flex-col overflow-x-clip">
    <!-- overflow-x: clip keeps goo layers that pad past the viewport edge from adding
         horizontal scroll, without making a scroll container (sticky still works). -->

    <SiteHeader />
    <main id="main" class="flex-1">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
