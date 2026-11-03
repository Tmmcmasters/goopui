import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { toast } from 'vue-sonner'

// Spy on core's playback so tests never load Cuelume or touch Web Audio.
vi.mock('@goopui/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@goopui/core')>()),
  requestSound: vi.fn(),
  playCue: vi.fn(),
}))

const core = await import('@goopui/core')
const {
  GoopButton,
  GoopDialog,
  GoopDialogClose,
  GoopDialogContent,
  GoopDialogTitle,
  GoopDialogTrigger,
  GoopInput,
  GoopPlugin,
  GoopSwitch,
  GoopTabs,
  GoopTabsList,
  GoopTabsTrigger,
  GoopTextarea,
  GoopToaster,
  provideGoopSound,
} = await import('../src')

const settle = async () => {
  await flushPromises()
  await nextTick()
  await new Promise((r) => setTimeout(r, 20))
}
const cueAttrsIn = (root: ParentNode): string[] =>
  [...root.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((a) => a.name).filter((n) => n.startsWith('data-cuelume')))

beforeEach(() => {
  vi.mocked(core.requestSound).mockClear()
  vi.mocked(core.playCue).mockClear()
})
afterEach(() => {
  document.body.innerHTML = ''
})

const Controls = defineComponent({
  setup: () => () => [
    h(GoopButton, null, () => 'Save'),
    h(GoopSwitch),
    h(GoopInput),
    h(GoopTextarea),
    h(GoopTabs, { defaultValue: 'a' }, () =>
      h(GoopTabsList, null, () => [h(GoopTabsTrigger, { value: 'a' }, () => 'A'), h(GoopTabsTrigger, { value: 'b' }, () => 'B')]),
    ),
  ],
})

describe('sound (Vue)', () => {
  it('is off by default: no data-cuelume attributes and Cuelume is never requested', async () => {
    const w = mount(Controls, { attachTo: document.body })
    await settle()
    expect(cueAttrsIn(document.body)).toEqual([])
    expect(core.requestSound).not.toHaveBeenCalled()
    w.unmount()
  })

  it('`sound` marks the element with its cue and requests Cuelume on mount', async () => {
    const w = mount(
      defineComponent({
        setup: () => () => [
          h(GoopButton, { sound: true }, () => 'Save'),
          h(GoopSwitch, { sound: true }),
          h(GoopInput, { sound: true }),
          h(GoopTextarea, { sound: true, goo: false }),
        ],
      }),
      { attachTo: document.body },
    )
    await settle()
    expect(document.querySelector('[data-slot="button"]')!.hasAttribute('data-cuelume-tap')).toBe(true)
    expect(document.querySelector('[data-slot="switch"]')!.hasAttribute('data-cuelume-toggle')).toBe(true)
    expect(document.querySelector('input[data-slot="input"]')!.hasAttribute('data-cuelume-type')).toBe(true)
    expect(document.querySelector('textarea')!.hasAttribute('data-cuelume-type')).toBe(true)
    expect(core.requestSound).toHaveBeenCalled()
    w.unmount()
  })

  it('takes the app default from GoopPlugin; a component can opt out', async () => {
    const w = mount(
      defineComponent({
        setup: () => () => [h(GoopButton, { id: 'on' }, () => 'On'), h(GoopButton, { id: 'off', sound: false }, () => 'Off')],
      }),
      { attachTo: document.body, global: { plugins: [[GoopPlugin, { sound: true, preset: 'subtle' }]] } },
    )
    await settle()
    expect(document.getElementById('on')!.getAttribute('data-cuelume-tap')).toBe('')
    expect(document.getElementById('off')!.hasAttribute('data-cuelume-tap')).toBe(false)
    w.unmount()
  })

  it('provideGoopSound sets the default for a subtree; parts inherit from their root', async () => {
    const w = mount(
      defineComponent({
        setup() {
          provideGoopSound(true)
          return () =>
            h(GoopTabs, { defaultValue: 'a' }, () =>
              h(GoopTabsList, null, () => [h(GoopTabsTrigger, { value: 'a' }, () => 'A'), h(GoopTabsTrigger, { value: 'b' }, () => 'B')]),
            )
        },
      }),
      { attachTo: document.body },
    )
    await settle()
    const triggers = document.querySelectorAll('[data-slot="tabs-trigger"]')
    expect(triggers).toHaveLength(2)
    for (const t of triggers) expect(t.hasAttribute('data-cuelume-select')).toBe(true)
    w.unmount()
  })

  it('a sounding dialog: trigger opens, close buttons close, an as-child button gets one cue', async () => {
    const w = mount(
      defineComponent({
        setup: () => () =>
          h(GoopDialog, { sound: true, defaultOpen: true }, () => [
            h(GoopDialogTrigger, { id: 'trigger' }, () => 'Open'),
            h(GoopDialogContent, null, () => [
              h(GoopDialogTitle, null, () => 'Title'),
              h(GoopDialogClose, { asChild: true }, () => h(GoopButton, { id: 'cancel' }, () => 'Cancel')),
            ]),
          ]),
      }),
      { attachTo: document.body },
    )
    await settle()
    expect(document.getElementById('trigger')!.hasAttribute('data-cuelume-open')).toBe(true)
    const cancel = document.getElementById('cancel')!
    expect(cancel.hasAttribute('data-cuelume-close')).toBe(true)
    expect(cancel.hasAttribute('data-cuelume-tap')).toBe(false)
    // The built-in X button.
    const x = document.querySelector('[role="dialog"] > [data-slot="dialog-close"]')!
    expect(x.hasAttribute('data-cuelume-close')).toBe(true)
    w.unmount()
  })

  it('toasts play the cue for what they report, subtly, only with sound on', async () => {
    const quiet = mount(GoopToaster, { attachTo: document.body, props: { goo: false } })
    await settle()
    toast.success('Saved')
    await settle()
    expect(core.playCue).not.toHaveBeenCalled()
    toast.dismiss()
    quiet.unmount()
    await settle()

    const w = mount(GoopToaster, { attachTo: document.body, props: { goo: false, sound: true } })
    await settle()
    toast.error('Nope')
    await settle()
    expect(core.playCue).toHaveBeenCalledWith('error', { emphasis: 'subtle' })
    toast.dismiss()
    w.unmount()
  })
})
