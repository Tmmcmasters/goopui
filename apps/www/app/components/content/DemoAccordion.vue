<script setup lang="ts">
// Live accordion / collapsible demos for the Accordion docs page: real <GoopAccordion>s and a
// <GoopCollapsible>. `set` picks the group. Keep each set in sync with the code beside it.
withDefaults(defineProps<{ set?: 'basic' | 'multiple' | 'collapsible' }>(), { set: 'basic' })
const items = [
  { value: 'what', title: 'What is goopUI?', body: 'shadcn-vue components with gooey, dripping motion. Same API, more slime.' },
  { value: 'motion', title: 'Does it respect reduced motion?', body: 'Yes. The open row becomes a still fill and the content opens plainly.' },
  { value: 'off', title: 'Can I turn the goo off?', body: 'Every effect has its own prop, and :goo="false" renders plain shadcn.' },
]
const open = ref(false)
</script>

<template>
  <GoopAccordion v-if="set === 'basic'" type="single" collapsible default-value="what" class="w-full max-w-md">
    <GoopAccordionItem v-for="i in items" :key="i.value" :value="i.value" class="border-border">
      <GoopAccordionTrigger>{{ i.title }}</GoopAccordionTrigger>
      <GoopAccordionContent>{{ i.body }}</GoopAccordionContent>
    </GoopAccordionItem>
  </GoopAccordion>

  <GoopAccordion v-else-if="set === 'multiple'" type="multiple" preset="wild" :droplets="2" class="w-full max-w-md">
    <GoopAccordionItem v-for="i in items" :key="i.value" :value="i.value" class="border-border">
      <GoopAccordionTrigger>{{ i.title }}</GoopAccordionTrigger>
      <GoopAccordionContent>{{ i.body }}</GoopAccordionContent>
    </GoopAccordionItem>
  </GoopAccordion>

  <GoopCollapsible v-else v-model:open="open" class="flex w-full max-w-sm flex-col gap-2">
    <div class="flex items-center justify-between gap-4 px-1">
      <span class="text-sm font-medium">3 starred repositories</span>
      <GoopCollapsibleTrigger as-child>
        <GoopButton variant="outline" size="sm">{{ open ? 'Hide' : 'Show' }}</GoopButton>
      </GoopCollapsibleTrigger>
    </div>
    <div class="rounded-md border px-4 py-2 font-mono text-sm">goopui/core</div>
    <GoopCollapsibleContent class="flex flex-col gap-2">
      <div class="rounded-md border px-4 py-2 font-mono text-sm">goopui/vue</div>
      <div class="rounded-md border px-4 py-2 font-mono text-sm">goopui/nuxt</div>
    </GoopCollapsibleContent>
  </GoopCollapsible>
</template>
