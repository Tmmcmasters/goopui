// Shared by GoopInput and GoopTextarea: attach core's goo focus ring on mount, keep it in sync
// with the props, tear it down on unmount or when `goo` turns off.
import { attachInput, type InputHandle, type InputOptions } from '@goopui/core'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'

export function useFieldGoo(
  host: Readonly<Ref<HTMLElement | null>>,
  field: Readonly<Ref<HTMLInputElement | HTMLTextAreaElement | null>>,
  enabled: () => boolean,
  options: () => InputOptions,
) {
  const handle = shallowRef<InputHandle | null>(null)
  let mounted = false
  const attach = (): void => {
    if (handle.value || !mounted || !enabled() || !host.value || !field.value) return
    handle.value = attachInput(host.value, field.value, options())
  }
  const detach = (): void => {
    handle.value?.destroy()
    handle.value = null
  }
  onMounted(() => {
    mounted = true
    attach()
  })
  onBeforeUnmount(() => {
    mounted = false
    detach()
  })
  watch(enabled, (on) => (on ? attach() : detach()), { flush: 'post' })
  watch(options, (next) => handle.value?.update(next), { flush: 'post' })
  return { handle, active: computed(() => handle.value !== null) }
}
