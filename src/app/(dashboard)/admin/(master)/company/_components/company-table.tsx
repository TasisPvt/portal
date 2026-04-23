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
   SearchIcon,
   ArrowUpIcon,
   ArrowDownIcon,
   ChevronsUpDownIcon,
   ChevronsLeftIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
   ChevronsRightIcon,
   DownloadIcon,
   XIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/src/lib/utils"
import { EditCompanyDialog, ToggleCompanyStatusButton } from "./company-dialogs"
import { BulkUploadCompanyDialog } from "./bulk-upload-company-dialog"

export type CompanyRow = {
   id: string
   prowessId: string
   companyName: string
   isinCode: string | null
   bseScripCode: string | null
   bseScripId: string | null
   bseGroup: string | null
   nseSymbol: string | null
   serviceGroup: string | null
   nseListingDate: string | null
   nseDelistingDate: string | null
   bseListingDate: string | null
   bseDelistingDate: string | null
   industryGroupId: string | null
   industryGroupName: string | null
   isActive: boolean
   createdAt: Date
}

type IndustryGroupOption = { id: string; name: string }

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

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

export function CompanyTable({
   data,
   industryGroups,
}: {
   data: CompanyRow[]
   industryGroups: IndustryGroupOption[]
}) {
   const [sorting, setSorting] = React.useState<SortingState>([])
   const [globalFilter, setGlobalFilter] = React.useState("")
   const [igFilter, setIgFilter] = React.useState("all")
   const [statusFilter, setStatusFilter] = React.useState("all")
   const [activeFilters, setActiveFilters] = React.useState<{ key: string; label: string }[]>([])

   const preFiltered = React.useMemo(() => {
      return data.filter((c) => {
         if (igFilter !== "all") {
            if (igFilter === "__none__" && c.industryGroupId) return false
            if (igFilter !== "__none__" && c.industryGroupId !== igFilter) return false
         }
         if (statusFilter === "active" && !c.isActive) return false
         if (statusFilter === "inactive" && c.isActive) return false
         return true
      })
   }, [data, igFilter, statusFilter])

   const columns: ColumnDef<CompanyRow>[] = React.useMemo(() => [
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
                  href={`/admin/company/${row.original.id}`}
                  className="font-medium text-sm leading-tight hover:underline hover:text-primary"
               >
                  {row.original.companyName}
               </Link>
               <span className="font-mono text-xs text-muted-foreground">{row.original.isinCode}</span>
            </div>
         ),
      },
      {
         id: "industryGroupName",
         accessorFn: (row) => row.industryGroupName ?? "",
         header: ({ column }) => <SortableHeader column={column} label="Industry Group" />,
         cell: ({ row }) =>
            row.original.industryGroupName ? (
               <Badge variant="outline" className="text-xs font-normal">
                  {row.original.industryGroupName}
               </Badge>
            ) : (
               <span className="text-muted-foreground opacity-40 text-xs">—</span>
            ),
      },
      {
         id: "serviceGroup",
         accessorFn: (row) => row.serviceGroup,
         header: ({ column }) => <SortableHeader column={column} label="Service Group" />,
         cell: ({ row }) => (
            <span className="text-sm">{row.original.serviceGroup}</span>
         ),
      },
      // {
      //    id: "nseSymbol",
      //    accessorFn: (row) => row.nseSymbol ?? "",
      //    header: ({ column }) => <SortableHeader column={column} label="NSE" />,
      //    cell: ({ row }) =>
      //       row.original.nseSymbol ? (
      //          <span className="font-mono text-xs">{row.original.nseSymbol}</span>
      //       ) : (
      //          <span className="text-muted-foreground opacity-40 text-xs">—</span>
      //       ),
      // },
      {
         id: "bseScripCode",
         accessorFn: (row) => row.bseScripCode ?? "",
         header: ({ column }) => <SortableHeader column={column} label="BSE Code" />,
         cell: ({ row }) =>
            row.original.bseScripCode ? (
               <span className="font-mono text-xs">{row.original.bseScripCode}</span>
            ) : (
               <span className="text-muted-foreground opacity-40 text-xs">—</span>
            ),
      },
      {
         id: "bseListingDate",
         accessorFn: (row) => row.bseListingDate ?? "",
         header: ({ column }) => <SortableHeader column={column} label="BSE Listed" />,
         cell: ({ row }) =>
            row.original.bseListingDate ? (
               <span className="text-xs text-muted-foreground">
                  {new Date(row.original.bseListingDate).toLocaleDateString("en-IN", {
                     day: "2-digit", month: "short", year: "numeric",
                  })}
               </span>
            ) : (
               <span className="text-muted-foreground opacity-40 text-xs">—</span>
            ),
      },
      {
         id: "nseListingDate",
         accessorFn: (row) => row.nseListingDate ?? "",
         header: ({ column }) => <SortableHeader column={column} label="NSE Listed" />,
         cell: ({ row }) =>
            row.original.nseListingDate ? (
               <span className="text-xs text-muted-foreground">
                  {new Date(row.original.nseListingDate).toLocaleDateString("en-IN", {
                     day: "2-digit", month: "short", year: "numeric",
                  })}
               </span>
            ) : (
               <span className="text-muted-foreground opacity-40 text-xs">—</span>
            ),
      },
      {
         id: "status",
         enableSorting: false,
         accessorFn: (row) => row.isActive,
         header: () => <span className="text-muted-foreground text-xs">Status</span>,
         cell: ({ row }) =>
            row.original.isActive ? (
               <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800">
                  Active
               </Badge>
            ) : (
               <Badge variant="outline" className="text-xs text-muted-foreground">
                  Inactive
               </Badge>
            ),
      },
      {
         id: "actions",
         enableSorting: false,
         header: () => null,
         cell: ({ row }) => (
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <EditCompanyDialog company={row.original} industryGroups={industryGroups} />
               <ToggleCompanyStatusButton
                  id={row.original.id}
                  name={row.original.companyName}
                  isActive={row.original.isActive}
               />
            </div>
         ),
      },
   ], [industryGroups])

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
      initialState: { pagination: { pageSize: 10 } },
   })

   React.useEffect(() => {
      const filters: { key: string; label: string }[] = []
      if (igFilter !== "all") {
         if (igFilter === "__none__") {
            filters.push({ key: "ig", label: "Industry Group: None" })
         } else {
            const name = industryGroups.find((g) => g.id === igFilter)?.name
            if (name) filters.push({ key: "ig", label: `Industry: ${name}` })
         }
      }
      if (statusFilter !== "all") {
         filters.push({ key: "status", label: `Status: ${statusFilter === "active" ? "Active" : "Inactive"}` })
      }
      setActiveFilters(filters)
      table.setPageIndex(0)
   }, [igFilter, statusFilter])

   function removeFilter(key: string) {
      if (key === "ig") setIgFilter("all")
      if (key === "status") setStatusFilter("all")
   }

   function exportCSV() {
      const rows = table.getSortedRowModel().rows
      const headers = [
         "Prowess ID", "Company Name", "ISIN Code", "Industry Group", "Service Group",
         "NSE Symbol", "BSE Scrip Code", "BSE Scrip ID", "BSE Group",
         "NSE Listing Date", "NSE Delisting Date", "BSE Listing Date", "BSE Delisting Date",
      ]
      const lines = rows.map(({ original: c }) =>
         [
            c.prowessId,
            c.companyName,
            c.isinCode,
            c.industryGroupName ?? "",
            c.serviceGroup,
            c.nseSymbol ?? "",
            c.bseScripCode ?? "",
            c.bseScripId ?? "",
            c.bseGroup ?? "",
            c.nseListingDate ?? "",
            c.nseDelistingDate ?? "",
            c.bseListingDate ?? "",
            c.bseDelistingDate ?? "",
         ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      const csv = [headers.join(","), ...lines].join("\n")
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`
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
            <div className="flex items-center gap-2 self-end sm:self-auto">
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32" size="sm">
                     <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectGroup>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                     </SelectGroup>
                  </SelectContent>
               </Select>
               <Select value={igFilter} onValueChange={setIgFilter}>
                  <SelectTrigger className="w-48" size="sm">
                     <SelectValue placeholder="Industry Group" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectGroup>
                        <SelectItem value="all">All Industry Groups</SelectItem>
                        <SelectItem value="__none__">No Industry Group</SelectItem>
                        {industryGroups.map((g) => (
                           <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                     </SelectGroup>
                  </SelectContent>
               </Select>
               <BulkUploadCompanyDialog industryGroups={industryGroups} />
               <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 hover:cursor-pointer">
                  <DownloadIcon className="size-3.5" />
               </Button>
            </div>
         </div>

         {/* Active filter chips */}
         {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
               {activeFilters.map((f) => (
                  <span
                     key={f.key}
                     className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                     {f.label}
                     <button
                        onClick={() => removeFilter(f.key)}
                        className="rounded-full hover:text-foreground"
                        aria-label={`Remove ${f.label} filter`}
                     >
                        <XIcon className="size-3" />
                     </button>
                  </span>
               ))}
            </div>
         )}

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
                           No companies match your search.
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
