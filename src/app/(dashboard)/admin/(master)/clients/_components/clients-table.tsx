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
  DotBadge,
} from "@/src/components/ui/data-table-parts"
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
import Link from "next/link"
import { SearchIcon, XIcon, CheckIcon, ClockIcon, DownloadIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"

export type ClientRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: Date
  phone: string | null
  phoneVerified: boolean | null
  state: string | null
  panNumber: string | null
  isActive: boolean
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

export function ClientsTable({ data }: { data: ClientRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [stateFilter, setStateFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [activeFilters, setActiveFilters] = React.useState<{ key: string; label: string }[]>([])

  // Only clients who have verified their email have completed registration.
  // Unverified sign-ups are hidden from the table entirely.
  const verifiedClients = React.useMemo(
    () => data.filter((c) => c.emailVerified),
    [data],
  )

  const uniqueStates = React.useMemo(() => {
    const states = verifiedClients.map((c) => c.state).filter(Boolean) as string[]
    return Array.from(new Set(states)).sort()
  }, [verifiedClients])

  // Pre-filter data before passing to table (state + status dropdowns)
  const preFiltered = React.useMemo(() => {
    return verifiedClients.filter((client) => {
      const matchesState = stateFilter === "all" || client.state === stateFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && client.isActive) ||
        (statusFilter === "inactive" && !client.isActive)
      return matchesState && matchesStatus
    })
  }, [verifiedClients, stateFilter, statusFilter])

  const columns: ColumnDef<ClientRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="Client Name" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className={cn("text-white text-xs font-semibold", avatarColor(row.original.id))}>
              {getInitials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link
              href={`/admin/clients/${row.original.id}`}
              className="font-semibold text-sm leading-tight hover:text-primary hover:underline"
            >
              {row.original.name}
            </Link>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      accessorFn: (row) => row.phone ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Phone" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
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
      header: () => <span>PAN</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.panNumber ?? <span className="opacity-40">—</span>}
        </span>
      ),
    },
    {
      id: "isActive",
      accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <DotBadge
          className={cn(
            row.original.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </DotBadge>
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

  function exportCSV() {
    const rows = table.getSortedRowModel().rows
    const headers = ["Name", "Email", "Phone", "Phone Verified", "State", "PAN", "Status", "Joined"]
    const lines = rows.map(({ original: c }) =>
      [
        c.name,
        c.email,
        c.phone ?? "",
        c.phoneVerified ? "Yes" : "No",
        c.state ?? "",
        c.panNumber ?? "",
        c.isActive ? "Active" : "Inactive",
        c.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function removeFilter(key: string) {
    if (key === "state") setStateFilter("all")
    if (key === "status") setStatusFilter("all")
    setActiveFilters((prev) => prev.filter((f) => f.key !== key))
  }

  // Sync active filter chips whenever dropdowns change
  React.useEffect(() => {
    const filters: { key: string; label: string }[] = []
    if (stateFilter !== "all") filters.push({ key: "state", label: `State: ${stateFilter}` })
    if (statusFilter !== "all")
      filters.push({
        key: "status",
        label: statusFilter === "active" ? "Status: Active" : "Status: Inactive",
      })
    setActiveFilters(filters)
    table.setPageIndex(0)
  }, [stateFilter, statusFilter])

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="relative w-full @2xl/main:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search client..."
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-36 rounded-full" size="sm">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 rounded-full" size="sm">
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
          <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-full hover:cursor-pointer" aria-label="Export CSV">
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
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
      <Table>
        <DataTableHead table={table} />
        <DataTableBody table={table} colSpan={columns.length} emptyMessage="No clients match your search." />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </DataTableCard>
  )
}
