<script setup lang="ts">
// Markdown links. Internal /docs links stay in the reader's framework: on a React page,
// `/docs/getting-started/theming` goes to `/react/docs/getting-started/theming`.
const props = defineProps<{ href?: string; target?: string }>()
const { to } = useFramework()
const href = computed(() => (props.href?.startsWith('/docs') ? to(props.href) : props.href))
</script>

<template>
  <NuxtLink :href="href" :target="target"><slot /></NuxtLink>
</template>
