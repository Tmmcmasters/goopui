<script setup lang="ts">
// Live field demos for the Field docs page: real <GoopField> parts around GoopInput,
// GoopCheckbox and GoopSwitch. `set` picks the group. Keep each set in sync with the code
// sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'fieldset' | 'tags' }>(), { set: 'basic' })
const email = ref('')
const error = ref('')
const check = (): void => {
  error.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? '' : 'Enter a valid email address.'
}
const clear = (): void => {
  if (error.value) error.value = ''
}
const tags = ref<string[]>([])
const tagsError = computed(() => (tags.value.length ? '' : 'Pick at least one topic.'))
const touched = ref(false)
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/forms-2.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="field" :set="set" :pg="{ main: pg.props }" />
  <form v-else-if="set === 'basic'" class="field-demo flex w-full max-w-sm flex-col gap-4" novalidate @submit.prevent="check">
    <GoopField :data-invalid="error ? 'true' : undefined" v-bind="pg.props">
      <GoopFieldLabel for="demo-field-email">Email</GoopFieldLabel>
      <GoopInput
        id="demo-field-email"
        v-model="email"
        type="email"
        placeholder="you@example.com"
        :aria-invalid="error ? 'true' : undefined"
        @input="clear"
      />
      <GoopFieldDescription>We'll never share it.</GoopFieldDescription>
      <GoopFieldError :errors="error ? [error] : []" />
    </GoopField>
    <GoopButton type="submit" class="self-start">Subscribe</GoopButton>
  </form>

  <GoopFieldSet v-else-if="set === 'fieldset'" class="field-demo w-full max-w-sm">
    <GoopFieldLegend>Notifications</GoopFieldLegend>
    <GoopFieldDescription>Choose how we reach you.</GoopFieldDescription>
    <GoopFieldGroup>
      <GoopField orientation="horizontal">
        <GoopCheckbox id="demo-field-email-n" :default-value="true" />
        <GoopFieldLabel for="demo-field-email-n" class="font-normal">Email</GoopFieldLabel>
      </GoopField>
      <GoopField orientation="horizontal">
        <GoopCheckbox id="demo-field-sms" />
        <GoopFieldLabel for="demo-field-sms" class="font-normal">Text messages</GoopFieldLabel>
      </GoopField>
      <GoopFieldSeparator />
      <GoopField orientation="horizontal">
        <GoopFieldContent>
          <GoopFieldLabel for="demo-field-digest">Weekly digest</GoopFieldLabel>
          <GoopFieldDescription>A summary every Monday.</GoopFieldDescription>
        </GoopFieldContent>
        <GoopSwitch id="demo-field-digest" />
      </GoopField>
    </GoopFieldGroup>
  </GoopFieldSet>

  <GoopField v-else class="field-demo w-full max-w-sm" :data-invalid="touched && tagsError ? 'true' : undefined">
    <GoopFieldLabel for="demo-field-tags">Topics</GoopFieldLabel>
    <GoopTagsInput v-model="tags" :aria-invalid="touched && tagsError ? 'true' : undefined" @focusout="touched = true">
      <GoopTagsInputItem v-for="tag in tags" :key="tag" :value="tag">
        <GoopTagsInputItemText />
        <GoopTagsInputItemDelete />
      </GoopTagsInputItem>
      <GoopTagsInputInput id="demo-field-tags" placeholder="Add a topic, then press Enter" />
    </GoopTagsInput>
    <GoopFieldError :errors="touched && tagsError ? [tagsError] : []" />
  </GoopField>
</template>

<style>
/* The docs prose spaces paragraphs and legends. The demo is app UI: undo that. */
.prose .field-demo p {
  margin: 0;
}
</style>
