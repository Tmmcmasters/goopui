<script setup lang="ts">
// Live drawer demos for the Drawer docs page: real <GoopDrawer>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'directions' | 'snap' }>(), { set: 'basic' })
const directions = ['bottom', 'top', 'left', 'right'] as const
const snapPoints = [0.35, 0.65, 1]
const snap = ref<number | string | null>(snapPoints[0]!)
const goal = ref(350)
const bump = (d: number) => (goal.value = Math.min(400, Math.max(200, goal.value + d)))
</script>

<template>
  <GoopDrawer v-if="set === 'basic'">
    <GoopDrawerTrigger as-child>
      <GoopButton variant="outline">Open drawer</GoopButton>
    </GoopDrawerTrigger>
    <GoopDrawerContent>
      <div class="mx-auto w-full max-w-sm">
        <GoopDrawerHeader>
          <GoopDrawerTitle>Move goal</GoopDrawerTitle>
          <GoopDrawerDescription>Set your daily activity goal.</GoopDrawerDescription>
        </GoopDrawerHeader>
        <div class="flex items-center justify-center gap-4 p-4 pb-0">
          <GoopButton variant="outline" size="icon" class="rounded-full" aria-label="Decrease" :disabled="goal <= 200" @click="bump(-10)">-</GoopButton>
          <div class="text-center">
            <div class="text-7xl font-bold tracking-tighter">{{ goal }}</div>
            <div class="text-[0.70rem] uppercase text-muted-foreground">Calories/day</div>
          </div>
          <GoopButton variant="outline" size="icon" class="rounded-full" aria-label="Increase" :disabled="goal >= 400" @click="bump(10)">+</GoopButton>
        </div>
        <GoopDrawerFooter>
          <GoopButton>Submit</GoopButton>
          <GoopDrawerClose as-child>
            <GoopButton variant="outline">Cancel</GoopButton>
          </GoopDrawerClose>
        </GoopDrawerFooter>
      </div>
    </GoopDrawerContent>
  </GoopDrawer>

  <template v-else-if="set === 'directions'">
    <GoopDrawer v-for="d in directions" :key="d" :direction="d">
      <GoopDrawerTrigger as-child>
        <GoopButton variant="outline" size="sm">{{ d }}</GoopButton>
      </GoopDrawerTrigger>
      <GoopDrawerContent>
        <GoopDrawerHeader>
          <GoopDrawerTitle>Direction: {{ d }}</GoopDrawerTitle>
          <GoopDrawerDescription>Drag it, flick it away, or pull it past full open.</GoopDrawerDescription>
        </GoopDrawerHeader>
      </GoopDrawerContent>
    </GoopDrawer>
  </template>

  <GoopDrawer v-else v-model:active-snap-point="snap" :snap-points="snapPoints">
    <GoopDrawerTrigger as-child>
      <GoopButton variant="outline">Snap points ({{ snap }})</GoopButton>
    </GoopDrawerTrigger>
    <GoopDrawerContent class="h-full max-h-[97%]">
      <GoopDrawerHeader>
        <GoopDrawerTitle>Snap points</GoopDrawerTitle>
        <GoopDrawerDescription>Drag between 35%, 65% and full height. The edge sloshes on every snap.</GoopDrawerDescription>
      </GoopDrawerHeader>
      <div class="flex flex-wrap justify-center gap-2 p-4">
        <GoopButton v-for="p in snapPoints" :key="p" size="sm" variant="outline" @click="snap = p">{{ p }}</GoopButton>
      </div>
    </GoopDrawerContent>
  </GoopDrawer>
</template>
