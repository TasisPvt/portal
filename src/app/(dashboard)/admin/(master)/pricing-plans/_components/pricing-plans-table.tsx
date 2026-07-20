"use client"

import * as React from "react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpRightIcon, SearchIcon } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/src/components/ui/badge"
import { PlanTypeBadge as TypeBadge } from "@/src/components/plan-type-badge"
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
  Table,
  DataTableCard,
  DataTableHead,
  DataTableBody,
  DataTablePagination,
  SortableHeader,
  DotBadge,
} from "@/src/components/ui/data-table-parts"
import {
  EditPricingPlanDialog,
  DeletePricingPlanButton,
  PlanStatusToggle,
  type PricingPlanRow,
} from "./pricing-plan-dialogs"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(v: string | null | undefined) {
  if (!v) return <span className="text-muted-foreground opacity-40 text-xs">-</span>
  return (
    <span className="tabular-nums text-xs">
      ₹{parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <DotBadge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
      Active
    </DotBadge>
  ) : (
    <DotBadge className="text-muted-foreground">Inactive</DotBadge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingPlansTable({
  data,
  indexes,
  categories,
}: {
  data: PricingPlanRow[]
  indexes: { id: string; name: string }[]
  categories: string[]
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | "snapshot" | "list">("all")
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("active")

  const preFiltered = React.useMemo(() => {
    return data.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false
      if (statusFilter === "active" && !r.isActive) return false
      if (statusFilter === "inactive" && r.isActive) return false
      return true
    })
  }, [data, typeFilter, statusFilter])

  const columns: ColumnDef<PricingPlanRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (r) => r.name,
      header: ({ column }) => <SortableHeader column={column} label="Plan Name" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{row.original.name}</span>
          <TypeBadge type={row.original.type} />
        </div>
      ),
    },
    {
      id: "config",
      enableSorting: false,
      header: () => <span>Config</span>,
      cell: ({ row }) => {
        const r = row.original
        if (r.type === "list") {
          return r.indexName && r.indexId
            ? (
              <Link
                href={`/admin/index/${r.indexId}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {r.indexName}
                <ArrowUpRightIcon className="size-3" />
              </Link>
            )
            : <span className="text-xs text-muted-foreground opacity-40">-</span>
        }
        // Snapshot - show the one-time daily limit as a reference; full details are in edit dialog
        return (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>{r.oneTimeStocksPerDay ?? "-"}/day (one-time)</span>
          </div>
        )
      },
    },
    {
      id: "category",
      accessorFn: (r) => r.category ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Category" />,
      cell: ({ row }) => {
        const r = row.original
        if (r.type !== "list") return <span className="text-muted-foreground opacity-40 text-xs">-</span>
        return r.category
          ? <Badge variant="outline" className="rounded-full text-xs font-normal">{r.category}</Badge>
          : <span className="text-xs italic text-muted-foreground opacity-60">Uncategorized</span>
      },
    },
    {
      id: "oneTimePrice",
      accessorFn: (r) => r.oneTimePrice ? parseFloat(r.oneTimePrice) : -1,
      header: ({ column }) => <SortableHeader column={column} label="One-time" />,
      cell: ({ row }) => fmt(row.original.oneTimePrice),
    },
    {
      id: "monthlyPrice",
      accessorFn: (r) => r.monthlyPrice ? parseFloat(r.monthlyPrice) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Monthly" />,
      cell: ({ row }) => row.original.type === "list"
        ? <span className="text-muted-foreground opacity-40 text-xs">-</span>
        : fmt(row.original.monthlyPrice),
    },
    {
      id: "quarterlyPrice",
      accessorFn: (r) => r.quarterlyPrice ? parseFloat(r.quarterlyPrice) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Quarterly" />,
      cell: ({ row }) => row.original.type === "list"
        ? <span className="text-muted-foreground opacity-40 text-xs">-</span>
        : fmt(row.original.quarterlyPrice),
    },
    {
      id: "annualPrice",
      accessorFn: (r) => r.annualPrice ? parseFloat(r.annualPrice) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Annual" />,
      cell: ({ row }) => fmt(row.original.annualPrice),
    },
    {
      id: "createdBy",
      accessorFn: (r) => r.createdByName ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Created By" />,
      cell: ({ row }) => row.original.createdByName
        ? <span className="text-xs text-muted-foreground">{row.original.createdByName}</span>
        : <span className="text-muted-foreground opacity-40 text-xs">-</span>,
    },
    {
      id: "status",
      enableSorting: false,
      header: () => <span>Status</span>,
      cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <EditPricingPlanDialog plan={row.original} indexes={indexes} categories={categories} />
          <PlanStatusToggle id={row.original.id} name={row.original.name} isActive={row.original.isActive} />
          <DeletePricingPlanButton id={row.original.id} name={row.original.name} />
        </div>
      ),
    },
  ], [indexes, categories])

  const table = useReactTable({
    data: preFiltered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="relative w-full @2xl/main:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plans…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); table.setPageIndex(0) }}>
            <SelectTrigger className="w-32 rounded-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="snapshot">Snapshot</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); table.setPageIndex(0) }}>
            <SelectTrigger className="w-28 rounded-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody
          table={table}
          colSpan={columns.length}
          emptyMessage="No pricing plans found."
          rowClassName={(row) => (!row.original.isActive ? "opacity-60" : undefined)}
        />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} pageSizeOptions={[10, 20, 50]} />
    </DataTableCard>
  )
}
