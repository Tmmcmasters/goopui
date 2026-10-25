<script setup lang="ts">
const on = ref(true)
const off = ref(false)
</script>

<template>
  <ComparePage path="/switch">
    <CompareRow label="default">
      <template #shadcn>
        <label class="flex items-center gap-2 text-sm">
          <Switch v-model="off" /> Airplane mode
        </label>
      </template>
    </CompareRow>

    <CompareRow label="checked">
      <template #shadcn>
        <label class="flex items-center gap-2 text-sm">
          <Switch v-model="on" /> Notifications
        </label>
      </template>
    </CompareRow>

    <CompareRow label="sm">
      <template #shadcn>
        <Switch size="sm" />
        <Switch size="sm" :default-value="true" />
      </template>
    </CompareRow>

    <CompareRow label="disabled">
      <template #shadcn>
        <Switch disabled />
        <Switch disabled :default-value="true" />
      </template>
    </CompareRow>
  </ComparePage>
</template>
