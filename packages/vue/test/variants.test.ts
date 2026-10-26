import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
// The real shadcn-vue Button from the playground, so drift is caught here.
import ShadcnButton from '../../../apps/playground/app/components/ui/button/Button.vue'
import { buttonVariants as shadcnVariants } from '../../../apps/playground/app/components/ui/button/index'
import { GoopButton, buttonVariants, cn, goopButtonGooVariants, type ButtonSize, type ButtonVariant } from '../src'

const variants: ButtonVariant[] = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link']
const sizes: ButtonSize[] = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']

describe('GoopButton variants', () => {
  it('buttonVariants is identical to shadcn for every variant x size', () => {
    for (const variant of variants) {
      for (const size of sizes) expect(buttonVariants({ variant, size })).toBe(shadcnVariants({ variant, size }))
    }
    expect(buttonVariants()).toBe(shadcnVariants())
  })

  it('renders the same classes and data attrs as shadcn with goo off', () => {
    for (const variant of variants) {
      const props = { variant, size: 'sm' as const, class: 'w-full px-8' }
      const a = mount(ShadcnButton, { props, slots: { default: 'Go' } })
      const b = mount(GoopButton, { props: { ...props, goo: false }, slots: { default: 'Go' } })
      expect(b.classes()).toEqual(a.classes())
      for (const attr of ['data-slot', 'data-variant', 'data-size']) {
        expect(b.attributes(attr)).toBe(a.attributes(attr))
      }
    }
  })

  it('merges `class` like shadcn (cn: later utilities win)', () => {
    const w = mount(GoopButton, { props: { class: 'h-12 rounded-none' }, slots: { default: 'x' } })
    expect(w.classes()).toContain('h-12')
    expect(w.classes()).not.toContain('h-8')
    expect(w.classes()).toContain('rounded-none')
    expect(w.classes()).not.toContain('rounded-lg')
  })

  it('with goo on, keeps every shadcn class and adds only --goop-* custom props', () => {
    for (const variant of variants) {
      const w = mount(GoopButton, { props: { variant }, slots: { default: 'x' } })
      // cn() dedupes conflicts (e.g. outline's border-border beats border-transparent), as shadcn does.
      const shadcn = cn(shadcnVariants({ variant })).split(' ')
      for (const c of shadcn) expect(w.classes()).toContain(c)
      const extra = w.classes().filter((c) => !shadcn.includes(c))
      expect(extra.every((c) => c.includes('[--goop-'))).toBe(true)
      expect(extra.join(' ')).toBe(goopButtonGooVariants({ variant }))
    }
  })

  it('link has no goo by default; goo prop overrides', () => {
    expect(mount(GoopButton, { props: { variant: 'link' } }).attributes('data-goop-host')).toBeUndefined()
    expect(mount(GoopButton, { props: { variant: 'link', goo: true } }).attributes('data-goop-host')).toBe('none')
    expect(mount(GoopButton, { props: { variant: 'outline' } }).attributes('data-goop-host')).toBe('stroke')
  })
})
