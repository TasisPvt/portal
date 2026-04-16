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
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  XIcon,
  DownloadIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/src/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

export type UserRow = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  createdAt: Date
  isActive: boolean
  adminRole: "super_admin" | "admin" | "manager" | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
}

const ROLE_COLORS: Record<string, string> = {
  super_admin:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
  admin:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  manager:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-orange-500", "bg-rose-500", "bg-cyan-500",
]

function avatarColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50]

function SortableHeader<T>({ column, label }: { column: Column<T, unknown>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      className={cn(
        "flex items-center gap-1 select-none transition-colors hover:cursor-pointer hover:text-foreground",
        sorted ? "text-foreground" : "text-muted-foreground",
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

// ─── Table ─────────────────────────────────────────────────────────────────────

export function UsersTable({ data }: { data: UserRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [activeFilters, setActiveFilters] = React.useState<{ key: string; label: string }[]>([])

  const preFiltered = React.useMemo(() => {
    return data.filter((u) => {
      const matchesRole = roleFilter === "all" || u.adminRole === roleFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive)
      return matchesRole && matchesStatus
    })
  }, [data, roleFilter, statusFilter])

  const columns: ColumnDef<UserRow>[] = React.useMemo(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: ({ column }) => <SortableHeader column={column} label="User" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={cn("text-white text-xs font-semibold", avatarColor(row.original.id))}>
              {getInitials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "adminRole",
      accessorFn: (row) => row.adminRole ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Role" />,
      cell: ({ row }) => {
        const role = row.original.adminRole
        return role ? (
          <Badge variant="outline" className={cn("text-xs font-medium", ROLE_COLORS[role])}>
            {ROLE_LABELS[role]}
          </Badge>
        ) : (
          <span className="text-muted-foreground opacity-40">—</span>
        )
      },
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
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
          )}
        >
          {row.original.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      ),
    },
    {
      id: "isActive",
      accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium",
            row.original.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
          )}
        >
          {row.original.isActive ? "Active" : "Inactive"}
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
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
          <Link href={`/admin/users/${row.original.id}`}>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </Link>
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

  function exportCSV() {
    const rows = table.getSortedRowModel().rows
    const headers = ["Name", "Email", "Role", "Email Verified", "Status", "Joined"]
    const lines = rows.map(({ original: u }) =>
      [
        u.name,
        u.email,
        u.adminRole ? ROLE_LABELS[u.adminRole] : "",
        u.emailVerified ? "Yes" : "No",
        u.isActive ? "Active" : "Inactive",
        u.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
    )
    const csv = [headers.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function removeFilter(key: string) {
    if (key === "role") setRoleFilter("all")
    if (key === "status") setStatusFilter("all")
    setActiveFilters((prev) => prev.filter((f) => f.key !== key))
  }

  React.useEffect(() => {
    const filters: { key: string; label: string }[] = []
    if (roleFilter !== "all") filters.push({ key: "role", label: `Role: ${ROLE_LABELS[roleFilter]}` })
    if (statusFilter !== "all")
      filters.push({ key: "status", label: statusFilter === "active" ? "Status: Active" : "Status: Inactive" })
    setActiveFilters(filters)
    table.setPageIndex(0)
  }, [roleFilter, statusFilter])

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user..."
            className="pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36" size="sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
                  No users match your search.
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
