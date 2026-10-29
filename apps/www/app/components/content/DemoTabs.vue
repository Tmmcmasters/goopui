<script setup lang="ts">
// Live tabs demos for the Tabs docs page: real <GoopTabs>. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'vertical' | 'line' | 'plain' }>(), { set: 'basic' })
const tabs = [
  { value: 'account', label: 'Account', text: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', text: 'Change your password here.' },
  { value: 'billing', label: 'Billing', text: 'Manage your plan and invoices.' },
] as const
</script>

<template>
  <GoopTabs v-if="set === 'basic'" default-value="account" class="w-full max-w-sm flex-col">
    <GoopTabsList>
      <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
    </GoopTabsList>
    <GoopTabsContent v-for="t in tabs" :key="t.value" :value="t.value" class="text-muted-foreground">
      {{ t.text }}
    </GoopTabsContent>
  </GoopTabs>

  <GoopTabs v-else-if="set === 'vertical'" default-value="account" orientation="vertical">
    <GoopTabsList class="h-fit flex-col">
      <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
    </GoopTabsList>
  </GoopTabs>

  <GoopTabs v-else-if="set === 'line'" default-value="account">
    <GoopTabsList variant="line">
      <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
    </GoopTabsList>
  </GoopTabs>

  <template v-else>
    <GoopTabs default-value="account">
      <GoopTabsList preset="wild">
        <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
      </GoopTabsList>
    </GoopTabs>
    <GoopTabs default-value="account">
      <GoopTabsList :wobble="false" :momentum="false">
        <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
      </GoopTabsList>
    </GoopTabs>
    <GoopTabs default-value="account">
      <GoopTabsList :goo="false">
        <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</GoopTabsTrigger>
      </GoopTabsList>
    </GoopTabs>
  </template>
</template>
