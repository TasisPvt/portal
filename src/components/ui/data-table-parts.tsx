"use client"

import * as React from "react"
import {
  flexRender,
  type Column,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

// Soft, layered shadow used on every data-table card.
const CARD_SHADOW =
  "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, lab(41.7613 -1.18394 -18.0904 / 0.04) 0px 1px 2px 0px, lab(41.7613 -1.18394 -18.0904 / 0.04) 0px 4px 16px 0px"

/** Rounded card that wraps a table's toolbar + table + pagination. */
export function DataTableCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="w-full min-w-0">
      <div
        className={cn("overflow-hidden rounded-2xl border bg-card", className)}
        style={{ boxShadow: CARD_SHADOW }}
      >
        {children}
      </div>
    </div>
  )
}

/** Sortable column header button (muted → foreground on active/hover). */
export function SortableHeader<T>({
  column,
  label,
}: {
  column: Column<T, unknown>
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <button
      className={cn(
        "flex items-center gap-1 select-none transition-colors hover:cursor-pointer hover:text-foreground",
        sorted && "text-foreground",
      )}
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      {sorted === "asc" && <ArrowUpIcon className="size-3" />}
      {sorted === "desc" && <ArrowDownIcon className="size-3" />}
      {!sorted && <ChevronsUpDownIcon className="size-3 opacity-40" />}
    </button>
  )
}

/** Outline pill badge with a leading dot that tracks the text color. */
export function DotBadge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full text-xs font-medium", className)}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  )
}

/** Themed table header row (uppercase, muted). */
export function DataTableHead<T>({ table }: { table: TanstackTable<T> }) {
  return (
    <TableHeader className="bg-muted/40">
      {table.getHeaderGroups().map((hg) => (
        <TableRow key={hg.id} className="hover:bg-transparent">
          {hg.headers.map((header) => (
            <TableHead
              key={header.id}
              className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  )
}

/** Themed table body with roomy cells + empty state. */
export function DataTableBody<T>({
  table,
  colSpan,
  emptyMessage = "No results.",
  rowClassName,
}: {
  table: TanstackTable<T>
  colSpan: number
  emptyMessage?: string
  /** Optional per-row className (e.g. dim inactive rows). */
  rowClassName?: (row: Row<T>) => string | undefined
}) {
  const rows = table.getRowModel().rows
  return (
    <TableBody>
      {rows.length === 0 ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
            {emptyMessage}
          </TableCell>
        </TableRow>
      ) : (
        rows.map((row) => (
          <TableRow key={row.id} className={rowClassName?.(row)}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id} className="px-4 py-3.5">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      )}
    </TableBody>
  )
}

// Compact page list: first, last, current ±1, plus a run of 3 near the edges,
// with "ellipsis" markers for the gaps (e.g. 1 2 3 … 8).
export function getPageItems(current: number, count: number): (number | "ellipsis")[] {
  const c = current + 1
  const pages = new Set<number>([1, count, c, c - 1, c + 1])
  if (c <= 3) {
    pages.add(2)
    pages.add(3)
  }
  if (c >= count - 2) {
    pages.add(count - 1)
    pages.add(count - 2)
  }
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const items: (number | "ellipsis")[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) items.push("ellipsis")
    items.push(p)
    prev = p
  }
  return items
}

/** Footer: "Showing X–Y of Z results" + rows-per-page + pill pagination. */
export function DataTablePagination<T>({
  table,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: {
  table: TanstackTable<T>
  pageSizeOptions?: number[]
}) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const total = table.getFilteredRowModel().rows.length
  const rowsOnPage = table.getRowModel().rows.length
  const start = total === 0 ? 0 : pageIndex * pageSize + 1
  const end = pageIndex * pageSize + rowsOnPage

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground @xl/main:flex-row @xl/main:items-center @xl/main:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Showing{" "}
          <span className="font-medium text-foreground">
            {start}–{end}
          </span>{" "}
          of <span className="font-medium text-foreground">{total}</span> results
        </span>
        <div className="flex items-center gap-1.5">
          <span>Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              table.setPageSize(Number(v))
              table.setPageIndex(0)
            }}
          >
            <SelectTrigger className="h-7 w-16 rounded-full text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        {getPageItems(pageIndex, pageCount).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p - 1 === pageIndex ? "default" : "ghost"}
              size="icon-sm"
              className="rounded-full text-xs"
              onClick={() => table.setPageIndex(p - 1)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// Re-export the base Table so table files can import everything from one place.
export { Table }
