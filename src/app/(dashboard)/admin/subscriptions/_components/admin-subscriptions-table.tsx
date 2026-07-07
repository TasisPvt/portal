"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { XCircleIcon, SearchIcon } from "lucide-react"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Spinner } from "@/src/components/ui/spinner"
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
  DialogTrigger,
} from "@/src/components/ui/dialog"
import {
  Table,
  DataTableCard,
  DataTableHead,
  DataTableBody,
  DataTablePagination,
  SortableHeader,
} from "@/src/components/ui/data-table-parts"
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { SubscriptionStatusBadge as StatusBadge } from "@/src/components/subscription-status-badge"
import { PlanTypeBadge as TypeBadge } from "@/src/components/plan-type-badge"
import { adminCancelSubscription } from "../_actions"

type SubscriptionRow = {
  id: string
  clientName: string | null
  clientEmail: string | null
  planName: string | null
  planType: string | null
  durationType: string
  status: string
  startDate: Date
  endDate: Date
  priceSnapshot: string
  stocksPerDaySnapshot: number | null
  createdAt: Date
}

type StatusFilter = "all" | "active" | "cancelled" | "expired"

function CancelDialog({ id, clientName, planName }: { id: string; clientName: string; planName: string }) {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const router = useRouter()

  function handleCancel() {
    startTransition(async () => {
      const result = await adminCancelSubscription(id)
      if (result.success) {
        toast.success("Subscription cancelled.")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <XCircleIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cancel{" "}
          <span className="font-medium text-foreground">{clientName}&apos;s</span> subscription to{" "}
          <span className="font-medium text-foreground">&quot;{planName}&quot;</span>? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Keep
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? "Cancelling…" : "Yes, Cancel"}
            {isPending && <Spinner className="ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminSubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")

  const preFiltered = React.useMemo(() => {
    return data.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        row.clientName?.toLowerCase().includes(q) ||
        row.clientEmail?.toLowerCase().includes(q) ||
        row.planName?.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [data, search, statusFilter])

  const columns: ColumnDef<SubscriptionRow>[] = React.useMemo(() => [
    {
      id: "client",
      accessorFn: (r) => r.clientName ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Client" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm leading-tight">{row.original.clientName ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{row.original.clientEmail ?? ""}</span>
        </div>
      ),
    },
    {
      id: "plan",
      accessorFn: (r) => r.planName ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Plan" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm leading-tight">{row.original.planName ?? "—"}</span>
          {row.original.planType && <TypeBadge type={row.original.planType} />}
        </div>
      ),
    },
    {
      id: "duration",
      accessorFn: (r) => DURATION_LABELS[r.durationType] ?? r.durationType,
      header: ({ column }) => <SortableHeader column={column} label="Duration" />,
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {DURATION_LABELS[row.original.durationType] ?? row.original.durationType}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "startDate",
      accessorFn: (r) => r.startDate,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Start" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.original.startDate)}</span>
      ),
    },
    {
      id: "endDate",
      accessorFn: (r) => r.endDate,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Expires" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.original.endDate)}</span>
      ),
    },
    {
      id: "price",
      accessorFn: (r) => parseFloat(r.priceSnapshot),
      header: ({ column }) => <SortableHeader column={column} label="Price" />,
      cell: ({ row }) => (
        <span className="font-medium text-sm tabular-nums">{fmtPrice(row.original.priceSnapshot)}</span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {row.original.status === "active" && (
            <CancelDialog
              id={row.original.id}
              clientName={row.original.clientName ?? "Client"}
              planName={row.original.planName ?? "plan"}
            />
          )}
        </div>
      ),
    },
  ], [])

  const table = useReactTable({
    data: preFiltered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
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
            placeholder="Search client or plan…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); table.setPageIndex(0) }}>
          <SelectTrigger className="w-36 rounded-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody
          table={table}
          colSpan={columns.length}
          emptyMessage="No subscriptions found."
          rowClassName={(row) => (row.original.status !== "active" ? "opacity-60" : undefined)}
        />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </DataTableCard>
  )
}
