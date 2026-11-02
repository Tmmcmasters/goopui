<script setup lang="ts">
// Live toggle demos for the Toggle docs page: real <GoopToggle>s and <GoopToggleGroup>s. `set`
// picks the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'variants' | 'single' | 'multiple' | 'states' }>(), { set: 'basic' })
const bold = ref(false)
const align = ref('left')
const marks = ref<string[]>(['bold', 'italic'])
</script>

<template>
  <!-- The site theme has no shadcn --accent tokens, so the demos set them to Slime. -->
  <div class="contents [--accent:var(--goo)] [--accent-foreground:var(--goo-foreground)]">
  <GoopToggle v-if="set === 'basic'" v-model="bold" aria-label="Toggle bold">
    <span class="font-bold">B</span> Bold
  </GoopToggle>

  <template v-else-if="set === 'variants'">
    <GoopToggle aria-label="Default variant" default-value>Default</GoopToggle>
    <GoopToggle variant="outline" aria-label="Outline variant" default-value>Outline</GoopToggle>
    <GoopToggle size="sm" aria-label="Small">sm</GoopToggle>
    <GoopToggle size="lg" aria-label="Large">lg</GoopToggle>
  </template>

  <GoopToggleGroup v-else-if="set === 'single'" v-model="align" type="single" variant="outline" aria-label="Text alignment">
    <GoopToggleGroupItem value="left" aria-label="Align left">Left</GoopToggleGroupItem>
    <GoopToggleGroupItem value="center" aria-label="Align center">Center</GoopToggleGroupItem>
    <GoopToggleGroupItem value="right" aria-label="Align right">Right</GoopToggleGroupItem>
    <GoopToggleGroupItem value="justify" aria-label="Justify">Justify</GoopToggleGroupItem>
  </GoopToggleGroup>

  <GoopToggleGroup v-else-if="set === 'multiple'" v-model="marks" type="multiple" aria-label="Text style">
    <GoopToggleGroupItem value="bold" aria-label="Bold"><span class="font-bold">B</span></GoopToggleGroupItem>
    <GoopToggleGroupItem value="italic" aria-label="Italic"><span class="italic">I</span></GoopToggleGroupItem>
    <GoopToggleGroupItem value="underline" aria-label="Underline"><span class="underline">U</span></GoopToggleGroupItem>
    <GoopToggleGroupItem value="strike" aria-label="Strikethrough"><span class="line-through">S</span></GoopToggleGroupItem>
  </GoopToggleGroup>

  <template v-else>
    <GoopToggle disabled aria-label="Disabled">Disabled</GoopToggle>
    <GoopToggle :droplets="false" :wobble="false" aria-label="Flood only">Flood only</GoopToggle>
    <GoopToggle preset="wild" aria-label="Wild">Wild</GoopToggle>
    <GoopToggle :goo="false" aria-label="Plain shadcn">Plain</GoopToggle>
  </template>
  </div>
</template>
