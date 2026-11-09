/** @jsxRuntime automatic */
/** @jsxImportSource react */
// The React Select docs previews: real @goopui/react selects, set by set like
// components/content/DemoSelect.vue (keep the two, and the code samples, in sync).
import { GoopSelect, GoopSelectContent, GoopSelectGroup, GoopSelectItem, GoopSelectLabel, GoopSelectTrigger, GoopSelectValue } from '@goopui/react'
import { useState } from 'react'

const fruits = ['Apple', 'Banana', 'Blueberry', 'Grapes', 'Pineapple']
const surfaces = [
  { label: 'popover (default)', value: 'popover' },
  { label: 'trigger', value: 'trigger' },
  { label: 'a CSS color', value: 'oklch(0.62 0.19 150)' },
] as const

const items = () => fruits.map((f) => (
  <GoopSelectItem key={f} value={f}>
    {f}
  </GoopSelectItem>
))

export function SelectDemo({ set, pg }: { set: string; pg: Record<string, Record<string, unknown>> }) {
  const [fruit, setFruit] = useState('Blueberry')
  const [placed, setPlaced] = useState('Blueberry')
  const [popper, setPopper] = useState('Blueberry')
  switch (set) {
    case 'position':
      return (
        <>
          <GoopSelect value={placed} onValueChange={setPlaced}>
            <GoopSelectTrigger className="w-44" aria-label="Item-aligned select">
              <GoopSelectValue />
            </GoopSelectTrigger>
            <GoopSelectContent>{items()}</GoopSelectContent>
          </GoopSelect>
          <GoopSelect value={popper} onValueChange={setPopper}>
            <GoopSelectTrigger className="w-44" aria-label="Popper select">
              <GoopSelectValue />
            </GoopSelectTrigger>
            <GoopSelectContent position="popper">{items()}</GoopSelectContent>
          </GoopSelect>
        </>
      )
    case 'surface':
      return (
        <>
          {surfaces.map((s) => (
            <GoopSelect key={s.value} defaultValue="Apple">
              <GoopSelectTrigger className="w-48" aria-label={`surface ${s.label}`}>
                <span className="truncate text-muted-foreground">{s.label}</span>
              </GoopSelectTrigger>
              <GoopSelectContent position="popper" surface={s.value}>
                {items()}
              </GoopSelectContent>
            </GoopSelect>
          ))}
        </>
      )
    default:
      return (
        <GoopSelect value={fruit} onValueChange={setFruit}>
          <GoopSelectTrigger className="w-44">
            <GoopSelectValue placeholder="Pick a fruit" />
          </GoopSelectTrigger>
          <GoopSelectContent {...pg.content}>
            <GoopSelectGroup>
              <GoopSelectLabel>Fruits</GoopSelectLabel>
              {items()}
            </GoopSelectGroup>
          </GoopSelectContent>
        </GoopSelect>
      )
  }
}
