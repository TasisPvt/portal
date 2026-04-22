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
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/src/lib/utils"
import { EditIndexDialog, DeleteIndexButton } from "./index-dialogs"

export type IndexRow = {
   id: string
   name: string
   description: string | null
   companyCount: number
   createdAt: Date
   updatedAt: Date
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

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

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
                  className="font-medium text-sm leading-tight hover:underline hover:text-primary"
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
            <Badge variant="outline" className="font-mono text-xs font-normal">
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
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

   const { pageIndex, pageSize } = table.getState().pagination
   const pageCount = table.getPageCount()

   return (
      <div className="flex w-full min-w-0 flex-col gap-4">
         {/* Toolbar */}
         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
               <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  placeholder="Search indexes…"
                  className="pl-9"
                  value={globalFilter}
                  onChange={(e) => {
                     setGlobalFilter(e.target.value)
                     table.setPageIndex(0)
                  }}
               />
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
                           No indexes found.
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
