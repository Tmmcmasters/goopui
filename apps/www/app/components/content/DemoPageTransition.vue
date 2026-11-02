<script setup lang="ts">
// Page transition demo for its docs page: runs a full cover -> short hold -> reveal in the
// picked direction, on its own transition instance (the site-wide one always pours down).
import { useGoopPageTransition } from '@goopui/vue'

const directions = ['down', 'up', 'left', 'right'] as const
type Direction = (typeof directions)[number]
const direction = ref<Direction>('down')
const busy = ref(false)
const transition = useGoopPageTransition(() => ({ direction: direction.value }))

async function play(d: Direction) {
  if (busy.value) return
  busy.value = true
  direction.value = d
  await nextTick()
  await transition.cover()
  await new Promise((r) => setTimeout(r, 220))
  await transition.reveal()
  busy.value = false
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-2">
    <GoopButton v-for="d in directions" :key="d" variant="outline" :disabled="busy" @click="play(d)">
      Pour {{ d }}
    </GoopButton>
  </div>
</template>
