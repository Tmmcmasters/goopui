<script setup lang="ts">
// The main demo of a component page: Preview / Code tabs, a replay button for one-shot
// effects, and the Customize panel. Everything comes from the component's docs entry
// (app/component-docs/entries/<name>.ts); the demo in the slot binds the reader's choices
// with usePlayground(). In markdown:
//
//   ::playground{name="switch" caption="Click, or Tab to it and press Space."}
//   :demo-switch{set="default"}
//   ::
import { componentDoc } from '~/component-docs/registry'
import { codeFor, partProps } from '~/component-docs/runtime'
import type { ControlValues } from '~/component-docs/types'

const props = defineProps<{ name: string; caption?: string }>()
const doc = componentDoc(props.name)
if (!doc && import.meta.dev) console.warn(`[www] ::playground: no docs entry named "${props.name}"`)

const values = ref<ControlValues>({})
const parts = computed(() => (doc ? partProps(doc, values.value) : {}))
provide(PLAYGROUND_KEY, {
  get props() {
    return parts.value.main ?? {}
  },
  part: (name: string) => parts.value[name] ?? {},
})
const stage = createGoopStage()

const tab = ref<'preview' | 'code'>('preview')
const id = useId()
const code = computed(() => (doc ? codeFor(doc, values.value) : ''))

// Remount: a fresh demo (replays mount-time effects, and applies props read only on mount).
const mountKey = ref(0)
let remountTimer: ReturnType<typeof setTimeout> | undefined
if (doc?.remount) {
  watch(values, () => {
    clearTimeout(remountTimer)
    remountTimer = setTimeout(() => mountKey.value++, 180)
  })
}
onBeforeUnmount(() => clearTimeout(remountTimer))

const stageEl = ref<HTMLElement | null>(null)
async function replay() {
  tab.value = 'preview'
  mountKey.value++
  if (doc?.replay?.action !== 'click') return
  await nextTick()
  // Let the closing overlay's portal unmount before opening a fresh one.
  requestAnimationFrame(() => {
    const el = stageEl.value?.querySelector('.demo')
    const trigger = el?.querySelector<HTMLElement>('[data-replay]') ?? el?.querySelector<HTMLElement>('button')
    trigger?.click()
  })
}
const replayLabel = computed(() => doc?.replay?.label ?? 'Replay')
</script>

<template>
  <section class="playground not-prose my-6" :aria-label="doc ? `${doc.title} demo` : 'Demo'">
    <div class="mb-3 flex items-center justify-between gap-2">
      <div role="tablist" aria-label="Demo view" class="tabs">
        <button
          :id="`${id}-tab-preview`"
          type="button"
          role="tab"
          :aria-selected="tab === 'preview'"
          :aria-controls="`${id}-preview`"
          @click="tab = 'preview'"
        >
          <SiteIcon name="eye" :size="15" />
          Preview
        </button>
        <button
          :id="`${id}-tab-code`"
          type="button"
          role="tab"
          :aria-selected="tab === 'code'"
          :aria-controls="`${id}-code`"
          @click="tab = 'code'"
        >
          <SiteIcon name="code" :size="15" />
          Code
        </button>
      </div>
    </div>

    <div
      v-show="tab === 'preview'"
      :id="`${id}-preview`"
      role="tabpanel"
      :aria-labelledby="`${id}-tab-preview`"
      class="frame overflow-hidden rounded-xl border border-border bg-card"
    >
      <div ref="stageEl" class="stage relative">
        <button v-if="doc?.replay" type="button" class="replay" :aria-label="replayLabel" :title="replayLabel" @click="replay">
          <SiteIcon name="rotate" :size="15" />
        </button>
        <div :key="mountKey" class="demo flex min-h-56 w-full sm:min-h-72 flex-wrap items-center justify-center gap-4 px-4 pb-14 pt-12">
          <slot />
        </div>
      </div>
      <div v-if="caption || doc?.stageControls" class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
        <span class="pl-1 text-xs text-muted-foreground">{{ caption }}</span>
        <StageControls v-if="doc?.stageControls" :stage="stage" />
      </div>
    </div>

    <div v-show="tab === 'code'" :id="`${id}-code`" role="tabpanel" :aria-labelledby="`${id}-tab-code`" class="code-panel">
      <CodeSnippet :code="code" lang="vue" />
    </div>

    <DocsCustomize v-if="doc?.controls.length" v-model="values" :doc="doc" class="mt-4" />
  </section>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 0.25rem;
}
.tabs button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.125rem;
  padding: 0 0.85rem;
  border-radius: 0.55rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.tabs button:hover {
  color: var(--foreground);
}
.tabs button[aria-selected='true'] {
  color: var(--foreground);
  background: var(--muted);
  box-shadow: inset 0 0 0 1px var(--border);
}
.tabs button[aria-selected='true'] :deep(svg) {
  color: var(--goo);
}
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
.replay {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--muted-foreground);
  background: var(--card);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    color 150ms ease,
    background-color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.replay:hover {
  color: var(--foreground);
  background: var(--muted);
}
.replay:active {
  transform: scale(0.94);
}
.code-panel :deep(.code-frame) {
  margin: 0;
}
.code-panel :deep(pre) {
  min-height: 10rem;
}
@media (prefers-reduced-motion: reduce) {
  .replay:active {
    transform: none;
  }
}
</style>
