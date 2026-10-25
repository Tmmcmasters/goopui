<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import { ArrowRightIcon } from '@lucide/vue'

const variants: NonNullable<ButtonVariants['variant']>[] = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
const sizes: NonNullable<ButtonVariants['size']>[] = ['xs', 'sm', 'default', 'lg']
</script>

<template>
  <ComparePage path="/button">
    <CompareRow v-for="variant in variants" :key="variant" :label="variant">
      <template #shadcn>
        <Button :variant="variant">
          Button
        </Button>
        <Button :variant="variant" disabled>
          Disabled
        </Button>
      </template>
    </CompareRow>

    <CompareRow label="sizes">
      <template #shadcn>
        <Button v-for="size in sizes" :key="size" :size="size">
          {{ size }}
        </Button>
      </template>
    </CompareRow>

    <CompareRow label="icon">
      <template #shadcn>
        <Button>
          Continue <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Next">
          <ArrowRightIcon />
        </Button>
      </template>
    </CompareRow>
  </ComparePage>
</template>
