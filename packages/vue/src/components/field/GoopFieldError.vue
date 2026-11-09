<script setup lang="ts">
// GoopFieldError: shadcn-vue's FieldError (`role="alert"`, the slot or `errors`: unique
// messages, one as text, several as a list; renders nothing without either; `class` merge,
// same classes). When it appears it drips in (core `attachFieldError`): a small drop of the
// destructive colour falls from under the control into the message, which unrolls top-down
// behind it. Engine props inherit GoopField's; set here they win. Before mount, during SSR,
// under reduced motion or with `:goo="false"` it is a plain shadcn FieldError.
import { attachFieldError, type FieldErrorHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useSlots, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolveFieldProps, toFieldErrorOptions, type GoopFieldProps } from '../../goop-props'
import { injectGoopField } from './context'
import { FIELD_ERROR, FIELD_ERROR_LIST, fieldErrorContent, type FieldErrorItem } from './variants'

const props = withDefaults(defineProps<GoopFieldProps & { class?: HTMLAttributes['class']; errors?: FieldErrorItem[] }>(), {
  goo: undefined,
  drip: undefined,
  reveal: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  errors: undefined,
})

const slots = useSlots()
const content = computed(() => fieldErrorContent(props.errors))
const field = injectGoopField()
const config = useGoopConfig()
const options = computed(() => toFieldErrorOptions(resolveFieldProps(props, field?.value), config))
const el = useTemplateRef<HTMLElement>('el')
const handle = shallowRef<FieldErrorHandle | null>(null)
let mounted = false
let attachedTo: HTMLElement | null = null

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !el.value) return
  attachedTo = el.value
  handle.value = attachFieldError(el.value, opts)
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
  attachedTo = null
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
// The message comes and goes (v-if): drip in each time it appears.
watch(
  el,
  (now) => {
    if (now === attachedTo) return
    detach()
    if (now) attach()
  },
  { flush: 'post' },
)
watch(options, (next) => {
  if (!next) detach()
  else if (handle.value) handle.value.update(next)
  else attach()
})

defineExpose({
  /** The live drip handle (null before mount, while hidden or when off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <div v-if="slots.default || content" ref="el" role="alert" data-slot="field-error" :class="cn(FIELD_ERROR, props.class)">
    <slot v-if="slots.default" />
    <template v-else-if="typeof content === 'string'">
      {{ content }}
    </template>
    <ul v-else-if="Array.isArray(content)" :class="FIELD_ERROR_LIST">
      <li v-for="(error, index) in content" :key="index">
        {{ error }}
      </li>
    </ul>
  </div>
</template>
