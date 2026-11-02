<script setup lang="ts">
// Live sheet demos for the Sheet docs page: real <GoopSheet>s. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'sides' | 'splash' }>(), { set: 'basic' })
const sides = ['top', 'right', 'bottom', 'left'] as const
</script>

<template>
  <GoopSheet v-if="set === 'basic'">
    <GoopSheetTrigger as-child>
      <GoopButton variant="outline">Open sheet</GoopButton>
    </GoopSheetTrigger>
    <GoopSheetContent>
      <GoopSheetHeader>
        <GoopSheetTitle>Edit profile</GoopSheetTitle>
        <GoopSheetDescription>Make changes to your profile here. Click save when you're done.</GoopSheetDescription>
      </GoopSheetHeader>
      <div class="grid gap-3 px-4 text-sm">
        <p class="text-muted-foreground">The panel blooms in from the right edge and splashes off its inner edge.</p>
      </div>
      <GoopSheetFooter>
        <GoopSheetClose as-child>
          <GoopButton>Save changes</GoopButton>
        </GoopSheetClose>
      </GoopSheetFooter>
    </GoopSheetContent>
  </GoopSheet>

  <template v-else-if="set === 'sides'">
    <GoopSheet v-for="side in sides" :key="side">
      <GoopSheetTrigger as-child>
        <GoopButton variant="outline" size="sm">{{ side }}</GoopButton>
      </GoopSheetTrigger>
      <GoopSheetContent :side="side">
        <GoopSheetHeader>
          <GoopSheetTitle>Side: {{ side }}</GoopSheetTitle>
          <GoopSheetDescription>The goo pools at the middle of this edge and spreads to fill the sheet.</GoopSheetDescription>
        </GoopSheetHeader>
      </GoopSheetContent>
    </GoopSheet>
  </template>

  <template v-else>
    <GoopSheet>
      <GoopSheetTrigger as-child>
        <GoopButton variant="secondary">Default splash</GoopButton>
      </GoopSheetTrigger>
      <GoopSheetContent>
        <GoopSheetHeader>
          <GoopSheetTitle>Default</GoopSheetTitle>
          <GoopSheetDescription>Drops fling off the inner edge and sides.</GoopSheetDescription>
        </GoopSheetHeader>
      </GoopSheetContent>
    </GoopSheet>
    <GoopSheet>
      <GoopSheetTrigger as-child>
        <GoopButton variant="secondary">Merge, big splash</GoopButton>
      </GoopSheetTrigger>
      <GoopSheetContent bloom-start="merge" :open-drip-amount="2" :open-drip-size="1.6" :open-drip-fling="2">
        <GoopSheetHeader>
          <GoopSheetTitle>Merge, big splash</GoopSheetTitle>
          <GoopSheetDescription>A few drops fuse at the edge, then more, larger drops fly further.</GoopSheetDescription>
        </GoopSheetHeader>
      </GoopSheetContent>
    </GoopSheet>
    <GoopSheet>
      <GoopSheetTrigger as-child>
        <GoopButton variant="secondary">No splash</GoopButton>
      </GoopSheetTrigger>
      <GoopSheetContent :open-drips="false">
        <GoopSheetHeader>
          <GoopSheetTitle>No splash</GoopSheetTitle>
          <GoopSheetDescription>The bloom and the wobble only.</GoopSheetDescription>
        </GoopSheetHeader>
      </GoopSheetContent>
    </GoopSheet>
  </template>
</template>
