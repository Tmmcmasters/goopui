<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'
import { ChevronsUpDown } from '@lucide/vue'

const faq = [
  { value: 'item-1', title: 'Product Information', body: 'Our flagship product combines cutting-edge technology with sleek design. Built with premium materials, it offers unparalleled performance and reliability.' },
  { value: 'item-2', title: 'Shipping Details', body: 'We offer worldwide shipping through trusted courier partners. Standard delivery takes 3-5 business days, while express shipping ensures delivery within 1-2 business days. All orders are carefully packaged and fully insured.' },
  { value: 'item-3', title: 'Return Policy', body: 'We stand behind our products with a comprehensive 30-day return policy. If you are not completely satisfied, simply return the item in its original condition.' },
]

/** Accordion / Collapsible props from the panel, applied to every goop instance on the page. */
const speed = ref(1)
/** Effect toggles (core ACCORDION_EFFECTS). */
const fx = reactive({ pour: true, jelly: true, splash: true, slosh: true, handoff: true })
const splashAmount = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  speed: speed.value,
  ...fx,
  splashAmount: splashAmount.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))

const single = ref('item-1')
const goopSingle = ref('item-1')
const open = ref(false)
const goopOpen = ref(false)

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/accordion">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Accordion props">
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label v-for="(_, name) in fx" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="fx[name]" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">splash amount: {{ splashAmount.toFixed(2) }}x</span>
          <input v-model.number="splashAmount" type="range" min="0" max="3" step="0.05" class="w-28" :disabled="!fx.splash">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">renderer</span>
          <select v-model="renderer" :class="selectClass">
            <option value="">auto (svg)</option>
            <option value="svg">svg</option>
            <option value="canvas">canvas</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="single" note="collapsible; the opening item waits a beat for the closing one (handoff)">
      <template #shadcn>
        <Accordion v-model="single" type="single" collapsible class="w-full">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.title }}</AccordionTrigger>
            <AccordionContent>{{ item.body }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </template>
      <template #goop>
        <GoopAccordion v-model="goopSingle" type="single" collapsible class="w-full" v-bind="engine">
          <GoopAccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <GoopAccordionTrigger>{{ item.title }}</GoopAccordionTrigger>
            <GoopAccordionContent>{{ item.body }}</GoopAccordionContent>
          </GoopAccordionItem>
        </GoopAccordion>
      </template>
    </CompareRow>

    <CompareRow label="multiple">
      <template #shadcn>
        <Accordion type="multiple" class="w-full">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.title }}</AccordionTrigger>
            <AccordionContent>{{ item.body }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </template>
      <template #goop>
        <GoopAccordion type="multiple" class="w-full" v-bind="engine">
          <GoopAccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <GoopAccordionTrigger>{{ item.title }}</GoopAccordionTrigger>
            <GoopAccordionContent>{{ item.body }}</GoopAccordionContent>
          </GoopAccordionItem>
        </GoopAccordion>
      </template>
    </CompareRow>

    <CompareRow label="collapsible" note="Collapsible: the trigger is the goo source">
      <template #shadcn>
        <Collapsible v-model:open="open" class="flex w-[350px] flex-col gap-2">
          <div class="flex items-center justify-between gap-4 px-4">
            <h4 class="text-sm font-semibold">
              @peduarte starred 3 repositories
            </h4>
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="icon" class="size-8">
                <ChevronsUpDown />
                <span class="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <div class="rounded-md border px-4 py-2 font-mono text-sm">
            @radix-ui/primitives
          </div>
          <CollapsibleContent class="flex flex-col gap-2">
            <div class="rounded-md border px-4 py-2 font-mono text-sm">
              @radix-ui/colors
            </div>
            <div class="rounded-md border px-4 py-2 font-mono text-sm">
              @stitches/react
            </div>
          </CollapsibleContent>
        </Collapsible>
      </template>
      <template #goop>
        <GoopCollapsible v-model:open="goopOpen" class="flex w-[350px] flex-col gap-2" v-bind="engine">
          <div class="flex items-center justify-between gap-4 px-4">
            <h4 class="text-sm font-semibold">
              @peduarte starred 3 repositories
            </h4>
            <GoopCollapsibleTrigger as-child>
              <Button variant="ghost" size="icon" class="size-8">
                <ChevronsUpDown />
                <span class="sr-only">Toggle</span>
              </Button>
            </GoopCollapsibleTrigger>
          </div>
          <div class="rounded-md border px-4 py-2 font-mono text-sm">
            @radix-ui/primitives
          </div>
          <GoopCollapsibleContent class="flex flex-col gap-2">
            <div class="rounded-md border px-4 py-2 font-mono text-sm">
              @radix-ui/colors
            </div>
            <div class="rounded-md border px-4 py-2 font-mono text-sm">
              @stitches/react
            </div>
          </GoopCollapsibleContent>
        </GoopCollapsible>
      </template>
    </CompareRow>

    <CompareRow label="disabled item">
      <template #shadcn>
        <Accordion type="single" collapsible class="w-full">
          <AccordionItem value="a">
            <AccordionTrigger>Enabled</AccordionTrigger>
            <AccordionContent>Opens as usual.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="b" disabled>
            <AccordionTrigger>Disabled</AccordionTrigger>
            <AccordionContent>Never shows.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </template>
      <template #goop>
        <GoopAccordion type="single" collapsible class="w-full" v-bind="engine">
          <GoopAccordionItem value="a">
            <GoopAccordionTrigger>Enabled</GoopAccordionTrigger>
            <GoopAccordionContent>Opens as usual.</GoopAccordionContent>
          </GoopAccordionItem>
          <GoopAccordionItem value="b" disabled>
            <GoopAccordionTrigger>Disabled</GoopAccordionTrigger>
            <GoopAccordionContent>Never shows.</GoopAccordionContent>
          </GoopAccordionItem>
        </GoopAccordion>
      </template>
    </CompareRow>

    <CompareRow label="goo off">
      <template #goop>
        <GoopAccordion type="single" collapsible class="w-full" :goo="false">
          <GoopAccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <GoopAccordionTrigger>{{ item.title }}</GoopAccordionTrigger>
            <GoopAccordionContent>{{ item.body }}</GoopAccordionContent>
          </GoopAccordionItem>
        </GoopAccordion>
      </template>
    </CompareRow>
  </ComparePage>
</template>
