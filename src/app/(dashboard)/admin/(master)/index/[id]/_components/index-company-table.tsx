"use client"

import * as React from "react"
import {
   flexRender,
   getCoreRowModel,
   getFilteredRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   useReactTable,
   type Column,
   type ColumnDef,
   type SortingState,
} from "@tanstack/react-table"
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/src/components/ui/table"
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
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/src/components/ui/dialog"
import {
   SearchIcon,
   ArrowUpIcon,
   ArrowDownIcon,
   ChevronsUpDownIcon,
   ChevronsLeftIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
   ChevronsRightIcon,
   DownloadIcon,
   Trash2Icon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
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

function SortableHeader<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
   const sorted = column.getIsSorted()
   return (
      <button
         className={cn(
            "flex items-center gap-1 select-none transition-colors",
            sorted ? "text-foreground" : "text-muted-foreground",
            "hover:cursor-pointer hover:text-foreground",
         )}
         onClick={column.getToggleSortingHandler()}
      >
         {label}
         {sorted === "asc" && <ArrowUpIcon className="size-3.5" />}
         {sorted === "desc" && <ArrowDownIcon className="size-3.5" />}
         {!sorted && <ChevronsUpDownIcon className="size-3.5 opacity-40" />}
      </button>
   )
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

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
                  className="font-medium text-sm leading-tight hover:underline hover:text-primary"
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
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

   const { pageIndex, pageSize } = table.getState().pagination
   const pageCount = table.getPageCount()

   return (
      <div className="flex w-full min-w-0 flex-col gap-4">
         {/* Toolbar */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
               <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  placeholder="Search company, ISIN, Prowess ID…"
                  className="pl-9"
                  value={globalFilter}
                  onChange={(e) => {
                     setGlobalFilter(e.target.value)
                     table.setPageIndex(0)
                  }}
               />
            </div>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 self-end sm:self-auto">
               <DownloadIcon className="size-3.5" />
               Export CSV
            </Button>
         </div>

         {/* Table */}
         <div className="overflow-x-auto rounded-xl border">
            <Table>
               <TableHeader className="bg-muted/60">
                  {table.getHeaderGroups().map((hg) => (
                     <TableRow key={hg.id} className="hover:bg-transparent">
                        {hg.headers.map((header) => (
                           <TableHead key={header.id} className="pl-4">
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                           </TableHead>
                        ))}
                     </TableRow>
                  ))}
               </TableHeader>
               <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                           No companies in this index yet.
                        </TableCell>
                     </TableRow>
                  ) : (
                     table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="group transition-colors hover:bg-muted/40">
                           {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} className="pl-4">
                                 {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                           ))}
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </div>

         {/* Pagination */}
         <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
               <span>Show</span>
               <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                     table.setPageSize(Number(v))
                     table.setPageIndex(0)
                  }}
               >
                  <SelectTrigger className="h-7 w-16 text-xs" size="sm">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectGroup>
                        {PAGE_SIZE_OPTIONS.map((s) => (
                           <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                        ))}
                     </SelectGroup>
                  </SelectContent>
               </Select>
               <span>per page &nbsp;·&nbsp; {table.getFilteredRowModel().rows.length} total</span>
            </div>
            <div className="flex items-center gap-1">
               <Button variant="outline" size="icon" className="size-7" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                  <ChevronsLeftIcon className="size-3.5" />
               </Button>
               <Button variant="outline" size="icon" className="size-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <ChevronLeftIcon className="size-3.5" />
               </Button>
               {Array.from({ length: pageCount }, (_, i) => i)
                  .filter((i) => Math.abs(i - pageIndex) <= 2)
                  .map((i) => (
                     <Button
                        key={i}
                        variant={i === pageIndex ? "default" : "outline"}
                        size="icon"
                        className="size-7 text-xs"
                        onClick={() => table.setPageIndex(i)}
                     >
                        {i + 1}
                     </Button>
                  ))}
               <Button variant="outline" size="icon" className="size-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <ChevronRightIcon className="size-3.5" />
               </Button>
               <Button variant="outline" size="icon" className="size-7" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}>
                  <ChevronsRightIcon className="size-3.5" />
               </Button>
            </div>
         </div>
      </div>
   )
}
