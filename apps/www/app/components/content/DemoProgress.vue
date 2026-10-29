<script setup lang="ts">
// Live GoopProgress demos for the Progress docs page. `set` picks the group. Keep each set
// in sync with the code sample beside it in the docs.
const props = withDefaults(defineProps<{ set?: 'basic' | 'auto' | 'tall' | 'indeterminate' }>(), { set: 'basic' })

const value = ref(35)
const step = (d: number) => {
  value.value = Math.max(0, Math.min(100, value.value + d))
}

// Auto: fills in uneven bursts, holds at 100, then starts over.
const auto = ref(0)
let timer: ReturnType<typeof setTimeout> | undefined
const tick = () => {
  if (auto.value >= 100) {
    timer = setTimeout(() => {
      auto.value = 0
      tick()
    }, 1600)
    return
  }
  auto.value = Math.min(100, auto.value + 4 + Math.round(Math.random() * 18))
  timer = setTimeout(tick, 450 + Math.random() * 700)
}
onMounted(() => {
  if (props.set === 'auto') tick()
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div v-if="set === 'basic'" class="grid w-full max-w-sm gap-4">
    <GoopProgress :model-value="value" aria-label="Upload" />
    <div class="flex flex-wrap items-center gap-2">
      <GoopButton size="sm" variant="outline" @click="step(-25)">-25</GoopButton>
      <GoopButton size="sm" variant="outline" @click="step(-5)">-5</GoopButton>
      <GoopButton size="sm" variant="outline" @click="step(5)">+5</GoopButton>
      <GoopButton size="sm" variant="outline" @click="step(25)">+25</GoopButton>
      <span class="font-mono text-xs text-muted-foreground">{{ value }}%</span>
    </div>
  </div>
  <div v-else-if="set === 'auto'" class="grid w-full max-w-sm gap-3">
    <GoopProgress :model-value="auto" aria-label="Installing" />
    <span class="font-mono text-xs text-muted-foreground">{{ auto }}%</span>
  </div>
  <div v-else-if="set === 'tall'" class="w-full max-w-sm">
    <GoopProgress :model-value="65" class="h-3" aria-label="Storage used" />
  </div>
  <div v-else class="grid w-full max-w-sm gap-5">
    <GoopProgress :model-value="null" aria-label="Loading" />
    <GoopProgress :model-value="null" class="h-3" aria-label="Loading, tall" />
  </div>
</template>
