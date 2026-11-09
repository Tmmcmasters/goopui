<script setup lang="ts">
// Live tags input demos for the Tags Input docs page: real <GoopTagsInput>s. `set` picks the
// group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'paste' | 'states' }>(), { set: 'basic' })
const tags = ref(['Vue', 'React', 'Svelte'])
const emails = ref(['ada@example.com'])
const invalid = ref(['nope'])
const plain = ref(['Plain'])
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/forms-2.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="tags-input" :set="set" :pg="{ main: pg.props }" />
  <div v-else-if="set === 'basic'" class="grid w-full max-w-sm gap-2">
    <label for="demo-tags" class="text-sm font-medium">Frameworks</label>
    <GoopTagsInput v-model="tags" v-bind="pg.props">
      <GoopTagsInputItem v-for="tag in tags" :key="tag" :value="tag">
        <GoopTagsInputItemText />
        <GoopTagsInputItemDelete />
      </GoopTagsInputItem>
      <GoopTagsInputInput id="demo-tags" placeholder="Add a framework…" />
    </GoopTagsInput>
  </div>

  <div v-else-if="set === 'paste'" class="grid w-full max-w-sm gap-2">
    <label for="demo-tags-paste" class="text-sm font-medium">Invite (up to 5)</label>
    <GoopTagsInput v-model="emails" add-on-paste add-on-blur :max="5" :delimiter="/[,;\s]+/">
      <GoopTagsInputItem v-for="tag in emails" :key="tag" :value="tag">
        <GoopTagsInputItemText />
        <GoopTagsInputItemDelete />
      </GoopTagsInputItem>
      <GoopTagsInputInput id="demo-tags-paste" placeholder="Paste a list of emails…" />
    </GoopTagsInput>
  </div>

  <div v-else class="grid w-full max-w-sm gap-4">
    <GoopTagsInput v-model="invalid" aria-invalid="true">
      <GoopTagsInputItem v-for="tag in invalid" :key="tag" :value="tag">
        <GoopTagsInputItemText />
        <GoopTagsInputItemDelete />
      </GoopTagsInputItem>
      <GoopTagsInputInput placeholder="Invalid" aria-label="Invalid tags" />
    </GoopTagsInput>
    <GoopTagsInput v-model="plain" :goo="false">
      <GoopTagsInputItem v-for="tag in plain" :key="tag" :value="tag">
        <GoopTagsInputItemText />
        <GoopTagsInputItemDelete />
      </GoopTagsInputItem>
      <GoopTagsInputInput placeholder="Plain shadcn" aria-label="Plain shadcn tags" />
    </GoopTagsInput>
  </div>
</template>
