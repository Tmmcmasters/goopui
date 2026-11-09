'use client'
// GoopTable: shadcn/ui's Table (a scrolling `table-container` <div> around the <table>; props,
// `className` and the `ref` go on the <table>) whose body rows' hover background is ONE goo
// blob (core `attachTableHighlight` after hydration, the menu highlight engine with a calm feel
// and a pointer swell). It glides from row to row as the pointer moves down the table and
// fades out when it leaves; with `selected` it rests on the selected row. The blob is
// aria-hidden, in a clipping stage behind the rows (never changes the container's scroll
// size); while it is attached the rows drop their flat hover fill (goop.css). Touch never
// lights a row. Reduced motion: the blob snaps. SSR renders shadcn markup. The other parts are
// server-safe (./parts).
import { attachTableHighlight, type TableHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { TABLE_PROP_KEYS, splitProps, toTableOptions, type GoopTableProps } from '../../goop-props'
import { useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { TABLE, TABLE_CONTAINER } from './styles'

export type GoopTableRootProps = Omit<ComponentPropsWithoutRef<'table'>, keyof GoopTableProps> &
  GoopTableProps & {
    /** Receives the live row highlight handle (null before mount / when the blob is off). */
    goopRef?: Ref<TableHighlightHandle>
  }

export const GoopTable = forwardRef<HTMLTableElement, GoopTableRootProps>(function GoopTable(allProps, ref) {
  const [engine, props] = splitProps(allProps, TABLE_PROP_KEYS)
  const { className, goopRef, ...rest } = props
  const options = useStableValue(toTableOptions(engine, useGoopConfig()))
  const blob = options !== null

  const container = useRef<HTMLDivElement | null>(null)
  const handle = useRef<TableHighlightHandle | null>(null)

  // Attach / update / detach as the options change (same as the Vue `sync`).
  useIsomorphicLayoutEffect(() => {
    const el = container.current
    if (!el || !options) {
      handle.current?.destroy()
      handle.current = null
      return
    }
    if (handle.current) handle.current.update(options)
    else handle.current = attachTableHighlight(el, options)
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  useImperativeHandle(goopRef, () => handle.current as TableHighlightHandle)

  return (
    <div ref={container} data-slot="table-container" data-goop-table={blob ? '' : undefined} className={TABLE_CONTAINER}>
      <table ref={ref} data-slot="table" className={cn(TABLE, className)} {...rest} />
    </div>
  )
})
GoopTable.displayName = 'GoopTable'
