<script setup lang="ts">
// Live button demos for the Button docs page: real <GoopButton>s. `set` picks the group.
// Inside a <Preview>, the frame's controls drive them through useGoopStage (timeScale,
// splash, drip()). Keep each set in sync with the code sample beside it in the docs.
withDefaults(
  defineProps<{
    set?: 'variants' | 'sizes' | 'resting' | 'disabled' | 'oil' | 'features' | 'link'
  }>(),
  { set: 'variants' },
)
const stage = useGoopStage()
</script>

<template>
  <template v-if="set === 'variants'">
    <GoopButton :ref="stage.register" v-bind="stage.props">Default</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="secondary">Secondary</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="destructive">Destructive</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="outline">Outline</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="ghost">Ghost</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="link">Link</GoopButton>
  </template>
  <template v-else-if="set === 'sizes'">
    <GoopButton :ref="stage.register" v-bind="stage.props" size="xs">Extra small</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" size="sm">Small</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props">Default</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" size="lg">Large</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" size="icon" aria-label="Next">
      <SiteIcon name="arrowRight" :size="16" />
    </GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" class="rounded-full">Pill</GoopButton>
  </template>
  <template v-else-if="set === 'resting'">
    <GoopButton :ref="stage.register" v-bind="stage.props" :resting-drips="1">One drip</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" variant="destructive" :resting-drips="2">Two drips</GoopButton>
    <GoopButton
      :ref="stage.register"
      v-bind="stage.props"
      class="rounded-full"
      :resting-drips="[0.2, 0.32, 0.8]"
      :drip-length="20"
    >
      Placed: 0.2, 0.32, 0.8
    </GoopButton>
  </template>
  <template v-else-if="set === 'oil'">
    <GoopButton :ref="stage.register" v-bind="stage.props" size="lg" finish="oil" class="bg-oil text-oil-foreground [--goop-color:var(--oil)]">
      Crude oil
    </GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" size="lg" variant="destructive" finish="oil">Oil on red</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" size="lg" variant="secondary" finish="oil">Oil on light</GoopButton>
  </template>
  <template v-else-if="set === 'features'">
    <GoopButton :ref="stage.register" v-bind="stage.props" :shockwave="false" taffy>Taffy, no shockwave</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" gloss reach>Gloss and reach</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" preset="wild" variant="secondary">Wild</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" preset="subtle" variant="outline">Subtle</GoopButton>
  </template>
  <template v-else-if="set === 'link'">
    <GoopButton :ref="stage.register" v-bind="stage.props" as-child>
      <NuxtLink to="/docs/getting-started/installation">Installation guide</NuxtLink>
    </GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" as-child variant="outline">
      <NuxtLink to="/docs/getting-started/theming">Theming</NuxtLink>
    </GoopButton>
  </template>
  <template v-else>
    <GoopButton :ref="stage.register" v-bind="stage.props" disabled>Disabled</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" :drips="false">No drips, squish only</GoopButton>
    <GoopButton :ref="stage.register" v-bind="stage.props" :goo="false" variant="outline">Plain shadcn (goo off)</GoopButton>
  </template>
</template>
