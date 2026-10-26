<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import type { GoopPropsInput } from '@goopui/vue'
import { ArrowRightIcon } from '@lucide/vue'

const variants: NonNullable<ButtonVariants['variant']>[] = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']
const sizes: NonNullable<ButtonVariants['size']>[] = ['xs', 'sm', 'default', 'lg']

/** How each variant turns into goo (see @goopui/vue variants.ts). */
const gooNotes: Record<string, string> = {
  default: 'solid goo in --primary',
  secondary: 'solid goo in --secondary',
  destructive: 'destructive goo at 10% layer opacity (true tint)',
  outline: '1px goo stroke in --border, fill rides the body',
  ghost: 'goo only on hover / press, --muted',
  link: 'no goo',
}

/** Engine props from the panel, applied to every GoopButton on the page. */
const engine = ref<GoopPropsInput>({})
</script>

<template>
  <ComparePage path="/button">
    <template #controls>
      <GoopPropsPanel v-model="engine" />
    </template>

    <CompareRow v-for="variant in variants" :key="variant" :label="variant" :note="gooNotes[variant]">
      <template #shadcn>
        <Button :variant="variant">
          Button
        </Button>
        <Button :variant="variant" disabled>
          Disabled
        </Button>
      </template>
      <template #goop>
        <GoopButton :variant="variant" v-bind="engine">
          Button
        </GoopButton>
        <GoopButton :variant="variant" v-bind="engine" disabled>
          Disabled
        </GoopButton>
      </template>
    </CompareRow>

    <CompareRow label="sizes">
      <template #shadcn>
        <Button v-for="size in sizes" :key="size" :size="size">
          {{ size }}
        </Button>
      </template>
      <template #goop>
        <GoopButton v-for="size in sizes" :key="size" :size="size" v-bind="engine">
          {{ size }}
        </GoopButton>
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
      <template #goop>
        <GoopButton v-bind="engine">
          Continue <ArrowRightIcon data-icon="inline-end" />
        </GoopButton>
        <GoopButton variant="outline" size="icon" aria-label="Next" v-bind="engine">
          <ArrowRightIcon />
        </GoopButton>
      </template>
    </CompareRow>

    <CompareRow label="asChild" note="NuxtLink rendered as the button">
      <template #shadcn>
        <Button as-child>
          <NuxtLink to="/">
            Home
          </NuxtLink>
        </Button>
      </template>
      <template #goop>
        <GoopButton as-child v-bind="engine">
          <NuxtLink to="/">
            Home
          </NuxtLink>
        </GoopButton>
      </template>
    </CompareRow>
  </ComparePage>
</template>
