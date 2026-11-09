<script setup lang="ts">
// Live breadcrumb demos for the Breadcrumb docs page: real <GoopBreadcrumb>. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'slash' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/batch-simple.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="breadcrumb" :set="set" :pg="{ main: pg.props }" />
  <div v-else class="breadcrumb-demo">
    <GoopBreadcrumb v-if="set === 'basic'" v-bind="pg.props">
      <GoopBreadcrumbList>
        <GoopBreadcrumbItem>
          <GoopBreadcrumbLink href="#" @click.prevent>Home</GoopBreadcrumbLink>
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator />
        <GoopBreadcrumbItem>
          <GoopBreadcrumbEllipsis />
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator />
        <GoopBreadcrumbItem>
          <GoopBreadcrumbLink href="#" @click.prevent>Components</GoopBreadcrumbLink>
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator />
        <GoopBreadcrumbItem>
          <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
        </GoopBreadcrumbItem>
      </GoopBreadcrumbList>
    </GoopBreadcrumb>

    <GoopBreadcrumb v-else>
      <GoopBreadcrumbList>
        <GoopBreadcrumbItem>
          <GoopBreadcrumbLink href="#" @click.prevent>Home</GoopBreadcrumbLink>
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
        <GoopBreadcrumbItem>
          <GoopBreadcrumbLink href="#" @click.prevent>Docs</GoopBreadcrumbLink>
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
        <GoopBreadcrumbItem>
          <GoopBreadcrumbLink href="#" @click.prevent>Components</GoopBreadcrumbLink>
        </GoopBreadcrumbItem>
        <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
        <GoopBreadcrumbItem>
          <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
        </GoopBreadcrumbItem>
      </GoopBreadcrumbList>
    </GoopBreadcrumb>
  </div>
</template>

<style>
/* The docs prose styles lists and links. The demo is app UI: undo those. */
.prose .breadcrumb-demo ol,
.prose .breadcrumb-demo li {
  margin: 0;
  padding: 0;
  list-style: none;
}
.prose .breadcrumb-demo a {
  color: inherit;
  font-weight: inherit;
  text-decoration: none;
}
.prose .breadcrumb-demo a:hover,
.prose .breadcrumb-demo a[data-goop-lit] {
  color: var(--foreground);
}
</style>
