<script setup lang="ts">
const triggers = ['default', 'secondary', 'outline', 'ghost'] as const
const sides = ['top', 'right', 'bottom', 'left'] as const
</script>

<template>
  <ComparePage path="/popover">
    <CompareRow v-for="variant in triggers" :key="variant" :label="variant">
      <template #shadcn>
        <Popover>
          <PopoverTrigger as-child>
            <Button :variant="variant">
              Open popover
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Dimensions</PopoverTitle>
              <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </template>
    </CompareRow>

    <CompareRow label="sides">
      <template #shadcn>
        <Popover v-for="side in sides" :key="side">
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm">
              {{ side }}
            </Button>
          </PopoverTrigger>
          <PopoverContent :side="side" class="w-56">
            <PopoverHeader>
              <PopoverTitle>Side: {{ side }}</PopoverTitle>
              <PopoverDescription>The goo bridge should follow this edge.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      </template>
    </CompareRow>
  </ComparePage>
</template>
