// The link between a docs playground (components/content/Playground.vue) and the demo inside
// it. The demo binds the reader's Customize choices onto its component:
//
//   const pg = usePlayground()
//   <GoopSwitch v-model="on" v-bind="pg.props" />            // the 'main' part
//   <GoopDrawer v-bind="pg.part('root')"> ... <GoopDrawerContent v-bind="pg.part('content')">
//
// Outside a playground (the other previews on the page) both return {}, so the same demo
// component can be reused anywhere.
import type { InjectionKey } from 'vue'

export interface Playground {
  /** Changed props of the 'main' part. */
  readonly props: Record<string, unknown>
  /** Changed props of a named part. */
  part: (name: string) => Record<string, unknown>
}

export const PLAYGROUND_KEY: InjectionKey<Playground> = Symbol('goop-playground')

const EMPTY: Playground = { props: {}, part: () => ({}) }

export function usePlayground(): Playground {
  return inject(PLAYGROUND_KEY, EMPTY)
}
