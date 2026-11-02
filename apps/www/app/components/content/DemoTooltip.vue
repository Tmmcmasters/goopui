<script setup lang="ts">
// Live tooltip demos for the Tooltip docs page: real <GoopTooltip>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'sides' | 'surface' }>(), { set: 'basic' })
const sides = ['top', 'right', 'bottom', 'left'] as const
</script>

<template>
  <GoopTooltipProvider>
    <GoopTooltip v-if="set === 'basic'">
      <GoopTooltipTrigger as-child>
        <GoopButton variant="outline">Hover me</GoopButton>
      </GoopTooltipTrigger>
      <GoopTooltipContent>Add to library</GoopTooltipContent>
    </GoopTooltip>

    <template v-else-if="set === 'sides'">
      <GoopTooltip v-for="side in sides" :key="side">
        <GoopTooltipTrigger as-child>
          <GoopButton variant="outline" size="sm">{{ side }}</GoopButton>
        </GoopTooltipTrigger>
        <GoopTooltipContent :side="side">Tooltip on the {{ side }}</GoopTooltipContent>
      </GoopTooltip>
    </template>

    <template v-else>
      <GoopTooltip>
        <GoopTooltipTrigger as-child>
          <GoopButton>Trigger color</GoopButton>
        </GoopTooltipTrigger>
        <GoopTooltipContent surface="trigger">Takes the trigger's color</GoopTooltipContent>
      </GoopTooltip>
      <GoopTooltip>
        <GoopTooltipTrigger as-child>
          <GoopButton variant="outline">CSS color</GoopButton>
        </GoopTooltipTrigger>
        <GoopTooltipContent surface="oklch(0.62 0.19 150)">Any CSS color</GoopTooltipContent>
      </GoopTooltip>
      <GoopTooltip>
        <GoopTooltipTrigger as-child>
          <GoopButton variant="secondary">Bigger splash</GoopButton>
        </GoopTooltipTrigger>
        <GoopTooltipContent :open-drips="1.5">A bigger splash</GoopTooltipContent>
      </GoopTooltip>
    </template>
  </GoopTooltipProvider>
</template>
