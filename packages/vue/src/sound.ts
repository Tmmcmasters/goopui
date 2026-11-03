// Opt-in interaction sounds (Cuelume) for the Vue components. Off by default.
//
// The logic lives in @goopui/core (cue map, lazy Cuelume loading, mute). This file only
// resolves each component's `sound` (its prop, else the nearest ancestor's, else the app
// default from GoopPlugin / provideGoopSound, else off), shares it with the component's parts
// (a GoopDialog's trigger and close button, a GoopSelect's items, ...), and turns the
// `data-cuelume-*` attributes on. With sound off the markup is untouched.
import { cueAttrs, requestSound, type GoopCueSpec, type GoopSoundPart } from '@goopui/core'
import {
  computed,
  inject,
  onMounted,
  provide,
  toValue,
  watch,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue'

export const GOOP_SOUND_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('goopui.sound')
/** Set by parts that pass their cue to an `as-child` child (a GoopDialogClose around a
 *  GoopButton): the child must not add its own cue to the same element. */
const CLAIM_KEY: InjectionKey<boolean> = Symbol('goopui.sound.claim')

/** Default `sound` for every goopUI component in this subtree (call in a parent's setup).
 *  App-wide: `app.use(GoopPlugin, { sound: true })` or the Nuxt module's `goop.sound`. */
export function provideGoopSound(on: MaybeRefOrGetter<boolean>): void {
  provide(
    GOOP_SOUND_KEY,
    computed(() => toValue(on)),
  )
}

/**
 * Whether sound is on here: `own()` (the component's `sound` prop) if set, else inherited.
 * A component that passes `own` shares its result with its descendants. While on, it asks
 * core to load and bind Cuelume after mount (client only; a `disableSound()` mute wins).
 */
export function useGoopSound(own?: () => boolean | undefined): ComputedRef<boolean> {
  const parent = inject(GOOP_SOUND_KEY, null)
  const on = computed(() => own?.() ?? parent?.value ?? false)
  if (own) provide(GOOP_SOUND_KEY, on)
  let mounted = false
  onMounted(() => {
    mounted = true
    if (on.value) requestSound()
  })
  watch(on, (v) => {
    if (v && mounted) requestSound()
  })
  return on
}

/**
 * The `data-cuelume-*` attributes for a part while sound is on, else `{}`.
 * `open` (for triggers that also close: accordion, collapsible, popover) plays `close` while
 * open. `claim` (parts whose slot can be an `as-child` GoopButton) keeps descendants from
 * adding a second cue to the same element.
 */
export function useGoopCue(
  part: GoopSoundPart | GoopCueSpec | (() => GoopSoundPart | GoopCueSpec | null),
  options: { sound?: () => boolean | undefined; open?: () => boolean | undefined; claim?: boolean } = {},
): ComputedRef<Record<string, string>> {
  const on = useGoopSound(options.sound)
  const claimed = inject(CLAIM_KEY, false)
  if (options.claim) provide(CLAIM_KEY, true)
  return computed(() => {
    if (!on.value || claimed) return {}
    const p = typeof part === 'function' ? part() : part
    return p ? cueAttrs(p, { open: options.open?.() }) : {}
  })
}

/** `props` without `sound`, for roots that forward their props to a reka-ui root. */
export function omitSound<T extends { sound?: boolean }>(props: T): ComputedRef<Omit<T, 'sound'>> {
  return computed(() => {
    const { sound: _sound, ...rest } = props
    return rest
  })
}
