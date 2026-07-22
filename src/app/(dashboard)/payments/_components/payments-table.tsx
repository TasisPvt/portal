"use client"

import * as React from "react"
import { SearchIcon, DownloadIcon, ReceiptTextIcon } from "lucide-react"
import { toast } from "sonner"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
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
  DataTableCard,
  DataTableHead,
  DataTableBody,
  DataTablePagination,
  SortableHeader,
} from "@/src/components/ui/data-table-parts"
import { PlanTypeBadge as TypeBadge } from "@/src/components/plan-type-badge"
import { BrandedLoader } from "@/src/components/branded-loader"
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { cn } from "@/src/lib/utils"
import type { PaymentHistoryRow } from "../_actions"

type StatusFilter = "all" | "paid" | "created" | "failed" | "cancelled"

/** Payment status pill: paid → emerald, failed/cancelled → red, else → amber. */
function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-normal capitalize",
        status === "paid"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : status === "failed" || status === "cancelled"
            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
      )}
    >
      {status === "created" ? "pending" : status}
    </Badge>
  )
}

// Fetches a single invoice PDF and triggers a browser download.
async function downloadOneInvoice(paymentId: string): Promise<void> {
  const res = await fetch(`/api/payments/${paymentId}/invoice`)
  if (!res.ok) throw new Error(String(res.status))
  const blob = await res.blob()
  const cd = res.headers.get("Content-Disposition") ?? ""
  const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? "invoice.pdf"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PaymentsTable({ data }: { data: PaymentHistoryRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  // Guards against concurrent downloads - the overlay blocks the UI while true.
  const [downloading, setDownloading] = React.useState(false)
  // Synchronous re-entrancy guard: state updates are async, so a ref is what
  // actually prevents a second download from starting on a rapid double-click.
  const downloadingRef = React.useRef(false)

  const handleDownload = React.useCallback(async (paymentId: string) => {
    if (downloadingRef.current) return
    downloadingRef.current = true
    setDownloading(true)
    try {
      await downloadOneInvoice(paymentId)
    } catch {
      toast.error("Could not download the invoice. Please try again.")
    } finally {
      downloadingRef.current = false
      setDownloading(false)
    }
  }, [])

  const preFiltered = React.useMemo(() => {
    return data.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        row.planName?.toLowerCase().includes(q) ||
        row.razorpayPaymentId?.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [data, search, statusFilter])

  const columns: ColumnDef<PaymentHistoryRow>[] = React.useMemo(() => [
    {
      id: "plan",
      accessorFn: (r) => r.planName ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Plan" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-sm leading-tight">{row.original.planName ?? "-"}</span>
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
      id: "amount",
      accessorFn: (r) => parseFloat(r.priceSnapshot),
      header: ({ column }) => <SortableHeader column={column} label="Amount" />,
      cell: ({ row }) => (
        <span className="font-medium text-sm tabular-nums">{fmtPrice(row.original.priceSnapshot)}</span>
      ),
    },
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
    {
      id: "date",
      accessorFn: (r) => r.createdAt,
      sortingFn: "datetime",
      header: ({ column }) => <SortableHeader column={column} label="Date" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "reference",
      enableSorting: false,
      header: () => <span className="text-xs">Payment ID</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.razorpayPaymentId ?? "-"}</span>
      ),
    },
    {
      id: "invoice",
      enableSorting: false,
      header: () => <span className="sr-only">Invoice</span>,
      cell: ({ row }) =>
        row.original.status === "paid" ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => handleDownload(row.original.id)}
              disabled={downloading}
              title="Download invoice"
            >
              <DownloadIcon className="size-3.5" />
              <span className="sr-only">Download invoice</span>
            </Button>
          </div>
        ) : null,
    },
  ], [downloading, handleDownload])

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
    <>
      <DataTableCard>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
          <div className="relative w-full @2xl/main:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plan or payment ID…"
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="created">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
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
            emptyMessage="No payments yet."
          />
        </Table>

        {/* Pagination */}
        <DataTablePagination table={table} />
      </DataTableCard>

      {downloading && (
        <BrandedLoader
          overlay
          icon={ReceiptTextIcon}
          title="Preparing your invoice"
          messages={[
            "Generating your tax invoice…",
            "Adding your billing details…",
            "Almost ready…",
          ]}
        />
      )}
    </>
  )
}
