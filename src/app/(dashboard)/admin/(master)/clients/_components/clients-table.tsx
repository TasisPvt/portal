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
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
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
  XIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronsRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  SlidersHorizontalIcon,
  CheckIcon,
  ClockIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"

export type ClientRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: Date
  username: string | null
  phone: string | null
  phoneVerified: boolean | null
  state: string | null
  panNumber: string | null
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("")
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
]

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
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

export function ClientsTable({ data }: { data: ClientRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [stateFilter, setStateFilter] = React.useState("all")
  const [verifiedFilter, setVerifiedFilter] = React.useState("all")
  const [activeFilters, setActiveFilters] = React.useState<{ key: string; label: string }[]>([])

  const uniqueStates = React.useMemo(() => {
    const states = data.map((c) => c.state).filter(Boolean) as string[]
    return Array.from(new Set(states)).sort()
  }, [data])

  // Pre-filter data before passing to table (state + verified dropdowns)
  const preFiltered = React.useMemo(() => {
    return data.filter((client) => {
      const matchesState = stateFilter === "all" || client.state === stateFilter
      const matchesVerified =
        verifiedFilter === "all" ||
        (verifiedFilter === "verified" && client.emailVerified) ||
        (verifiedFilter === "unverified" && !client.emailVerified)
      return matchesState && matchesVerified
    })
  }, [data, stateFilter, verifiedFilter])

  const columns: ColumnDef<ClientRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Client Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={cn("text-white text-xs font-semibold", avatarColor(row.original.id))}>
              {getInitials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm leading-tight">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "username",
      accessorFn: (row) => row.username ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Username" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.username ?? <span className="opacity-40">—</span>}
        </span>
      ),
    },
    {
      id: "phone",
      accessorFn: (row) => row.phone ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Phone" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
          {row.original.phone ?? <span className="text-muted-foreground opacity-40">—</span>}
          {row.original.phone && (
            <span
              title={row.original.phoneVerified ? "Verified" : "Pending"}
              className={cn(
                "size-4 rounded-full flex items-center justify-center",
                row.original.phoneVerified
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
              )}
            >
              {row.original.phoneVerified
                ? <CheckIcon className="size-2.5" />
                : <ClockIcon className="size-2.5" />}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "state",
      accessorFn: (row) => row.state ?? "",
      header: ({ column }) => <SortableHeader column={column} label="State" />,
      cell: ({ row }) =>
        row.original.state ? (
          <span className="font-normal text-xs">{row.original.state}</span>
        ) : (
          <span className="text-muted-foreground opacity-40">—</span>
        ),
    },
    {
      id: "panNumber",
      accessorFn: (row) => row.panNumber ?? "",
      enableSorting: false,
      header: () => <span className="text-muted-foreground">PAN</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.panNumber ?? <span className="opacity-40">—</span>}
        </span>
      ),
    },
    {
      id: "emailVerified",
      accessorFn: (row) => (row.emailVerified ? "Verified" : "Unverified"),
      header: ({ column }) => <SortableHeader column={column} label="Email" />,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium",
            row.original.emailVerified
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
          )}
        >
          {row.original.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      accessorFn: (row) => row.createdAt,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Joined" />,
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
      cell: () => (
        <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </Button>
      ),
    },
  ], [])

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

  function applyFilters() {
    const filters: { key: string; label: string }[] = []
    if (stateFilter !== "all") filters.push({ key: "state", label: `State: ${stateFilter}` })
    if (verifiedFilter !== "all")
      filters.push({
        key: "verified",
        label: verifiedFilter === "verified" ? "Email: Verified" : "Email: Unverified",
      })
    setActiveFilters(filters)
    table.setPageIndex(0)
  }

  function removeFilter(key: string) {
    if (key === "state") setStateFilter("all")
    if (key === "verified") setVerifiedFilter("all")
    setActiveFilters((prev) => prev.filter((f) => f.key !== key))
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
            placeholder="Search client or username..."
            className="pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger className="w-40" size="sm">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Email Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
                  No clients match your search.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group cursor-pointer transition-colors hover:bg-muted/40">
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
