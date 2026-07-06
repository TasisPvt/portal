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
import {
  Table,
  DataTableCard,
  DataTableHead,
  DataTableBody,
  DataTablePagination,
  SortableHeader,
} from "@/src/components/ui/data-table-parts"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { SearchIcon, DownloadIcon } from "lucide-react"
import { EditIndustryGroupDialog, DeleteIndustryGroupButton } from "./industry-group-dialogs"
import { BulkUploadIndustryGroupDialog } from "./bulk-upload-industry-group-dialog"

export type IndustryGroupRow = {
  id: string
  name: string
  companyCount: number
  createdAt: Date
}

export function IndustryGroupTable({ data }: { data: IndustryGroupRow[] }) {
  const existingNames = React.useMemo(() => data.map((r) => r.name), [data])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<IndustryGroupRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Industry Group" />,
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{row.original.name}</span>
      ),
    },
    {
      id: "companyCount",
      accessorFn: (row) => row.companyCount,
      header: ({ column }) => <SortableHeader column={column} label="Companies" />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.companyCount}</span>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Created" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <EditIndustryGroupDialog id={row.original.id} name={row.original.name} />
          <DeleteIndustryGroupButton id={row.original.id} name={row.original.name} locked={row.original.companyCount > 0} />
        </div>
      ),
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  function exportCSV() {
    const rows = table.getSortedRowModel().rows
    const headers = ["Industry Group", "Companies", "Created"]
    const lines = rows.map(({ original: r }) =>
      [
        r.name,
        r.companyCount,
        r.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `industry-groups-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="relative w-full @2xl/main:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search industry group…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <BulkUploadIndustryGroupDialog existingNames={existingNames} />
          <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full hover:cursor-pointer" aria-label="Export CSV">
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody table={table} colSpan={columns.length} emptyMessage="No industry groups found." />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </DataTableCard>
  )
}
