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
   SearchIcon,
   ArrowUpIcon,
   ArrowDownIcon,
   ChevronsUpDownIcon,
   ChevronsLeftIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
   ChevronsRightIcon,
} from "lucide-react"

import { Badge } from "@/src/components/ui/badge"
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
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/src/components/ui/table"
import { cn } from "@/src/lib/utils"
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
   if (!v) return <span className="text-muted-foreground opacity-40 text-xs">—</span>
   return (
      <span className="tabular-nums text-xs">
         ₹{parseFloat(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
   )
}

function TypeBadge({ type }: { type: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal capitalize",
            type === "snapshot"
               ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
               : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
         )}
      >
         {type}
      </Badge>
   )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal",
            isActive
               ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
               : "border-muted text-muted-foreground",
         )}
      >
         {isActive ? "Active" : "Inactive"}
      </Badge>
   )
}

function SortableHeader<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
   const sorted = column.getIsSorted()
   return (
      <button
         className={cn(
            "flex items-center gap-1 select-none transition-colors whitespace-nowrap",
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

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingPlansTable({
   data,
   indexes,
}: {
   data: PricingPlanRow[]
   indexes: { id: string; name: string }[]
}) {
   const [sorting, setSorting] = React.useState<SortingState>([])
   const [globalFilter, setGlobalFilter] = React.useState("")
   const [typeFilter, setTypeFilter] = React.useState<"all" | "snapshot" | "list">("all")
   const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all")

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
               <span className="text-sm font-medium">{row.original.name}</span>
               <TypeBadge type={row.original.type} />
            </div>
         ),
      },
      {
         id: "config",
         enableSorting: false,
         header: () => <span className="text-muted-foreground text-xs whitespace-nowrap">Config</span>,
         cell: ({ row }) => {
            const r = row.original
            if (r.type === "list") {
               return r.indexName
                  ? <span className="text-xs text-muted-foreground">{r.indexName}</span>
                  : <span className="text-xs text-muted-foreground opacity-40">—</span>
            }
            // Snapshot — show one-time tier limits as a reference; full details are in edit dialog
            return (
               <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>{r.oneTimeStocksPerDay ?? "—"}/day (one-time)</span>
                  <span>{r.oneTimeStocksInDuration ?? "—"} stocks total</span>
               </div>
            )
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
            ? <span className="text-muted-foreground opacity-40 text-xs">—</span>
            : fmt(row.original.monthlyPrice),
      },
      {
         id: "quarterlyPrice",
         accessorFn: (r) => r.quarterlyPrice ? parseFloat(r.quarterlyPrice) : -1,
         header: ({ column }) => <SortableHeader column={column} label="Quarterly" />,
         cell: ({ row }) => fmt(row.original.quarterlyPrice),
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
            : <span className="text-muted-foreground opacity-40 text-xs">—</span>,
      },
      {
         id: "status",
         enableSorting: false,
         header: () => <span className="text-muted-foreground text-xs">Status</span>,
         cell: ({ row }) => <StatusBadge isActive={row.original.isActive} />,
      },
      {
         id: "actions",
         enableSorting: false,
         header: () => null,
         cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
               <EditPricingPlanDialog plan={row.original} indexes={indexes} />
               <PlanStatusToggle id={row.original.id} name={row.original.name} isActive={row.original.isActive} />
               <DeletePricingPlanButton id={row.original.id} name={row.original.name} />
            </div>
         ),
      },
   ], [indexes])

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

   const { pageIndex, pageSize } = table.getState().pagination
   const pageCount = table.getPageCount()

   return (
      <div className="flex w-full min-w-0 flex-col gap-4">
         {/* Toolbar */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
               <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  placeholder="Search plans…"
                  className="pl-9"
                  value={globalFilter}
                  onChange={(e) => {
                     setGlobalFilter(e.target.value)
                     table.setPageIndex(0)
                  }}
               />
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
               <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="w-32" size="sm">
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
               <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-28" size="sm">
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
                           No pricing plans found.
                        </TableCell>
                     </TableRow>
                  ) : (
                     table.getRowModel().rows.map((row) => (
                        <TableRow
                           key={row.id}
                           className={cn(
                              "group transition-colors hover:bg-muted/40",
                              !row.original.isActive && "opacity-60",
                           )}
                        >
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
                  onValueChange={(v) => { table.setPageSize(Number(v)); table.setPageIndex(0) }}
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
                     <Button key={i} variant={i === pageIndex ? "default" : "outline"} size="icon" className="size-7 text-xs" onClick={() => table.setPageIndex(i)}>
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
