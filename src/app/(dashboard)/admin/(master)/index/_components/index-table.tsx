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
import { Badge } from "@/src/components/ui/badge"
import { Input } from "@/src/components/ui/input"
import { SearchIcon } from "lucide-react"
import Link from "next/link"
import { EditIndexDialog, DeleteIndexButton } from "./index-dialogs"

export type IndexRow = {
  id: string
  name: string
  description: string | null
  companyCount: number
  createdAt: Date
  updatedAt: Date
}

export function IndexTable({ data }: { data: IndexRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<IndexRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Index Name" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/admin/index/${row.original.id}`}
            className="font-semibold text-sm leading-tight hover:underline hover:text-primary"
          >
            {row.original.name}
          </Link>
          {row.original.description && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">{row.original.description}</span>
          )}
        </div>
      ),
    },
    {
      id: "companyCount",
      accessorFn: (row) => row.companyCount,
      header: ({ column }) => <SortableHeader column={column} label="Companies" />,
      cell: ({ row }) => (
        <Badge variant="outline" className="rounded-full font-mono text-xs font-normal">
          {row.original.companyCount}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      header: ({ column }) => <SortableHeader column={column} label="Created" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <EditIndexDialog index={row.original} />
          <DeleteIndexButton id={row.original.id} name={row.original.name} />
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

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="relative w-full @2xl/main:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search indexes…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody table={table} colSpan={columns.length} emptyMessage="No indexes found." />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </DataTableCard>
  )
}
