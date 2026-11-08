<script setup lang="ts">
// Live breadcrumb demos for the Breadcrumb docs page: real <GoopBreadcrumb>. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'slash' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
</script>

<template>
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
</template>
