import type { ComputedRef, InjectionKey } from 'vue'

/** Goop component name for the current compare page (used by row placeholders). */
export const compareGoopKey: InjectionKey<ComputedRef<string>> = Symbol('compareGoop')
