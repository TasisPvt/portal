"use client"

import * as React from "react"
import Link from "next/link"
import { PackageIcon } from "lucide-react"
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
import { Input } from "@/src/components/ui/input"
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
  stocksInDurationSnapshot: number | null
}

type TypeFilter = "all" | "list" | "snapshot"
type ValidityFilter = "all" | "active" | "expired"

export function MySubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all")
  const [validityFilter, setValidityFilter] = React.useState<ValidityFilter>("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")

  // Validity is derived from endDate rather than the (unreliable) status column.
  const preFiltered = React.useMemo(() => {
    const now = Date.now()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(`${toDate}T23:59:59`) : null
    return data.filter((row) => {
      if (typeFilter !== "all" && row.planType !== typeFilter) return false
      const expired = row.endDate.getTime() < now
      if (validityFilter === "active" && expired) return false
      if (validityFilter === "expired" && !expired) return false
      if (from && row.startDate < from) return false
      if (to && row.startDate > to) return false
      return true
    })
  }, [data, typeFilter, validityFilter, fromDate, toDate])

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
  }, [typeFilter, validityFilter, fromDate, toDate, table])

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
          <Input
            type="date"
            aria-label="From date"
            className="h-8 w-auto rounded-full border-transparent bg-muted/50 text-xs"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span>–</span>
          <Input
            type="date"
            aria-label="To date"
            className="h-8 w-auto rounded-full border-transparent bg-muted/50 text-xs"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
          />
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => {
                setFromDate("")
                setToDate("")
              }}
            >
              Clear
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
