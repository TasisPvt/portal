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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { SearchIcon, DownloadIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { removeCompanyFromIndex } from "../../_actions"
import { Spinner } from "@/src/components/ui/spinner"

export type IndexCompanyRow = {
  indexCompanyId: string
  companyId: string
  prowessId: string
  companyName: string
  isinCode: string | null
  bseScripCode: string | null
  nseSymbol: string | null
  addedAt: Date
}

function RemoveButton({ indexCompanyId, indexId, companyName }: { indexCompanyId: string; indexId: string; companyName: string }) {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()

  function handleRemove() {
    startTransition(async () => {
      const result = await removeCompanyFromIndex(indexCompanyId, indexId)
      if (result.success) {
        toast.success(`"${companyName}" removed from index.`)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Company</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-medium text-foreground">&quot;{companyName}&quot;</span> from this index?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? "Removing…" : "Remove"}
              {isPending && <Spinner className="ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function IndexCompanyTable({
  data,
  indexId,
  indexName,
}: {
  data: IndexCompanyRow[]
  indexId: string
  indexName: string
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const columns: ColumnDef<IndexCompanyRow>[] = React.useMemo(() => [
    {
      id: "prowessId",
      accessorFn: (row) => row.prowessId,
      header: ({ column }) => <SortableHeader column={column} label="Prowess ID" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.prowessId}</span>
      ),
    },
    {
      id: "companyName",
      accessorFn: (row) => row.companyName,
      header: ({ column }) => <SortableHeader column={column} label="Company" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            href={`/admin/company/${row.original.companyId}?from=/admin/index/${indexId}`}
            className="font-semibold text-sm leading-tight hover:underline hover:text-primary"
          >
            {row.original.companyName}
          </Link>
          <span className="font-mono text-xs text-muted-foreground">{row.original.isinCode}</span>
        </div>
      ),
    },
    {
      id: "bseScripCode",
      accessorFn: (row) => row.bseScripCode ?? "",
      header: ({ column }) => <SortableHeader column={column} label="BSE Code" />,
      cell: ({ row }) => row.original.bseScripCode
        ? <span className="font-mono text-xs">{row.original.bseScripCode}</span>
        : <span className="text-muted-foreground opacity-40 text-xs">—</span>,
    },
    {
      id: "nseSymbol",
      accessorFn: (row) => row.nseSymbol ?? "",
      header: ({ column }) => <SortableHeader column={column} label="NSE Symbol" />,
      cell: ({ row }) => row.original.nseSymbol
        ? <span className="font-mono text-xs">{row.original.nseSymbol}</span>
        : <span className="text-muted-foreground opacity-40 text-xs">—</span>,
    },
    {
      id: "addedAt",
      accessorFn: (row) => row.addedAt,
      header: ({ column }) => <SortableHeader column={column} label="Added" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.addedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <RemoveButton
            indexCompanyId={row.original.indexCompanyId}
            indexId={indexId}
            companyName={row.original.companyName}
          />
        </div>
      ),
    },
  ], [indexId])

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
    initialState: { pagination: { pageSize: 20 } },
  })

  function exportCSV() {
    const rows = table.getSortedRowModel().rows
    const headers = ["Prowess ID", "Company Name", "ISIN Code", "BSE Code", "NSE Symbol", "Added At"]
    const lines = rows.map(({ original: c }) =>
      [
        c.prowessId,
        c.companyName,
        c.isinCode ?? "",
        c.bseScripCode ?? "",
        c.nseSymbol ?? "",
        c.addedAt.toISOString().slice(0, 10),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${indexName.replace(/\s+/g, "-").toLowerCase()}-companies-${new Date().toISOString().slice(0, 10)}.csv`
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
            placeholder="Search company, ISIN, Prowess ID…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full hover:cursor-pointer" aria-label="Export CSV">
          <DownloadIcon className="size-3.5" />
        </Button>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody table={table} colSpan={columns.length} emptyMessage="No companies in this index yet." />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} pageSizeOptions={[10, 20, 50, 100]} />
    </DataTableCard>
  )
}
