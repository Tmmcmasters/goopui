<script setup lang="ts">
// Live radio group demos for the Radio Group docs page. `set` picks the group.
withDefaults(defineProps<{ set?: 'default' | 'horizontal' | 'features' | 'states' }>(), { set: 'default' })
const plan = ref('pro')
const size = ref('m')
const plans = ['free', 'pro', 'team']
const sizes = ['s', 'm', 'l', 'xl']
</script>

<template>
  <template v-if="set === 'default'">
    <GoopRadioGroup v-model="plan" class="w-40">
      <label v-for="p in plans" :key="p" class="flex items-center gap-2 text-sm capitalize">
        <GoopRadioGroupItem :id="`plan-${p}`" :value="p" /> {{ p }}
      </label>
    </GoopRadioGroup>
    <p class="m-0 font-mono text-xs text-muted-foreground">v-model: {{ plan }}</p>
  </template>
  <template v-else-if="set === 'horizontal'">
    <GoopRadioGroup v-model="size" orientation="horizontal" class="flex gap-6">
      <label v-for="s in sizes" :key="s" class="flex items-center gap-2 text-sm uppercase">
        <GoopRadioGroupItem :id="`size-${s}`" :value="s" /> {{ s }}
      </label>
    </GoopRadioGroup>
  </template>
  <template v-else-if="set === 'features'">
    <GoopRadioGroup default-value="a" orientation="horizontal" class="flex gap-6" :bridge="false">
      <GoopRadioGroupItem v-for="o in ['a', 'b', 'c']" :key="o" :value="o" :aria-label="o" />
    </GoopRadioGroup>
    <GoopRadioGroup default-value="a" orientation="horizontal" class="flex gap-6" preset="wild">
      <GoopRadioGroupItem v-for="o in ['a', 'b', 'c']" :key="o" :value="o" :aria-label="o" />
    </GoopRadioGroup>
    <GoopRadioGroup default-value="a" orientation="horizontal" class="flex gap-10">
      <GoopRadioGroupItem v-for="o in ['a', 'b', 'c']" :key="o" :value="o" class="size-7" :aria-label="o" />
    </GoopRadioGroup>
  </template>
  <template v-else-if="set === 'states'">
    <GoopRadioGroup default-value="one" class="w-40">
      <label class="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="one" /> One</label>
      <label class="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="two" /> Two</label>
      <label class="flex items-center gap-2 text-sm opacity-60"><GoopRadioGroupItem value="three" disabled /> Three (disabled)</label>
    </GoopRadioGroup>
    <GoopRadioGroup default-value="a" :goo="false" class="w-40">
      <label class="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="a" /> Plain shadcn</label>
      <label class="flex items-center gap-2 text-sm"><GoopRadioGroupItem value="b" /> (goo off)</label>
    </GoopRadioGroup>
  </template>
</template>
