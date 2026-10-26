// A "stage" is a demo frame whose controls (Drip, Slow-mo, Let it fly) drive every
// <GoopButton> inside it, through the buttons' own props and exposed handle:
//
//   const stage = createGoopStage()          // in the frame (Preview, landing card, tuner)
//   const stage = useGoopStage()             // in a demo placed inside the frame
//   <GoopButton :ref="stage.register" v-bind="stage.props" />
//
// `props` carries `timeScale` and `splash`; `drip()` calls each registered button's
// exposed `drip()`; `refresh()` makes them re-read `--goop-*` CSS vars (the tuner).
import type { ComputedRef, InjectionKey, Ref } from 'vue'

interface StageButton {
  el: HTMLElement | null
  drip: (x?: number) => void
  refresh: () => void
}

export interface GoopStage {
  slow: Ref<boolean>
  escape: Ref<boolean>
  props: ComputedRef<{ timeScale: number; splash: 'escape' | undefined }>
  register: (button: unknown) => void
  drip: () => void
  refresh: () => void
}

const KEY: InjectionKey<GoopStage> = Symbol('goop-stage')

export function createGoopStage(): GoopStage {
  const slow = ref(false)
  const escape = ref(false)
  const buttons = new Set<StageButton>()
  // Function refs get `null` on unmount; drop buttons that left the document instead.
  const live = () => {
    for (const b of buttons) if (!b.el?.isConnected) buttons.delete(b)
    return buttons
  }
  const stage: GoopStage = {
    slow,
    escape,
    // Per-instance time scale: only this frame slows down, not the whole page.
    props: computed(() => ({ timeScale: slow.value ? 0.3 : 1, splash: escape.value ? ('escape' as const) : undefined })),
    register: (b) => {
      if (b) buttons.add(b as StageButton)
    },
    drip: () => live().forEach((b) => b.drip()),
    refresh: () => live().forEach((b) => b.refresh()),
  }
  provide(KEY, stage)
  return stage
}

/** The enclosing stage, or an inert one when the demo sits outside a frame. */
export function useGoopStage(): GoopStage {
  return inject(KEY, null) ?? detachedStage()
}

function detachedStage(): GoopStage {
  return {
    slow: ref(false),
    escape: ref(false),
    props: computed(() => ({ timeScale: 1, splash: undefined })),
    register: () => {},
    drip: () => {},
    refresh: () => {},
  }
}
