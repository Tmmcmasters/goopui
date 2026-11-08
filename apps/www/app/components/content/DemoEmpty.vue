<script setup lang="ts">
// Live empty-state demos for the Empty docs page: real <GoopEmpty>. `set` picks the group. Keep
// each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'media' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
</script>

<template>
  <GoopEmpty v-if="set === 'basic'" class="empty-demo p-2" v-bind="pg.props">
    <GoopEmptyHeader>
      <GoopEmptyMedia variant="icon">
        <SiteIcon name="folder" />
      </GoopEmptyMedia>
      <GoopEmptyTitle>No Projects Yet</GoopEmptyTitle>
      <GoopEmptyDescription>
        You haven't created any projects yet. Get started by creating your first project.
      </GoopEmptyDescription>
    </GoopEmptyHeader>
    <GoopEmptyContent>
      <GoopButton>Create Project</GoopButton>
    </GoopEmptyContent>
  </GoopEmpty>

  <GoopEmpty v-else class="empty-demo p-2">
    <GoopEmptyHeader>
      <GoopEmptyMedia>
        <SiteIcon name="inbox" :size="28" />
      </GoopEmptyMedia>
      <GoopEmptyTitle>Inbox zero</GoopEmptyTitle>
      <GoopEmptyDescription>Nothing to read. Enjoy the quiet.</GoopEmptyDescription>
    </GoopEmptyHeader>
  </GoopEmpty>
</template>

<style>
/* The docs prose spaces paragraphs. The demo is app UI: undo that. */
.prose .empty-demo p {
  margin: 0;
}
</style>
