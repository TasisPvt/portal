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
import { useRouter } from "next/navigation"
import { CheckIcon, XIcon, MinusIcon, SearchIcon, DownloadIcon } from "lucide-react"

import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { formatDateStr as fmtDateStr } from "@/src/lib/format"
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
import { cn } from "@/src/lib/utils"
import { formatMonthLabel } from "../_utils"

// ---------------------------------------------------------------------------
// Shariah status config
// ---------------------------------------------------------------------------

export const SHARIAH_STATUS_LABELS: Record<number, string> = {
  1: "Shariah Compliant",
  2: "Primary Bus. Non-compliant",
  3: "Secondary Bus. Non-compliant",
  4: "Financial Non-comp",
  5: "Fail on Investment",
  6: "Incomplete/Old Data",
  7: "Incomplete Bus. Info",
  8: "Status on Hold",
  9: "Not in Universe",
}

function ShariahBadge({ status }: { status: number | null | undefined }) {
  if (!status) return <span className="text-muted-foreground opacity-40 text-xs">-</span>
  const label = SHARIAH_STATUS_LABELS[status] ?? String(status)
  const className =
    status === 1
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
      : status === 9
      ? "text-muted-foreground"
      : status >= 6
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
      : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
  return (
    <Badge variant="outline" className={cn("rounded-full text-xs font-normal whitespace-nowrap", className)}>
      {status}. {label}
    </Badge>
  )
}

function BoolCell({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined)
    return <MinusIcon className="size-3.5 text-muted-foreground opacity-30" />
  return value
    ? <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
    : <XIcon className="size-3.5 text-red-500" />
}

function NumCell({ value, decimals = 2 }: { value: string | null | undefined; decimals?: number }) {
  if (!value) return <span className="text-muted-foreground opacity-40 text-xs">-</span>
  return (
    <span className="text-xs tabular-nums">
      {parseFloat(value).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  )
}

function boolToCSV(v: boolean | null | undefined): string {
  if (v === null || v === undefined) return "NA"
  return v ? "true" : "false"
}

function exportRowsToCSV(rows: ShariahRow[], month: string) {
  const headers = [
    "prowess_id", "company_name", "company_status", "shariah_status",
    "assessment_year", "market_cap", "last_financial_data", "primary_business", "secondary_business",
    "compliant_on_investment", "incomplete_bus_info",
    "total_debt_total_asset_value", "total_debt_total_asset_status",
    "total_interest_income_total_income_value", "total_interest_income_total_income_status",
    "cash_bank_receivables_total_asset_value", "cash_bank_receivables_total_asset_status",
    "remark", "last_updated_at",
  ]

  const escape = (v: string | number | null | undefined) => {
    if (v === null || v === undefined || v === "") return ""
    const s = String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
  }

  const csvRows = rows.map((r) => [
    escape(r.prowessId),
    escape(r.companyName),
    escape(r.companyStatus),
    escape(r.shariahStatus),
    escape(r.assessmentYear),
    escape(r.marketCap),
    boolToCSV(r.lastFinancialData),
    boolToCSV(r.primaryBusiness),
    boolToCSV(r.secondaryBusiness),
    boolToCSV(r.compliantOnInvestment),
    boolToCSV(r.incompleteBusInfo),
    escape(r.totalDebtTotalAssetValue),
    boolToCSV(r.totalDebtTotalAssetStatus),
    escape(r.totalInterestIncomeTotalIncomeValue),
    boolToCSV(r.totalInterestIncomeTotalIncomeStatus),
    escape(r.cashBankReceivablesTotalAssetValue),
    boolToCSV(r.cashBankReceivablesTotalAssetStatus),
    escape(r.remark),
    escape(r.lastUpdatedAt ? r.lastUpdatedAt.toISOString().slice(0, 10) : null),
  ].join(","))

  const csv = [headers.join(","), ...csvRows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `shariah-status-${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Row type (matches what getShariahDataForMonth returns)
// ---------------------------------------------------------------------------

export type ShariahRow = {
  companyId: string
  prowessId: string
  companyName: string
  shariahId: string | null
  assessmentYear: string | null
  marketCap: string | null
  companyStatus: string | null
  shariahStatus: number | null
  lastFinancialData: boolean | null
  primaryBusiness: boolean | null
  secondaryBusiness: boolean | null
  compliantOnInvestment: boolean | null
  incompleteBusInfo: boolean | null
  totalDebtTotalAssetValue: string | null
  totalDebtTotalAssetStatus: boolean | null
  totalInterestIncomeTotalIncomeValue: string | null
  totalInterestIncomeTotalIncomeStatus: boolean | null
  cashBankReceivablesTotalAssetValue: string | null
  cashBankReceivablesTotalAssetStatus: boolean | null
  remark: string | null
  lastUpdatedAt: Date | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShariahTable({
  data,
  selectedMonth,
  monthOptions,
  currentMonth,
}: {
  data: ShariahRow[]
  selectedMonth: string
  monthOptions: string[]
  currentMonth: string
}) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [dataFilter, setDataFilter] = React.useState<"all" | "with_data" | "no_data">("all")

  const preFiltered = React.useMemo(() => {
    if (dataFilter === "with_data") return data.filter((r) => r.shariahId !== null)
    if (dataFilter === "no_data") return data.filter((r) => r.shariahId === null)
    return data
  }, [data, dataFilter])

  const columns: ColumnDef<ShariahRow>[] = React.useMemo(() => [
    {
      id: "prowessId",
      accessorFn: (r) => r.prowessId,
      header: ({ column }) => <SortableHeader column={column} label="Prowess ID" />,
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.prowessId}</span>,
    },
    {
      id: "companyName",
      accessorFn: (r) => r.companyName,
      header: ({ column }) => <SortableHeader column={column} label="Company" />,
      cell: ({ row }) => (
        <span className="text-sm font-semibold whitespace-nowrap">{row.original.companyName}</span>
      ),
    },
    {
      id: "shariahStatus",
      accessorFn: (r) => r.shariahStatus ?? -1,
      header: ({ column }) => <SortableHeader column={column} label="Shariah Status" />,
      cell: ({ row }) => <ShariahBadge status={row.original.shariahStatus} />,
    },
    {
      id: "assessmentYear",
      accessorFn: (r) => r.assessmentYear ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Assmt. Year" />,
      cell: ({ row }) => row.original.assessmentYear
        ? <span className="text-xs text-muted-foreground whitespace-nowrap">
            {fmtDateStr(row.original.assessmentYear)}
          </span>
        : <span className="text-muted-foreground opacity-40 text-xs">-</span>,
    },
    {
      id: "marketCap",
      accessorFn: (r) => r.marketCap ? parseFloat(r.marketCap) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Market Cap" />,
      cell: ({ row }) => <NumCell value={row.original.marketCap} decimals={2} />,
    },
    {
      id: "companyStatus",
      accessorFn: (r) => r.companyStatus ?? "",
      header: ({ column }) => <SortableHeader column={column} label="Status" />,
      cell: ({ row }) => row.original.companyStatus
        ? <Badge variant="outline" className="rounded-full text-xs font-normal">{row.original.companyStatus}</Badge>
        : <span className="text-muted-foreground opacity-40 text-xs">-</span>,
    },
    {
      id: "lastFinancialData",
      enableSorting: false,
      header: () => <span>Last Fin. Data</span>,
      cell: ({ row }) => <BoolCell value={row.original.lastFinancialData} />,
    },
    {
      id: "primaryBusiness",
      enableSorting: false,
      header: () => <span>Primary Bus.</span>,
      cell: ({ row }) => <BoolCell value={row.original.primaryBusiness} />,
    },
    {
      id: "secondaryBusiness",
      enableSorting: false,
      header: () => <span>Secondary Bus.</span>,
      cell: ({ row }) => <BoolCell value={row.original.secondaryBusiness} />,
    },
    {
      id: "compliantOnInvestment",
      enableSorting: false,
      header: () => <span>Inv. Compliant</span>,
      cell: ({ row }) => <BoolCell value={row.original.compliantOnInvestment} />,
    },
    {
      id: "incompleteBusInfo",
      enableSorting: false,
      header: () => <span>Inc. Bus. Info</span>,
      cell: ({ row }) => <BoolCell value={row.original.incompleteBusInfo} />,
    },
    {
      id: "totalDebt",
      accessorFn: (r) => r.totalDebtTotalAssetValue ? parseFloat(r.totalDebtTotalAssetValue) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Debt/Asset %" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <NumCell value={row.original.totalDebtTotalAssetValue} decimals={2} />
          <BoolCell value={row.original.totalDebtTotalAssetStatus} />
        </div>
      ),
    },
    {
      id: "totalInterest",
      accessorFn: (r) => r.totalInterestIncomeTotalIncomeValue ? parseFloat(r.totalInterestIncomeTotalIncomeValue) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Interest/Income %" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <NumCell value={row.original.totalInterestIncomeTotalIncomeValue} decimals={2} />
          <BoolCell value={row.original.totalInterestIncomeTotalIncomeStatus} />
        </div>
      ),
    },
    {
      id: "cashBank",
      accessorFn: (r) => r.cashBankReceivablesTotalAssetValue ? parseFloat(r.cashBankReceivablesTotalAssetValue) : -1,
      header: ({ column }) => <SortableHeader column={column} label="Cash+Rec/Asset %" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <NumCell value={row.original.cashBankReceivablesTotalAssetValue} decimals={2} />
          <BoolCell value={row.original.cashBankReceivablesTotalAssetStatus} />
        </div>
      ),
    },
    {
      id: "remark",
      enableSorting: false,
      header: () => <span>Remark</span>,
      cell: ({ row }) => row.original.remark
        ? <span className="text-xs text-muted-foreground max-w-40 truncate block">{row.original.remark}</span>
        : <span className="text-muted-foreground opacity-40 text-xs">-</span>,
    },
    {
      id: "lastUpdatedAt",
      accessorFn: (r) => r.lastUpdatedAt?.getTime() ?? -1,
      header: ({ column }) => <SortableHeader column={column} label="Last Updated" />,
      cell: ({ row }) => row.original.lastUpdatedAt
        ? <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.lastUpdatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
        : <span className="text-muted-foreground opacity-40 text-xs">-</span>,
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
    initialState: { pagination: { pageSize: 20 } },
  })

  function handleMonthChange(month: string) {
    const params = new URLSearchParams()
    params.set("month", month)
    router.push(`/admin/company-shariah-status?${params.toString()}`)
  }

  return (
    <DataTableCard>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
        <div className="relative w-full @2xl/main:max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search company or Prowess ID…"
            className="rounded-full border-transparent bg-muted/50 pl-9"
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value)
              table.setPageIndex(0)
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dataFilter} onValueChange={(v) => { setDataFilter(v as typeof dataFilter); table.setPageIndex(0) }}>
            <SelectTrigger className="w-36 rounded-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Companies</SelectItem>
                <SelectItem value="with_data">With Data</SelectItem>
                <SelectItem value="no_data">No Data</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-40 rounded-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthLabel(m)}
                    {m === currentMonth && " (current)"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-label="Export CSV"
            onClick={() => exportRowsToCSV(
              table.getFilteredRowModel().rows.map((r) => r.original),
              selectedMonth,
            )}
          >
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <DataTableHead table={table} />
        <DataTableBody
          table={table}
          colSpan={columns.length}
          emptyMessage="No results."
          rowClassName={(row) => (!row.original.shariahId ? "opacity-50" : undefined)}
        />
      </Table>

      {/* Pagination */}
      <DataTablePagination table={table} pageSizeOptions={[10, 20, 50, 100]} />
    </DataTableCard>
  )
}
