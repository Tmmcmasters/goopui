<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

const tabs = [
  { value: 'account', label: 'Account', body: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', body: 'Change your password here.' },
  { value: 'notifications', label: 'Notifications', body: 'Choose what you hear about.' },
  { value: 'billing', label: 'Billing', body: 'Plans, invoices and payment.' },
]

/** GoopTabsList props from the panel, applied to every goop tab list on the page. */
const goo = ref(true)
const indicator = ref(true)
const wobble = ref(true)
const momentum = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  indicator: indicator.value,
  wobble: wobble.value,
  momentum: momentum.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, indicator, wobble, momentum }

const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/tabs">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Tabs props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">renderer</span>
          <select v-model="renderer" :class="selectClass">
            <option value="">auto (svg)</option>
            <option value="svg">svg</option>
            <option value="canvas">canvas</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="default" note="click, or focus a tab and use the arrow keys">
      <template #shadcn>
        <Tabs default-value="account" class="w-full">
          <TabsList>
            <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </TabsTrigger>
          </TabsList>
          <TabsContent v-for="t in tabs" :key="t.value" :value="t.value" class="text-muted-foreground">
            {{ t.body }}
          </TabsContent>
        </Tabs>
      </template>
      <template #goop>
        <GoopTabs default-value="account" class="w-full">
          <GoopTabsList v-bind="engine">
            <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </GoopTabsTrigger>
          </GoopTabsList>
          <GoopTabsContent v-for="t in tabs" :key="t.value" :value="t.value" class="text-muted-foreground">
            {{ t.body }}
          </GoopTabsContent>
        </GoopTabs>
      </template>
    </CompareRow>

    <CompareRow label="two tabs">
      <template #shadcn>
        <Tabs default-value="account">
          <TabsList>
            <TabsTrigger value="account">
              Account
            </TabsTrigger>
            <TabsTrigger value="password">
              Password
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </template>
      <template #goop>
        <GoopTabs default-value="account">
          <GoopTabsList v-bind="engine">
            <GoopTabsTrigger value="account">
              Account
            </GoopTabsTrigger>
            <GoopTabsTrigger value="password">
              Password
            </GoopTabsTrigger>
          </GoopTabsList>
        </GoopTabs>
      </template>
    </CompareRow>

    <CompareRow label="vertical">
      <template #shadcn>
        <Tabs default-value="account" orientation="vertical">
          <TabsList>
            <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </template>
      <template #goop>
        <GoopTabs default-value="account" orientation="vertical">
          <GoopTabsList v-bind="engine">
            <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </GoopTabsTrigger>
          </GoopTabsList>
        </GoopTabs>
      </template>
    </CompareRow>

    <CompareRow label="line" note="line variant keeps shadcn's underline (no blob yet)">
      <template #shadcn>
        <Tabs default-value="account">
          <TabsList variant="line">
            <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </template>
      <template #goop>
        <GoopTabs default-value="account">
          <GoopTabsList variant="line" v-bind="engine">
            <GoopTabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">
              {{ t.label }}
            </GoopTabsTrigger>
          </GoopTabsList>
        </GoopTabs>
      </template>
    </CompareRow>
  </ComparePage>
</template>
