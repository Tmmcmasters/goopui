import { inject, provide, type InjectionKey, type Ref } from 'vue'

/** What GoopInputOTP tells its slots: whether the goo is attached (the focused cell then drops
 *  shadcn's ring: the goo is the focus indicator). */
export interface GoopInputOTPContext {
  active: Ref<boolean>
}

const KEY: InjectionKey<GoopInputOTPContext> = Symbol('GoopInputOTP')

export const provideGoopInputOTP = (ctx: GoopInputOTPContext): void => provide(KEY, ctx)
export const injectGoopInputOTP = (): GoopInputOTPContext | null => inject(KEY, null)
