<script setup lang="ts">
// Live resizable demos for the Resizable docs page: real <GoopResizablePanelGroup>. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'vertical' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
// On /react/docs: the same sets, as real @goopui/react components (react-demos/layout.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="resizable" :set="set" :pg="{ main: pg.props }" />
  <GoopResizablePanelGroup v-else-if="set === 'basic'" direction="horizontal" class="max-w-md rounded-lg border" v-bind="pg.props">
    <GoopResizablePanel :default-size="50">
      <div class="flex h-[200px] items-center justify-center p-6">
        <span class="font-semibold">One</span>
      </div>
    </GoopResizablePanel>
    <GoopResizableHandle with-handle />
    <GoopResizablePanel :default-size="50">
      <GoopResizablePanelGroup direction="vertical">
        <GoopResizablePanel :default-size="25">
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Two</span>
          </div>
        </GoopResizablePanel>
        <GoopResizableHandle with-handle />
        <GoopResizablePanel :default-size="75">
          <div class="flex h-full items-center justify-center p-6">
            <span class="font-semibold">Three</span>
          </div>
        </GoopResizablePanel>
      </GoopResizablePanelGroup>
    </GoopResizablePanel>
  </GoopResizablePanelGroup>
  <GoopResizablePanelGroup v-else direction="vertical" class="min-h-[200px] max-w-md rounded-lg border">
    <GoopResizablePanel :default-size="25">
      <div class="flex h-full items-center justify-center p-6">
        <span class="font-semibold">Header</span>
      </div>
    </GoopResizablePanel>
    <GoopResizableHandle />
    <GoopResizablePanel :default-size="75">
      <div class="flex h-full items-center justify-center p-6">
        <span class="font-semibold">Content</span>
      </div>
    </GoopResizablePanel>
  </GoopResizablePanelGroup>
</template>
