<script setup lang="ts">
// The Customize panel under a component demo, generated from the component's docs entry
// (app/component-docs/entries). Sliders, switches, segmented choices and colour swatches;
// `advanced` controls sit behind "More". Values equal to a control's default are dropped, so
// the model only ever holds what the reader changed.
import { controlId, type ComponentDoc, type Control, type ControlValues } from '~/component-docs/types'
import { defaultOf, descriptionOf, labelOf, valueOf } from '~/component-docs/runtime'

const props = defineProps<{ doc: ComponentDoc }>()
const values = defineModel<ControlValues>({ required: true })

const more = ref(false)
const basic = computed(() => props.doc.controls.filter((c) => !c.advanced))
const advanced = computed(() => props.doc.controls.filter((c) => c.advanced))
const shown = computed(() => (more.value ? props.doc.controls : basic.value))
const changedCount = computed(() => Object.keys(values.value).length)

const val = (c: Control) => valueOf(c, values.value)
const changed = (c: Control) => controlId(c) in values.value

function set(c: Control, v: unknown) {
  const next = { ...values.value }
  const id = controlId(c)
  if (v === defaultOf(c, next)) delete next[id]
  else next[id] = v
  values.value = next
}

const reset = () => (values.value = {})
const wide = (c: Control) => (c.kind === 'segment' && c.options.length > 3) || (c.kind === 'color' && (c.swatches?.length ?? 0) > 6)
</script>

<template>
  <div class="customize rounded-xl border border-border bg-card">
    <div class="flex h-11 items-center justify-between gap-2 pl-4 pr-2">
      <h3 class="m-0 text-sm font-semibold tracking-[-0.01em]">Customize</h3>
      <div class="flex items-center gap-1">
        <button v-if="advanced.length" type="button" class="hdr-btn" :aria-expanded="more" @click="more = !more">
          {{ more ? 'Fewer' : `More (${advanced.length})` }}
        </button>
        <button type="button" class="hdr-btn" :disabled="!changedCount" @click="reset">
          <SiteIcon name="rotate" :size="13" />
          Reset
        </button>
      </div>
    </div>
    <div class="grid-ctl border-t border-border p-2">
      <template v-for="c in shown" :key="controlId(c)">
        <DocsControlSlider
          v-if="c.kind === 'slider'"
          :label="labelOf(c)"
          :description="descriptionOf(doc, c)"
          :min="c.min"
          :max="c.max"
          :step="c.step"
          :unit="c.unit"
          :model-value="Number(val(c))"
          :changed="changed(c)"
          @update:model-value="set(c, $event)"
        />

        <button
          v-else-if="c.kind === 'switch'"
          type="button"
          role="switch"
          class="ctl-pill"
          :class="{ changed: changed(c) }"
          :aria-checked="!!val(c)"
          :title="descriptionOf(doc, c)"
          @click="set(c, !val(c))"
        >
          <span class="name">
            {{ labelOf(c) }}
            <span v-if="changed(c)" class="dot" aria-hidden="true" />
          </span>
          <span class="track" aria-hidden="true"><span class="knob" /></span>
        </button>

        <div
          v-else-if="c.kind === 'segment'"
          class="ctl-pill seg"
          :class="{ changed: changed(c), wide: wide(c) }"
          role="radiogroup"
          :aria-label="labelOf(c)"
          :title="descriptionOf(doc, c)"
        >
          <span class="name">
            {{ labelOf(c) }}
            <span v-if="changed(c)" class="dot" aria-hidden="true" />
          </span>
          <span class="opts">
            <button
              v-for="o in c.options"
              :key="o"
              type="button"
              role="radio"
              :aria-checked="val(c) === o"
              :tabindex="val(c) === o ? 0 : -1"
              @click="set(c, o)"
              @keydown.right.prevent="set(c, c.options[(c.options.indexOf(String(val(c))) + 1) % c.options.length])"
              @keydown.left.prevent="set(c, c.options[(c.options.indexOf(String(val(c))) - 1 + c.options.length) % c.options.length])"
            >
              {{ o }}
            </button>
          </span>
        </div>

        <div
          v-else
          class="ctl-pill swatches"
          :class="{ changed: changed(c), wide: wide(c) }"
          role="radiogroup"
          :aria-label="labelOf(c)"
          :title="descriptionOf(doc, c)"
        >
          <span class="name">
            {{ labelOf(c) }}
            <span v-if="changed(c)" class="dot" aria-hidden="true" />
          </span>
          <span class="flex items-center gap-1.5">
            <button
              type="button"
              role="radio"
              class="sw theme"
              :aria-checked="val(c) === ''"
              aria-label="Theme default"
              title="Theme default"
              @click="set(c, '')"
            />
            <button
              v-for="s in c.swatches"
              :key="s.value"
              type="button"
              role="radio"
              class="sw"
              :style="{ background: s.value }"
              :aria-checked="val(c) === s.value"
              :aria-label="s.label"
              :title="s.label"
              @click="set(c, s.value)"
            />
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.grid-ctl {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 16.5rem), 1fr));
  gap: 0.375rem;
}
.hdr-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 1.75rem;
  padding: 0 0.6rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.hdr-btn:hover:not(:disabled) {
  color: var(--foreground);
  background: var(--muted);
}
.hdr-btn:disabled {
  opacity: 0.45;
}

/* Shared pill (also used by ControlSlider, so not scoped to this file's elements). */
:deep(.ctl-pill) {
  position: relative;
  display: flex;
  min-width: 0;
  height: 2.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  overflow: hidden;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  text-align: left;
  color: var(--muted-foreground);
  background: color-mix(in oklch, var(--foreground) 3%, transparent);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    box-shadow 150ms ease,
    color 150ms ease;
}
:deep(.ctl-pill:hover),
:deep(.ctl-pill.changed) {
  color: var(--foreground);
}
:deep(.ctl-pill:has(:focus-visible)),
:deep(.ctl-pill:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
:deep(.ctl-pill .name) {
  position: relative;
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}
:deep(.ctl-pill .dot) {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--goo);
}
.wide {
  grid-column: 1 / -1;
}

/* Switch */
.track {
  position: relative;
  width: 1.75rem;
  height: 1rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in oklch, var(--foreground) 16%, transparent);
  transition: background-color 160ms ease;
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--background);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  transition: transform 180ms var(--ease-out-strong);
}
[aria-checked='true'] > .track {
  background: var(--foreground);
}
[aria-checked='true'] > .track .knob {
  transform: translateX(12px);
}

/* Segmented */
.opts {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 2px;
  border-radius: 0.4rem;
  background: color-mix(in oklch, var(--foreground) 5%, transparent);
}
.opts button {
  height: 1.5rem;
  padding: 0 0.5rem;
  border-radius: 0.3rem;
  font-size: 0.75rem;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.opts button:hover {
  color: var(--foreground);
}
.opts button[aria-checked='true'] {
  color: var(--foreground);
  background: var(--background);
  box-shadow: 0 0 0 1px var(--border);
}

/* Swatches */
.sw {
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
  transition: transform 140ms var(--ease-out-strong);
}
.sw:hover {
  transform: scale(1.12);
}
.sw[aria-checked='true'] {
  outline: 2px solid var(--foreground);
  outline-offset: 2px;
}
.sw.theme {
  background: linear-gradient(135deg, var(--foreground) 50%, var(--background) 50%);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

@media (prefers-reduced-motion: reduce) {
  .knob,
  .sw {
    transition: none;
  }
}
:global(html[data-reduced-motion='true']) .knob,
:global(html[data-reduced-motion='true']) .sw {
  transition: none;
}
</style>
