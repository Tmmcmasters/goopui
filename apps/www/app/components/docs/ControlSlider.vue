<script setup lang="ts">
// A pill-shaped slider: the whole pill is the track, the fill shows the value. Drag anywhere
// on it (relative, so it never jumps), or click/tap to set. A visually hidden range input
// carries keyboard and screen-reader access. Touch keeps vertical page scroll (pan-y).
const props = defineProps<{
  label: string
  description?: string
  min: number
  max: number
  step: number
  unit?: string
  modelValue: number
  changed?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const pill = ref<HTMLElement | null>(null)
const decimals = computed(() => (String(props.step).split('.')[1] ?? '').length)
const clamp = (v: number) => Math.min(props.max, Math.max(props.min, v))
const snap = (v: number) => Number((Math.round((clamp(v) - props.min) / props.step) * props.step + props.min).toFixed(decimals.value))
const pct = computed(() => ((clamp(props.modelValue) - props.min) / (props.max - props.min)) * 100)
const text = computed(() => `${props.modelValue.toFixed(decimals.value)}${props.unit ?? ''}`)

const set = (v: number) => {
  const next = snap(v)
  if (next !== props.modelValue) emit('update:modelValue', next)
}

let drag: { id: number; x: number; start: number; moved: boolean; width: number } | null = null
function down(e: PointerEvent) {
  if (e.button !== 0 || !pill.value) return
  drag = { id: e.pointerId, x: e.clientX, start: props.modelValue, moved: false, width: pill.value.getBoundingClientRect().width }
}
function move(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.id) return
  const dx = e.clientX - drag.x
  if (!drag.moved) {
    if (Math.abs(dx) < 3) return
    drag.moved = true
    pill.value?.setPointerCapture(e.pointerId)
  }
  set(drag.start + (dx / drag.width) * (props.max - props.min))
}
function up(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.id) return
  if (!drag.moved && pill.value) {
    const r = pill.value.getBoundingClientRect()
    set(props.min + ((e.clientX - r.left) / r.width) * (props.max - props.min))
  }
  drag = null
}
const cancel = () => (drag = null)
</script>

<template>
  <div
    ref="pill"
    class="ctl-pill slider"
    :class="{ changed }"
    :style="{ '--p': `${pct}%` }"
    :title="description"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="cancel"
  >
    <span class="fill" aria-hidden="true" />
    <span class="name">
      {{ label }}
      <span v-if="changed" class="dot" aria-hidden="true" />
    </span>
    <span class="val">{{ text }}</span>
    <input
      type="range"
      class="sr-only"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :aria-label="label"
      :aria-valuetext="text"
      @input="set(Number(($event.target as HTMLInputElement).value))"
    />
  </div>
</template>

<style scoped>
.slider {
  cursor: ew-resize;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--p);
  background: color-mix(in oklch, var(--foreground) 7%, transparent);
  box-shadow: inset -1.5px 0 0 color-mix(in oklch, var(--foreground) 32%, transparent);
  pointer-events: none;
}
.slider:hover .fill {
  background: color-mix(in oklch, var(--foreground) 10%, transparent);
}
.val {
  position: relative;
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--foreground);
}
</style>
