<script setup lang="ts">
// Real questions about goopUI, in an Accordion.
const uses = [{ name: 'Accordion', slug: 'accordion', new: true }]

const faq = [
  {
    value: 'ready',
    q: 'Can I use it in production?',
    a: "Not yet. goopUI is in alpha: the components work, but names and props can still change before 1.0. Pin the version if you try it.",
  },
  {
    value: 'shadcn',
    q: 'How is it different from shadcn-vue?',
    a: 'Same components, same props, same reka-ui primitives underneath. goopUI adds an aria-hidden goo layer behind each one and a small engine that runs the drips.',
  },
  {
    value: 'motion',
    q: 'What happens with reduced motion?',
    a: 'The goo keeps its shape and resting drips, and everything else holds still: no wobble, splashes, or falling drops. Try the switch above the grid.',
  },
  {
    value: 'react',
    q: 'Is there a React or Svelte version?',
    a: 'Later. Vue and Nuxt come first so the API can settle, then React and Svelte get the same components on the same engine.',
  },
]
const open = ref<string | undefined>('ready')
</script>

<template>
  <LandingShowcaseTile :uses="uses">
    <h3 class="text-[15px] font-medium tracking-[-0.01em]">Questions</h3>
    <GoopAccordion v-model="open" type="single" collapsible class="mt-2 w-full">
      <GoopAccordionItem v-for="item in faq" :key="item.value" :value="item.value">
        <GoopAccordionTrigger>{{ item.q }}</GoopAccordionTrigger>
        <GoopAccordionContent>
          <p class="max-w-[60ch] text-muted-foreground">{{ item.a }}</p>
        </GoopAccordionContent>
      </GoopAccordionItem>
    </GoopAccordion>
  </LandingShowcaseTile>
</template>
