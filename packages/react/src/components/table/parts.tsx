// shadcn/ui's Table parts (TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
// TableCaption), `className` merge. Plain: no goo and no hooks, so no 'use client' (they render
// in React Server Components as they are). The goo lives on GoopTable. GoopTableEmpty is
// shadcn-vue's TableEmpty (a full-width row with a centred message), kept for parity with
// @goopui/vue.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { TABLE_BODY, TABLE_CAPTION, TABLE_CELL, TABLE_EMPTY_CELL, TABLE_FOOTER, TABLE_HEAD, TABLE_HEADER, TABLE_ROW } from './styles'

export type GoopTableHeaderProps = ComponentPropsWithoutRef<'thead'>

export const GoopTableHeader = forwardRef<HTMLTableSectionElement, GoopTableHeaderProps>(function GoopTableHeader({ className, ...props }, ref) {
  return <thead ref={ref} data-slot="table-header" className={cn(TABLE_HEADER, className)} {...props} />
})
GoopTableHeader.displayName = 'GoopTableHeader'

export type GoopTableBodyProps = ComponentPropsWithoutRef<'tbody'>

export const GoopTableBody = forwardRef<HTMLTableSectionElement, GoopTableBodyProps>(function GoopTableBody({ className, ...props }, ref) {
  return <tbody ref={ref} data-slot="table-body" className={cn(TABLE_BODY, className)} {...props} />
})
GoopTableBody.displayName = 'GoopTableBody'

export type GoopTableFooterProps = ComponentPropsWithoutRef<'tfoot'>

export const GoopTableFooter = forwardRef<HTMLTableSectionElement, GoopTableFooterProps>(function GoopTableFooter({ className, ...props }, ref) {
  return <tfoot ref={ref} data-slot="table-footer" className={cn(TABLE_FOOTER, className)} {...props} />
})
GoopTableFooter.displayName = 'GoopTableFooter'

export type GoopTableRowProps = ComponentPropsWithoutRef<'tr'>

export const GoopTableRow = forwardRef<HTMLTableRowElement, GoopTableRowProps>(function GoopTableRow({ className, ...props }, ref) {
  return <tr ref={ref} data-slot="table-row" className={cn(TABLE_ROW, className)} {...props} />
})
GoopTableRow.displayName = 'GoopTableRow'

export type GoopTableHeadProps = ComponentPropsWithoutRef<'th'>

export const GoopTableHead = forwardRef<HTMLTableCellElement, GoopTableHeadProps>(function GoopTableHead({ className, ...props }, ref) {
  return <th ref={ref} data-slot="table-head" className={cn(TABLE_HEAD, className)} {...props} />
})
GoopTableHead.displayName = 'GoopTableHead'

export type GoopTableCellProps = ComponentPropsWithoutRef<'td'>

export const GoopTableCell = forwardRef<HTMLTableCellElement, GoopTableCellProps>(function GoopTableCell({ className, ...props }, ref) {
  return <td ref={ref} data-slot="table-cell" className={cn(TABLE_CELL, className)} {...props} />
})
GoopTableCell.displayName = 'GoopTableCell'

export type GoopTableCaptionProps = ComponentPropsWithoutRef<'caption'>

export const GoopTableCaption = forwardRef<HTMLTableCaptionElement, GoopTableCaptionProps>(function GoopTableCaption({ className, ...props }, ref) {
  return <caption ref={ref} data-slot="table-caption" className={cn(TABLE_CAPTION, className)} {...props} />
})
GoopTableCaption.displayName = 'GoopTableCaption'

export type GoopTableEmptyProps = ComponentPropsWithoutRef<'td'> & {
  /** Columns the message spans. Default 1. */
  colSpan?: number
}

export const GoopTableEmpty = forwardRef<HTMLTableCellElement, GoopTableEmptyProps>(function GoopTableEmpty(
  { className, colSpan = 1, children, ...props },
  ref,
) {
  return (
    <GoopTableRow>
      <GoopTableCell ref={ref} colSpan={colSpan} className={cn(TABLE_EMPTY_CELL, className)} {...props}>
        <div className="flex items-center justify-center py-10">{children}</div>
      </GoopTableCell>
    </GoopTableRow>
  )
})
GoopTableEmpty.displayName = 'GoopTableEmpty'
