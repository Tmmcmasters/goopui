<script setup lang="ts">
// Live input demos for the Input docs page: real <GoopInput>s and <GoopTextarea>s. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'invalid' | 'effects' | 'states' | 'textarea' }>(), { set: 'basic' })
const email = ref('')
const invalidEmail = ref('not-an-email')
const bio = ref('')
</script>

<template>
  <div v-if="set === 'basic'" class="grid w-full max-w-sm gap-2">
    <label for="demo-input-email" class="text-sm font-medium">Email</label>
    <GoopInput id="demo-input-email" v-model="email" type="email" placeholder="you@example.com" />
  </div>

  <div v-else-if="set === 'invalid'" class="grid w-full max-w-sm gap-2">
    <label for="demo-input-invalid" class="text-sm font-medium">Email</label>
    <GoopInput id="demo-input-invalid" v-model="invalidEmail" type="email" aria-invalid="true" aria-describedby="demo-input-invalid-msg" />
    <p id="demo-input-invalid-msg" class="text-sm text-destructive">Enter a valid email address.</p>
  </div>

  <div v-else-if="set === 'effects'" class="grid w-full max-w-sm gap-4">
    <GoopInput placeholder="Resting drips" drips aria-label="Resting drips" />
    <GoopInput placeholder="preset=&quot;wild&quot;" preset="wild" aria-label="Wild preset" />
    <GoopInput placeholder="preset=&quot;subtle&quot;" preset="subtle" aria-label="Subtle preset" />
    <GoopInput placeholder="No flow: the ring just appears" :flow="false" aria-label="No flow" />
  </div>

  <div v-else-if="set === 'states'" class="grid w-full max-w-sm gap-4">
    <GoopInput placeholder="Disabled" disabled aria-label="Disabled" />
    <GoopInput placeholder="Plain shadcn" :goo="false" aria-label="Plain shadcn" />
  </div>

  <div v-else class="grid w-full max-w-sm gap-2">
    <label for="demo-textarea-bio" class="text-sm font-medium">Bio</label>
    <GoopTextarea id="demo-textarea-bio" v-model="bio" placeholder="Tell us a little about yourself." />
  </div>
</template>
