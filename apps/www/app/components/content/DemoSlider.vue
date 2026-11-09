<script setup lang="ts">
// Live GoopSlider demos for the Slider docs page. `set` picks the group. Keep each set in
// sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'range' | 'vertical' | 'steps' | 'effects' | 'disabled' }>(), { set: 'basic' })

const single = ref([50])
const range = ref([25, 75])
const vertical = ref([40])
const steps = ref([30])
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/forms.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="slider" :set="set" :pg="{ main: pg.props }" />
  <div v-else-if="set === 'basic'" class="grid w-full max-w-sm gap-3">
    <GoopSlider v-model="single" :max="100" :step="1" aria-label="Volume" v-bind="pg.props" />
    <span class="font-mono text-xs text-muted-foreground">{{ single[0] }}</span>
  </div>
  <div v-else-if="set === 'range'" class="grid w-full max-w-sm gap-3">
    <GoopSlider v-model="range" :max="100" :step="1" aria-label="Price range" />
    <span class="font-mono text-xs text-muted-foreground">{{ range[0] }} to {{ range[1] }}</span>
  </div>
  <div v-else-if="set === 'vertical'" class="h-44">
    <GoopSlider v-model="vertical" orientation="vertical" :max="100" :step="1" aria-label="Level" />
  </div>
  <div v-else-if="set === 'steps'" class="grid w-full max-w-sm gap-3">
    <GoopSlider v-model="steps" :max="100" :step="10" aria-label="Quality" />
    <span class="font-mono text-xs text-muted-foreground">{{ steps[0] }}</span>
  </div>
  <div v-else-if="set === 'effects'" class="grid w-full max-w-sm gap-6">
    <GoopSlider :default-value="[40]" :jelly="false" :stretch="false" aria-label="Slosh and splat only" />
    <GoopSlider :default-value="[60]" preset="wild" aria-label="Wild" />
    <GoopSlider :default-value="[60]" preset="subtle" aria-label="Subtle" />
  </div>
  <div v-else class="w-full max-w-sm">
    <GoopSlider :default-value="[40]" disabled aria-label="Disabled" />
  </div>
</template>
