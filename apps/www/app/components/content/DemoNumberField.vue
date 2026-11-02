<script setup lang="ts">
// Live number field demos for the NumberField docs page: real <GoopNumberField>s. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'currency' | 'effects' | 'states' }>(), { set: 'basic' })
const qty = ref(3)
const price = ref(24.5)
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
</script>

<template>
  <div v-if="set === 'basic'" class="grid w-full max-w-40 gap-2">
    <label for="demo-nf-qty" class="text-sm font-medium">Quantity</label>
    <GoopNumberField id="demo-nf-qty" v-model="qty" :min="0" :max="20" v-bind="pg.props">
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
  </div>

  <div v-else-if="set === 'currency'" class="grid w-full max-w-48 gap-2">
    <label for="demo-nf-price" class="text-sm font-medium">Price</label>
    <GoopNumberField id="demo-nf-price" v-model="price" :step="0.5" :format-options="{ style: 'currency', currency: 'USD' }">
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
  </div>

  <div v-else-if="set === 'effects'" class="grid w-full max-w-40 gap-4">
    <GoopNumberField :default-value="1" preset="wild">
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput aria-label="Wild preset" />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
    <GoopNumberField :default-value="1" :squish="false" :nudge="false">
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput aria-label="Ring only" />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
  </div>

  <div v-else class="grid w-full max-w-40 gap-4">
    <GoopNumberField :default-value="4" disabled>
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput aria-label="Disabled" />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
    <GoopNumberField :default-value="2" :goo="false">
      <GoopNumberFieldContent>
        <GoopNumberFieldDecrement />
        <GoopNumberFieldInput aria-label="Plain shadcn" />
        <GoopNumberFieldIncrement />
      </GoopNumberFieldContent>
    </GoopNumberField>
  </div>
</template>
