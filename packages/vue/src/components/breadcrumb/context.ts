import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopBreadcrumbProps } from '../../goop-props'

/** Provided by GoopBreadcrumb: its engine props, inherited by the list. */
const ROOT: InjectionKey<ComputedRef<GoopBreadcrumbProps>> = Symbol('goopui.breadcrumb')
/** Provided by GoopBreadcrumbList: whether the goo blob lights its links. */
const LIST: InjectionKey<ComputedRef<boolean>> = Symbol('goopui.breadcrumb.list')

export const provideGoopBreadcrumb = (props: ComputedRef<GoopBreadcrumbProps>): void => provide(ROOT, props)
export const injectGoopBreadcrumb = (): ComputedRef<GoopBreadcrumbProps> | null => inject(ROOT, null)
export const provideGoopBreadcrumbBlob = (blob: ComputedRef<boolean>): void => provide(LIST, blob)
export const injectGoopBreadcrumbBlob = (): ComputedRef<boolean> | null => inject(LIST, null)
