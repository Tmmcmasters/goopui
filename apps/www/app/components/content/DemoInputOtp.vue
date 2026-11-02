<script setup lang="ts">
// Live one-time-code demos for the InputOTP docs page: real <GoopInputOTP>s. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'effects' | 'states' }>(), { set: 'basic' })
const code = ref<string[]>([])
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
</script>

<template>
  <div v-if="set === 'basic'" class="grid gap-2">
    <GoopInputOTP v-model="code" aria-label="Verification code" v-bind="pg.props">
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
      <GoopInputOTPSeparator />
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i + 2" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
  </div>

  <div v-else-if="set === 'effects'" class="grid gap-4">
    <GoopInputOTP preset="wild" type="number">
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
    <GoopInputOTP :flow="false" :pulse="false" type="number">
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
  </div>

  <div v-else class="grid gap-4">
    <GoopInputOTP disabled :default-value="['1', '2', '3', '4']">
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
    <GoopInputOTP :goo="false">
      <GoopInputOTPGroup>
        <GoopInputOTPSlot v-for="i in 4" :key="i" :index="i - 1" />
      </GoopInputOTPGroup>
    </GoopInputOTP>
  </div>
</template>
