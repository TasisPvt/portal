"use client"

import * as React from "react"
import Link from "next/link"
import { PackageIcon, CalendarIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/src/components/ui/empty"
import {
  Table,
  DataTableCard,
  DataTableHead,
  DataTableBody,
  DataTablePagination,
  SortableHeader,
} from "@/src/components/ui/data-table-parts"
import { Calendar } from "@/src/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover"
import { cn } from "@/src/lib/utils"
import { PlanTypeBadge as TypeBadge } from "@/src/components/plan-type-badge"
import { SubscriptionStatusBadge as StatusBadge } from "@/src/components/subscription-status-badge"
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"

type SubscriptionRow = {
  id: string
  planName: string | null
  planType: string | null
  durationType: string
  status: string
  startDate: Date
  endDate: Date
  priceSnapshot: string
  stocksPerDaySnapshot: number | null
}

type TypeFilter = "all" | "list" | "snapshot"
type ValidityFilter = "all" | "active" | "expired"

const startOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfDay = (d: Date) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function MySubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all")
  const [validityFilter, setValidityFilter] = React.useState<ValidityFilter>("active")
  // `range` is the applied filter; `draft` is the in-progress calendar selection
  // that only becomes `range` when the user clicks Apply.
  const [range, setRange] = React.useState<DateRange | undefined>()
  const [draft, setDraft] = React.useState<DateRange | undefined>()
  const [pickerOpen, setPickerOpen] = React.useState(false)

  function handlePickerOpenChange(next: boolean) {
    if (next) setDraft(range) // seed the draft with the currently applied range
    setPickerOpen(next)
  }

  function applyRange() {
    setRange(draft)
    setPickerOpen(false)
  }

  function clearRange() {
    setRange(undefined)
    setDraft(undefined)
  }

  // Validity is derived from endDate rather than the (unreliable) status column.
  const preFiltered = React.useMemo(() => {
    const now = Date.now()
    const from = range?.from ? startOfDay(range.from) : null
    const to = range?.to ? endOfDay(range.to) : null
    return data.filter((row) => {
      if (typeFilter !== "all" && row.planType !== typeFilter) return false
      const expired = row.endDate.getTime() < now
      if (validityFilter === "active" && expired) return false
      if (validityFilter === "expired" && !expired) return false
      if (from && row.startDate < from) return false
      if (to && row.startDate > to) return false
      return true
    })
  }, [data, typeFilter, validityFilter, range])

  const columns: ColumnDef<SubscriptionRow>[] = React.useMemo(() => [
    {
      id: "plan",
      accessorFn: (r) => r.planName ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Plan" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm leading-tight">{row.original.planName ?? "—"}</span>
          {row.original.planType && <TypeBadge type={row.original.planType} />}
        </div>
      ),
    },
    {
      id: "duration",
      accessorFn: (r) => DURATION_LABELS[r.durationType] ?? r.durationType,
      header: ({ column }) => <SortableHeader column={column} label="Duration" />,
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {DURATION_LABELS[row.original.durationType] ?? row.original.durationType}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "startDate",
      accessorFn: (r) => r.startDate,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Start" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.original.startDate)}</span>
      ),
    },
    {
      id: "endDate",
      accessorFn: (r) => r.endDate,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Expires" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.original.endDate)}</span>
      ),
    },
    {
      id: "price",
      accessorFn: (r) => parseFloat(r.priceSnapshot),
      header: ({ column }) => <SortableHeader column={column} label="Price" />,
      cell: ({ row }) => (
        <span className="font-medium text-sm tabular-nums">{fmtPrice(row.original.priceSnapshot)}</span>
      ),
    },
  ], [])

  const table = useReactTable({
    data: preFiltered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  React.useEffect(() => {
    table.setPageIndex(0)
  }, [typeFilter, validityFilter, range, table])

  // Never subscribed — show the onboarding empty state (not the filtered-empty one).
  if (data.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageIcon />
          </EmptyMedia>
          <EmptyTitle>No subscriptions yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t subscribed to any plans yet. Browse our plans to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/plans">Browse plans</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-32 rounded-full" size="sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="snapshot">Snapshot</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={validityFilter} onValueChange={(v) => setValidityFilter(v as ValidityFilter)}>
            <SelectTrigger className="w-32 rounded-full" size="sm">
              <SelectValue placeholder="Validity" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">Started</span>
          <Popover open={pickerOpen} onOpenChange={handlePickerOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 justify-start gap-2 rounded-full border-transparent bg-muted/50 text-xs font-normal",
                  !range?.from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-3.5" />
                {range?.from ? (
                  range.to ? (
                    <span className="whitespace-nowrap">
                      {fmtDate(range.from)} – {fmtDate(range.to)}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap">{fmtDate(range.from)} – …</span>
                  )
                ) : (
                  <span>Pick a range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={draft?.from}
                selected={draft}
                onSelect={setDraft}
                autoFocus
              />
              <div className="flex items-center justify-between gap-2 border-t p-3">
                <span className="text-xs text-muted-foreground">
                  {draft?.from ? (
                    draft.to ? (
                      `${fmtDate(draft.from)} – ${fmtDate(draft.to)}`
                    ) : (
                      `${fmtDate(draft.from)} – …`
                    )
                  ) : (
                    "No range selected"
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() => setDraft(undefined)}
                    disabled={!draft?.from}
                  >
                    Reset
                  </Button>
                  <Button size="sm" className="rounded-full text-xs" onClick={applyRange}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {range?.from && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear date range"
              className="size-8 rounded-full"
              onClick={clearRange}
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody
          table={table}
          colSpan={columns.length}
          emptyMessage="No subscriptions match your filters."
          rowClassName={(row) => (row.original.endDate.getTime() < Date.now() ? "opacity-60" : undefined)}
        />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </DataTableCard>
  )
}
