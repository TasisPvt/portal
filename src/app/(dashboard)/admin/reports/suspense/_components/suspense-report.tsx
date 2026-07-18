"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
   getCoreRowModel,
   getPaginationRowModel,
   useReactTable,
   type ColumnDef,
} from "@tanstack/react-table"
import {
   IndianRupeeIcon,
   UsersIcon,
   UserPlusIcon,
   DownloadIcon,
   SearchIcon,
   FileSpreadsheetIcon,
} from "lucide-react"

import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { MonthYearPicker } from "@/src/components/month-year-picker"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/src/components/ui/table"
import { DataTablePagination } from "@/src/components/ui/data-table-parts"
import { exportSuspenseXlsx, type SuspenseRow } from "../_actions"

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = [
   "January", "February", "March", "April", "May", "June",
   "July", "August", "September", "October", "November", "December",
]

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`

const PAGE_SIZE = 10

// Decode a base64 xlsx payload and trigger a browser download.
function downloadBase64Xlsx(base64: string, filename: string) {
   const bin = atob(base64)
   const bytes = new Uint8Array(bin.length)
   for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
   const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = filename
   a.click()
   URL.revokeObjectURL(url)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SuspenseReport({
   rows,
   year,
   month,
}: {
   rows: SuspenseRow[]
   year: number
   month: number
}) {
   const router = useRouter()
   const [isPending, startTransition] = React.useTransition()
   const [search, setSearch] = React.useState("")
   const [isExporting, setIsExporting] = React.useState(false)

   const pad = (n: number) => String(n).padStart(2, "0")
   const now = new Date()
   // "YYYY-MM" values for the shared month/year picker.
   const selectedMonth = `${year}-${pad(month)}`
   const maxMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

   function go(value: string) {
      const [y, m] = value.split("-").map(Number)
      // Ignore no-op changes (e.g. re-selecting the current month).
      if (y === year && m === month) return
      startTransition(() => {
         router.push(`/admin/reports/suspense?year=${y}&month=${m}`)
      })
   }

   const filtered = React.useMemo(() => {
      const q = search.trim().toLowerCase()
      if (!q) return rows
      return rows.filter(
         (r) =>
            r.clientName.toLowerCase().includes(q) ||
            r.pan.toLowerCase().includes(q) ||
            r.mobile.toLowerCase().includes(q),
      )
   }, [rows, search])

   const kpis = React.useMemo(() => {
      const total = rows.reduce((a, r) => a + r.amount, 0)
      // Rows are per (client, package), so dedupe to count distinct clients.
      const clientIds = new Set(rows.map((r) => r.clientId))
      const newClientIds = new Set(rows.filter((r) => r.remark === "New Client").map((r) => r.clientId))
      return { total, clients: clientIds.size, newClients: newClientIds.size }
   }, [rows])

   // TanStack table drives the shared pagination footer; data is already filtered.
   const columns = React.useMemo<ColumnDef<SuspenseRow>[]>(
      () => [{ accessorKey: "clientName" }, { accessorKey: "package" }, { accessorKey: "amount" }],
      [],
   )
   const table = useReactTable({
      data: filtered,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize: PAGE_SIZE } },
   })
   React.useEffect(() => {
      table.setPageIndex(0)
   }, [filtered, table])

   const pageRows = table.getRowModel().rows

   async function exportExcel() {
      setIsExporting(true)
      try {
         const base64 = await exportSuspenseXlsx(filtered, year, month)
         downloadBase64Xlsx(base64, `suspense-report-${year}-${pad(month)}.xlsx`)
      } catch (err) {
         toast.error("Export failed", {
            description: err instanceof Error ? err.message : "Please try again.",
         })
      } finally {
         setIsExporting(false)
      }
   }

   return (
      <div className="flex flex-col gap-4 md:gap-6">
         {/* ── Period selector ─────────────────────────────────────────────── */}
         <div className="flex flex-wrap items-center gap-2">
            <MonthYearPicker
               value={selectedMonth}
               onChange={go}
               maxMonth={maxMonth}
               disabled={isPending}
            />
         </div>

         {/* ── KPI cards ───────────────────────────────────────────────────── */}
         <div className="grid grid-cols-1 gap-4 @2xl/main:grid-cols-3">
            <KpiCard
               label="Total Collection"
               value={inr(kpis.total)}
               sub={`${MONTHS[month - 1]} ${year}`}
               icon={IndianRupeeIcon}
               iconClass="text-primary bg-primary/10"
            />
            <KpiCard
               label="Paying Clients"
               value={kpis.clients.toLocaleString("en-IN")}
               icon={UsersIcon}
               iconClass="text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950"
            />
            <KpiCard
               label="New Clients"
               value={kpis.newClients.toLocaleString("en-IN")}
               icon={UserPlusIcon}
               iconClass="text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950"
            />
         </div>

         {/* ── Table ───────────────────────────────────────────────────────── */}
         <Card>
            <CardHeader>
               <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                     <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <FileSpreadsheetIcon className="size-4" />
                     </span>
                     <div className="space-y-0.5">
                        <CardTitle className="text-base">
                           Suspense Report — {MONTHS[month - 1]} {year}
                        </CardTitle>
                        <CardDescription>
                           {filtered.length.toLocaleString("en-IN")} record
                           {filtered.length === 1 ? "" : "s"} · one per client &amp; package
                        </CardDescription>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                           placeholder="Search name, PAN or mobile"
                           className="h-8 w-60 pl-8"
                        />
                     </div>
                     <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={exportExcel}
                        disabled={filtered.length === 0 || isExporting}
                     >
                        {isExporting ? <Spinner className="size-3.5" /> : <DownloadIcon className="size-3.5" />}
                        Export Excel
                     </Button>
                  </div>
               </div>
            </CardHeader>
            <CardContent className={cn("flex flex-col gap-0 px-0", isPending && "opacity-60")}>
               <div className="overflow-x-auto border-t">
                  <Table>
                     <TableHeader className="bg-muted/60">
                        <TableRow className="hover:bg-transparent">
                           <TableHead className="pl-4 text-muted-foreground">Sr.no</TableHead>
                           <TableHead className="text-muted-foreground">Client Name</TableHead>
                           <TableHead className="text-muted-foreground">Package</TableHead>
                           <TableHead className="text-muted-foreground">PAN / TAN No.</TableHead>
                           <TableHead className="text-muted-foreground">Aadhar / CIN No.</TableHead>
                           <TableHead className="text-muted-foreground">Address</TableHead>
                           <TableHead className="text-muted-foreground">State</TableHead>
                           <TableHead className="text-muted-foreground">Mobile No.</TableHead>
                           <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                           <TableHead className="pr-4 text-muted-foreground">Remark</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {pageRows.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={10} className="h-24 text-center text-sm text-muted-foreground">
                                 No payments in {MONTHS[month - 1]} {year}.
                              </TableCell>
                           </TableRow>
                        ) : (
                           pageRows.map(({ original: r }, i) => (
                              <TableRow key={r.id}>
                                 <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">
                                    {table.getState().pagination.pageIndex * PAGE_SIZE + i + 1}
                                 </TableCell>
                                 <TableCell className="text-sm font-medium whitespace-nowrap">{r.clientName}</TableCell>
                                 <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.package}</TableCell>
                                 <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                    {r.pan || <span className="opacity-40">-</span>}
                                 </TableCell>
                                 <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                    {r.aadhar || <span className="opacity-40">-</span>}
                                 </TableCell>
                                 <TableCell className="max-w-64 text-xs text-muted-foreground">
                                    {r.address || <span className="opacity-40">-</span>}
                                 </TableCell>
                                 <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                    {r.state || <span className="opacity-40">-</span>}
                                 </TableCell>
                                 <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                                    {r.mobile || <span className="opacity-40">-</span>}
                                 </TableCell>
                                 <TableCell className="text-right text-sm font-medium tabular-nums whitespace-nowrap">
                                    {inr(r.amount)}
                                 </TableCell>
                                 <TableCell className="pr-4">
                                    <Badge
                                       variant="outline"
                                       className={cn(
                                          "text-xs whitespace-nowrap",
                                          r.remark === "New Client"
                                             ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                             : "border-border bg-muted text-muted-foreground",
                                       )}
                                    >
                                       {r.remark}
                                    </Badge>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </div>

               {filtered.length > 0 && <DataTablePagination table={table} />}
            </CardContent>
         </Card>
      </div>
   )
}

// ─── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({
   label,
   value,
   sub,
   icon: Icon,
   iconClass,
}: {
   label: string
   value: string
   sub?: string
   icon: React.ComponentType<{ className?: string }>
   iconClass: string
}) {
   return (
      <Card size="sm">
         <CardHeader>
            <div className="flex items-center justify-between">
               <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
               <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", iconClass)}>
                  <Icon className="size-4" />
               </span>
            </div>
         </CardHeader>
         <CardContent>
            <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
         </CardContent>
      </Card>
   )
}
