import {
  ALERT_DIALOG_SPLASH,
  BACKDROP_LUMPS,
  DIALOG_FEEL,
  EMERGE_CIRCLES,
  EMERGE_MOMENTUM_CIRCLES,
  activeTickerCount,
  emergeBloomDuration,
  isLoopRunning,
} from '@goopui/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref, type PropType } from 'vue'
import {
  GoopAlertDialog,
  GoopAlertDialogAction,
  GoopAlertDialogCancel,
  GoopAlertDialogContent,
  GoopAlertDialogDescription,
  GoopAlertDialogFooter,
  GoopAlertDialogHeader,
  GoopAlertDialogTitle,
  GoopAlertDialogTrigger,
  GoopDialog,
  GoopDialogContent,
  GoopDialogDescription,
  GoopDialogFooter,
  GoopDialogHeader,
  GoopDialogTitle,
  GoopDialogTrigger,
  GoopPlugin,
  goopComponents,
  toBackdropOptions,
  toDialogOptions,
} from '../src'

const Demo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const open = ref(props.open)
    return () =>
      h(GoopDialog, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) }, () => [
        h(GoopDialogTrigger, null, () => 'Edit profile'),
        h(GoopDialogContent, props.content, () => [
          h(GoopDialogHeader, null, () => [
            h(GoopDialogTitle, null, () => 'Edit profile'),
            h(GoopDialogDescription, null, () => 'Make changes to your profile.'),
          ]),
          h(GoopDialogFooter, { showCloseButton: true }),
        ]),
      ])
  },
})

const AlertDemo = defineComponent({
  props: {
    open: { type: Boolean, default: true },
    content: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props) {
    const open = ref(props.open)
    return () =>
      h(GoopAlertDialog, { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v) }, () => [
        h(GoopAlertDialogTrigger, null, () => 'Delete'),
        h(GoopAlertDialogContent, props.content, () => [
          h(GoopAlertDialogHeader, null, () => [
            h(GoopAlertDialogTitle, null, () => 'Are you absolutely sure?'),
            h(GoopAlertDialogDescription, null, () => 'This cannot be undone.'),
          ]),
          h(GoopAlertDialogFooter, null, () => [
            h(GoopAlertDialogCancel, null, () => 'Cancel'),
            h(GoopAlertDialogAction, null, () => 'Continue'),
          ]),
        ]),
      ])
  },
})

const q = (slot: string) => document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('GoopDialog', () => {
  it('is in the manifest with every shadcn part', () => {
    for (const p of ['', 'Trigger', 'Content', 'Overlay', 'Header', 'Footer', 'Title', 'Description', 'Close']) {
      expect(goopComponents).toContain(`GoopDialog${p}`)
    }
    for (const p of ['', 'Trigger', 'Content', 'Overlay', 'Header', 'Footer', 'Title', 'Description', 'Action', 'Cancel']) {
      expect(goopComponents).toContain(`GoopAlertDialog${p}`)
    }
  })

  it('renders real content over an aria-hidden goo surface that blooms detached', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const el = q('dialog-content')!
    expect(el.getAttribute('role')).toBe('dialog')
    const surface = el.firstElementChild as HTMLElement
    expect(surface.getAttribute('data-goop')).toBe('surface')
    expect(surface.getAttribute('aria-hidden')).toBe('true')
    expect(surface.querySelectorAll('[data-goop="blob"]')).toHaveLength(EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES)
    expect(el.getAttribute('data-goop-emerge')).toBe('opening')
    expect(el.textContent).toContain('Make changes to your profile.')
    expect(el.querySelector('[data-slot="dialog-close"]')).not.toBeNull()
    // Dialog timing (DIALOG_FEEL's bloom close).
    expect(el.style.getPropertyValue('--goop-emerge-close')).toBe(`${Math.round(emergeBloomDuration(DIALOG_FEEL.playful, 'close') * 1000)}ms`)
    expect(isLoopRunning()).toBe(true)
    w.unmount()
    expect(activeTickerCount()).toBe(0)
  })

  it(':overlay="true" opts into the pouring goo sheet', async () => {
    const w = mount(Demo, { props: { content: { overlay: true } }, attachTo: document.body })
    await flushPromises()
    const ov = q('dialog-overlay')!
    expect(ov.getAttribute('data-goop-backdrop')).toBe('opening')
    expect(ov.querySelectorAll('[data-goop="blob"]')).toHaveLength(BACKDROP_LUMPS)
    expect(ov.className.split(' ')).not.toContain('bg-black/50')
    w.unmount()
  })

  it('by default keeps the panel goo over shadcn\'s fading overlay', async () => {
    const w = mount(Demo, { attachTo: document.body })
    await flushPromises()
    const ov = q('dialog-overlay')!
    expect(ov.hasAttribute('data-goop-backdrop')).toBe(false)
    expect(ov.className.split(' ')).toContain('bg-black/50')
    expect(q('dialog-content')!.hasAttribute('data-goop-emerge')).toBe(true)
    w.unmount()
  })

  it('moves the background onto the goo; class passthrough merges', async () => {
    const w = mount(Demo, { props: { content: { class: 'sm:max-w-md' } }, attachTo: document.body })
    await flushPromises()
    const cls = q('dialog-content')!.className.split(' ')
    expect(cls).toContain('sm:max-w-md')
    expect(cls).not.toContain('sm:max-w-lg')
    expect(cls).toContain('[--goop-color:var(--background)]')
    for (const c of ['bg-background', 'shadow-lg', 'border', 'data-[state=open]:animate-in']) expect(cls).not.toContain(c)
    w.unmount()
  })

  it(':goo="false" is exactly shadcn DialogContent and overlay', async () => {
    const w = mount(Demo, { props: { content: { goo: false } }, attachTo: document.body })
    await flushPromises()
    const el = q('dialog-content')!
    expect(el.className.split(' ')).toEqual(expect.arrayContaining(['bg-background', 'border', 'shadow-lg']))
    expect(el.querySelector('[data-goop="surface"]')).toBeNull()
    expect(el.hasAttribute('data-goop-emerge')).toBe(false)
    expect(q('dialog-overlay')!.className.split(' ')).toContain('bg-black/50')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('reduced motion: opens at rest, nothing ticks', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const w = mount(Demo, { props: { content: { overlay: true } }, attachTo: document.body })
    await flushPromises()
    const el = q('dialog-content')!
    expect(el.getAttribute('data-goop-emerge')).toBe('open')
    expect(el.hasAttribute('data-goop-still')).toBe(true)
    expect(el.style.getPropertyValue('--goop-emerge-content')).toBe('1')
    expect(q('dialog-overlay')!.getAttribute('data-goop-backdrop')).toBe('open')
    expect(activeTickerCount()).toBe(0)
    w.unmount()
  })

  it('honors app config (reducedMotion forced on)', async () => {
    const w = mount(Demo, { global: { plugins: [[GoopPlugin, { reducedMotion: true }]] }, attachTo: document.body })
    await flushPromises()
    expect(q('dialog-content')!.getAttribute('data-goop-emerge')).toBe('open')
    w.unmount()
  })

  it('opens on the trigger and plays the close (panel and overlay) when it closes', async () => {
    const w = mount(Demo, { props: { open: false, content: { overlay: true } }, attachTo: document.body })
    await flushPromises()
    expect(q('dialog-content')).toBeNull()
    await w.find('[data-slot="dialog-trigger"]').trigger('click')
    await flushPromises()
    const el = q('dialog-content')!
    const ov = q('dialog-overlay')!
    expect(el.getAttribute('data-goop-emerge')).toBe('opening')
    const seen: string[] = []
    const seenOv: string[] = []
    const mo = new MutationObserver(() => {
      const s = el.getAttribute('data-goop-emerge')
      if (s && seen.at(-1) !== s) seen.push(s)
      const o = ov.getAttribute('data-goop-backdrop')
      if (o && seenOv.at(-1) !== o) seenOv.push(o)
    })
    mo.observe(el, { attributes: true, attributeFilter: ['data-goop-emerge'] })
    mo.observe(ov, { attributes: true, attributeFilter: ['data-goop-backdrop'] })
    ;(document.querySelector('[data-slot="dialog-footer"] button') as HTMLElement).click()
    await flushPromises()
    mo.disconnect()
    expect(seen).toContain('closing')
    expect(seenOv).toContain('closing')
    w.unmount()
    expect(isLoopRunning()).toBe(false)
  })
})

describe('GoopAlertDialog', () => {
  it('blooms with a lighter splash; Action / Cancel are GoopButtons', async () => {
    const w = mount(AlertDemo, { attachTo: document.body })
    await flushPromises()
    const el = q('alert-dialog-content')!
    expect(el.getAttribute('role')).toBe('alertdialog')
    expect(el.getAttribute('data-goop-emerge')).toBe('opening')
    expect(q('alert-dialog-overlay')!.hasAttribute('data-goop-backdrop')).toBe(false)
    const action = q('alert-dialog-action')!
    const cancel = q('alert-dialog-cancel')!
    expect(action.tagName).toBe('BUTTON')
    expect(action.textContent).toContain('Continue')
    expect(cancel.className).toContain('mt-2')
    w.unmount()
  })

  it('Cancel closes it', async () => {
    const w = mount(AlertDemo, { attachTo: document.body })
    await flushPromises()
    const el = q('alert-dialog-content')!
    const seen: string[] = []
    const mo = new MutationObserver(() => {
      const s = el.getAttribute('data-goop-emerge')
      if (s && seen.at(-1) !== s) seen.push(s)
    })
    mo.observe(el, { attributes: true, attributeFilter: ['data-goop-emerge'] })
    q('alert-dialog-cancel')!.click()
    await flushPromises()
    mo.disconnect()
    expect(seen).toContain('closing')
    w.unmount()
  })
})

describe('toDialogOptions / toBackdropOptions', () => {
  it('dialog: detached bloom with the full splash', () => {
    const o = toDialogOptions({})
    expect(o).toMatchObject({ detached: true, feel: DIALOG_FEEL, openDrips: true, openSlosh: true, closeSlosh: true, surfaceColor: 'popover' })
    expect(o.openDripAmount).toBeUndefined()
  })

  it('alert: a lighter splash and slosh unless overridden', () => {
    const o = toDialogOptions({}, {}, 'alert')
    expect(o.openDripAmount).toBe(ALERT_DIALOG_SPLASH.openDripAmount)
    expect(o.openSlosh).toBeLessThan(1)
    expect(toDialogOptions({ openDrips: false, openDripAmount: 2, openSlosh: 1.5 }, {}, 'alert')).toMatchObject({ openDrips: false, openDripAmount: 2, openSlosh: 1.5 })
  })

  it('every effect toggles off', () => {
    const o = toDialogOptions({ wobble: false, fade: false, openSlosh: false, openDrips: false, closeSlosh: false })
    expect(o).toMatchObject({ wobble: false, fade: false, openSlosh: false, openDrips: false, closeSlosh: false })
    expect(toBackdropOptions({ overlay: false })).toBeNull()
    expect(toBackdropOptions({ goo: false })).toBeNull()
    expect(toBackdropOptions({ overlayDrips: false })).toMatchObject({ drips: false })
  })
})
