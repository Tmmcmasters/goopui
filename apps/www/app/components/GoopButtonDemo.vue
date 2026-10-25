<script setup lang="ts">
// A styled <button> on top of GoopHost: what GoopButton will roughly look like.
// Not the real component (that ships in @goopui/vue); just enough for the site's demos.
import type { GoopOptions } from '@goopui/core'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'destructive' | 'secondary' | 'goo'
    size?: 'sm' | 'md' | 'lg'
    shape?: 'rounded' | 'pill'
    disabled?: boolean
    options?: GoopOptions
  }>(),
  { variant: 'default', size: 'md', shape: 'rounded', disabled: false, options: () => ({}) },
)

const host = ref<{ getHandle: () => import('@goopui/core').GoopHandle | null; refresh: () => void } | null>(null)
const opts = computed<GoopOptions>(() => ({ ...props.options, disabled: props.disabled }))

defineExpose({
  getHandle: () => host.value?.getHandle() ?? null,
  refresh: () => host.value?.refresh(),
})
</script>

<template>
  <GoopHost
    ref="host"
    as="button"
    type="button"
    class="goop-btn"
    :data-variant="variant"
    :data-size="size"
    :data-shape="shape"
    :disabled="disabled"
    :options="opts"
  >
    <slot />
  </GoopHost>
</template>
