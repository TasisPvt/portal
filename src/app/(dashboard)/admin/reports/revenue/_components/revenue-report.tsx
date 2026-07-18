"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { DateRange } from "react-day-picker"
import {
   getCoreRowModel,
   getPaginationRowModel,
   useReactTable,
   type ColumnDef,
} from "@tanstack/react-table"
import {
   IndianRupeeIcon,
   ReceiptIcon,
   UsersIcon,
   TrendingUpIcon,
   DownloadIcon,
   SearchIcon,
   BarChart3Icon,
   CalendarIcon,
   ChevronRightIcon,
   LayersIcon,
} from "lucide-react"

import { MONTHS_SHORT } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { cn } from "@/src/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { Calendar } from "@/src/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import {
   Select,
   SelectContent,
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
import { DataTablePagination } from "@/src/components/ui/data-table-parts"
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
} from "@/src/components/ui/chart"
import type { RevenuePayment } from "../_actions"

// ─── Helpers ────────────────────────────────────────────────────────────────

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

function formatRange(r?: DateRange) {
   if (!r?.from) return "Pick a range"
   if (!r.to) return fmtShort(r.from)
   return `${fmtShort(r.from)} – ${fmtShort(r.to)}`
}

const chartConfig = {
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

type DateFilter = "current" | "last" | "custom"
type ServiceFilter = "all" | "list" | "snapshot"
type TypeFilter = "all" | "one_time" | "monthly" | "quarterly" | "annual"

type ClientGroup = {
   clientId: string
   clientName: string
   payments: RevenuePayment[]
   total: number
   txns: number
}

const PAGE_SIZE = 10

// CSV-escape a field (quote if it contains a comma, quote, or newline).
function csv(s: string) {
   return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function download(content: string, filename: string) {
   const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = filename
   a.click()
   URL.revokeObjectURL(url)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RevenueReport({
   payments,
   initialGroupByClient = false,
}: {
   payments: RevenuePayment[]
   initialGroupByClient?: boolean
}) {
   const [dateFilter, setDateFilter] = React.useState<DateFilter>("current")
   const [service, setService] = React.useState<ServiceFilter>("all")
   const [type, setType] = React.useState<TypeFilter>("all")
   const [stateFilter, setStateFilter] = React.useState("all")
   const [search, setSearch] = React.useState("")
   const [groupByClient, setGroupByClient] = React.useState(initialGroupByClient)
   const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

   const toggleExpand = (id: string) =>
      setExpanded((prev) => {
         const next = new Set(prev)
         if (next.has(id)) next.delete(id)
         else next.add(id)
         return next
      })

   // Distinct non-empty places of supply, for the state dropdown.
   const uniqueStates = React.useMemo(
      () => Array.from(new Set(payments.map((p) => p.state).filter(Boolean))).sort(),
      [payments],
   )

   const now = new Date()
   const initialRange = (): DateRange => ({
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now,
   })
   // `customRange` is the in-calendar draft; `appliedRange` is what actually
   // drives the chart/table - committed only when the user clicks Apply.
   const [customRange, setCustomRange] = React.useState<DateRange | undefined>(initialRange)
   const [appliedRange, setAppliedRange] = React.useState<DateRange | undefined>(initialRange)
   const [calendarOpen, setCalendarOpen] = React.useState(false)

   // Active [start, end] window.
   const range = React.useMemo(() => {
      const n = new Date()
      if (dateFilter === "current") {
         return { start: new Date(n.getFullYear(), n.getMonth(), 1), end: endOfDay(n) }
      }
      if (dateFilter === "last") {
         return {
            start: new Date(n.getFullYear(), n.getMonth() - 1, 1),
            end: endOfDay(new Date(n.getFullYear(), n.getMonth(), 0)),
         }
      }
      const from = appliedRange?.from ?? new Date()
      const to = appliedRange?.to ?? from
      return { start: startOfDay(from), end: endOfDay(to) }
   }, [dateFilter, appliedRange])

   // Date + service + type filters (search is applied to the table only).
   const filtered = React.useMemo(() => {
      const s = range.start.getTime()
      const e = range.end.getTime()
      return payments.filter((p) => {
         const t = new Date(p.date).getTime()
         if (Number.isNaN(t) || t < s || t > e) return false
         if (service !== "all" && p.service !== service) return false
         if (type !== "all" && p.durationType !== type) return false
         if (stateFilter !== "all" && p.state !== stateFilter) return false
         return true
      })
   }, [payments, range, service, type, stateFilter])

   // List plans only offer one-time & annual durations - if the user narrows to
   // the List service while a List-invalid type is selected, reset it to "all".
   React.useEffect(() => {
      if (service === "list" && (type === "monthly" || type === "quarterly")) {
         setType("all")
      }
   }, [service, type])

   // KPIs
   const kpis = React.useMemo(() => {
      const gross = filtered.reduce((a, p) => a + p.gross, 0)
      const gst = filtered.reduce((a, p) => a + p.gst, 0)
      const clients = new Set(filtered.map((p) => p.clientId)).size
      const txns = filtered.length
      return { gross, gst, clients, txns, aov: txns ? gross / txns : 0 }
   }, [filtered])

   // Chart buckets - daily for ≤ 62-day windows, monthly otherwise.
   const chart = React.useMemo(() => {
      const daily = Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) <= 62
      const buckets = new Map<string, { label: string; list: number; snapshot: number }>()
      if (daily) {
         for (let d = startOfDay(range.start); d <= range.end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
            buckets.set(ymd(d), { label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, list: 0, snapshot: 0 })
         }
      } else {
         for (let d = new Date(range.start.getFullYear(), range.start.getMonth(), 1); d <= range.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
            buckets.set(ym(d), { label: `${MONTHS_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`, list: 0, snapshot: 0 })
         }
      }
      for (const p of filtered) {
         const d = new Date(p.date)
         const bucket = buckets.get(daily ? ymd(d) : ym(d))
         if (bucket) bucket[p.service] += p.gross
      }
      return Array.from(buckets.values())
   }, [filtered, range])

   const hasChartData = chart.some((c) => c.list + c.snapshot > 0)

   // Table rows (client/plan search + pagination).
   const tableRows = React.useMemo(() => {
      const q = search.trim().toLowerCase()
      if (!q) return filtered
      return filtered.filter(
         (p) => p.clientName.toLowerCase().includes(q) || p.planName.toLowerCase().includes(q),
      )
   }, [filtered, search])

   // TanStack table drives the shared DataTablePagination footer. Data is already
   // filtered/searched; the table only handles pagination + rows-per-page.
   const columns = React.useMemo<ColumnDef<RevenuePayment>[]>(
      () => [
         { accessorKey: "date" },
         { accessorKey: "clientName" },
         { accessorKey: "planName" },
         { accessorKey: "service" },
         { accessorKey: "durationType" },
         { accessorKey: "gross" },
      ],
      [],
   )

   const table = useReactTable({
      data: tableRows,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize: PAGE_SIZE } },
   })

   // Jump back to the first page whenever the filtered/searched set changes.
   React.useEffect(() => {
      table.setPageIndex(0)
   }, [tableRows, table])

   const pageRows = table.getRowModel().rows

   // Group-by-client view: one collapsible row per client (total revenue),
   // expanding to that client's payments (newest first). A separate table drives
   // pagination over client groups so the shared footer stays consistent.
   const groups = React.useMemo<ClientGroup[]>(() => {
      const map = new Map<string, ClientGroup>()
      for (const p of tableRows) {
         const g =
            map.get(p.clientId) ??
            { clientId: p.clientId, clientName: p.clientName, payments: [], total: 0, txns: 0 }
         g.payments.push(p)
         g.total += p.gross
         g.txns += 1
         map.set(p.clientId, g)
      }
      const arr = [...map.values()]
      for (const g of arr) {
         g.payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
      arr.sort((a, b) => b.total - a.total)
      return arr
   }, [tableRows])

   const groupColumns = React.useMemo<ColumnDef<ClientGroup>[]>(
      () => [{ accessorKey: "clientName" }, { accessorKey: "txns" }, { accessorKey: "total" }],
      [],
   )
   const groupTable = useReactTable({
      data: groups,
      columns: groupColumns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize: PAGE_SIZE } },
   })
   React.useEffect(() => {
      groupTable.setPageIndex(0)
   }, [groups, groupTable])

   function exportCsv() {
      const headers = ["Date", "Client", "Plan", "State", "Service", "Type", "Gross (INR)", "GST (INR)"]
      const lines = tableRows.map((p) =>
         [
            new Date(p.date).toLocaleString("en-IN"),
            csv(p.clientName),
            csv(p.planName),
            csv(p.state || "-"),
            p.service === "list" ? "List" : "Snapshot",
            DURATION_LABELS[p.durationType] ?? p.durationType,
            p.gross.toFixed(2),
            p.gst.toFixed(2),
         ].join(","),
      )
      download([headers.join(","), ...lines].join("\n"), `revenue-${ymd(range.start)}_to_${ymd(range.end)}.csv`)
   }

   const rangeLabel =
      dateFilter === "current" ? "This month" : dateFilter === "last" ? "Last month" : "Custom range"

   return (
      <div className="flex flex-col gap-4 md:gap-6">
         {/* ── Filters ─────────────────────────────────────────────────────── */}
         <div className="flex flex-wrap items-center gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
               <SelectTrigger size="sm" className="w-40">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="current">Current month</SelectItem>
                  <SelectItem value="last">Last month</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
               </SelectContent>
            </Select>

            {dateFilter === "custom" && (
               <Popover
                  open={calendarOpen}
                  onOpenChange={(open) => {
                     // Re-seed the draft from the applied range each time we open,
                     // so an un-applied edit doesn't linger on the next open.
                     if (open) setCustomRange(appliedRange)
                     setCalendarOpen(open)
                  }}
               >
                  <PopoverTrigger asChild>
                     <Button variant="outline" size="sm" className="gap-2 font-normal">
                        <CalendarIcon className="size-3.5" />
                        {formatRange(appliedRange)}
                     </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                     <Calendar
                        mode="range"
                        numberOfMonths={2}
                        defaultMonth={customRange?.from}
                        selected={customRange}
                        onSelect={setCustomRange}
                        disabled={{ after: new Date() }}
                        autoFocus
                     />
                     <div className="flex items-center gap-2 border-t p-3">
                        <span className="mr-auto text-xs text-muted-foreground">
                           {formatRange(customRange)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setCalendarOpen(false)}>
                           Cancel
                        </Button>
                        <Button
                           size="sm"
                           disabled={!customRange?.from}
                           onClick={() => {
                              setAppliedRange(customRange)
                              setCalendarOpen(false)
                           }}
                        >
                           Apply
                        </Button>
                     </div>
                  </PopoverContent>
               </Popover>
            )}

            <Select value={service} onValueChange={(v) => setService(v as ServiceFilter)}>
               <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="Service" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">All services</SelectItem>
                  <SelectItem value="snapshot">Snapshot</SelectItem>
                  <SelectItem value="list">List</SelectItem>
               </SelectContent>
            </Select>

            <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
               <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="Type" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  {service !== "list" && <SelectItem value="monthly">Monthly</SelectItem>}
                  {service !== "list" && <SelectItem value="quarterly">Quarterly</SelectItem>}
                  <SelectItem value="annual">Annual</SelectItem>
               </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
               <SelectTrigger size="sm" className="w-40">
                  <SelectValue placeholder="State" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">All states</SelectItem>
                  {uniqueStates.map((s) => (
                     <SelectItem key={s} value={s}>
                        {s}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {/* ── KPI cards ───────────────────────────────────────────────────── */}
         <div className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-4">
            <KpiCard
               label="Total Revenue"
               value={inr(kpis.gross)}
               sub={`incl. ${inr(kpis.gst)} GST`}
               icon={IndianRupeeIcon}
               iconClass="text-primary bg-primary/10"
            />
            <KpiCard
               label="Transactions"
               value={kpis.txns.toLocaleString("en-IN")}
               icon={ReceiptIcon}
               iconClass="text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950"
            />
            <KpiCard
               label="Paying Clients"
               value={kpis.clients.toLocaleString("en-IN")}
               icon={UsersIcon}
               iconClass="text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950"
            />
            <KpiCard
               label="Avg Order Value"
               value={inr(kpis.aov)}
               icon={TrendingUpIcon}
               iconClass="text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950"
            />
         </div>

         {/* ── Chart ───────────────────────────────────────────────────────── */}
         <Card>
            <CardHeader>
               <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                     <BarChart3Icon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                     <CardTitle className="text-base">Revenue over time</CardTitle>
                     <CardDescription>{rangeLabel} · gross collected (incl. GST)</CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
               {!hasChartData ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                     <BarChart3Icon className="size-8 text-muted-foreground/30" />
                     <p className="text-sm text-muted-foreground">No revenue in this period</p>
                  </div>
               ) : (
                  <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                     <BarChart data={chart} margin={{ top: 8, left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
                        <YAxis
                           tickLine={false}
                           axisLine={false}
                           width={52}
                           tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
                        />
                        <ChartTooltip
                           content={
                              <ChartTooltipContent
                                 formatter={(v, name) => (
                                    <div className="flex w-full items-center justify-between gap-3">
                                       <span className="text-muted-foreground capitalize">{name}</span>
                                       <span className="font-medium tabular-nums">{inr(v as number)}</span>
                                    </div>
                                 )}
                              />
                           }
                        />
                        <Bar dataKey="list" stackId="rev" fill="var(--color-list)" radius={[0, 0, 4, 4]} maxBarSize={40} />
                        <Bar dataKey="snapshot" stackId="rev" fill="var(--color-snapshot)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                     </BarChart>
                  </ChartContainer>
               )}
            </CardContent>
         </Card>

         {/* ── Payments table ──────────────────────────────────────────────── */}
         <Card>
            <CardHeader>
               <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                     <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <ReceiptIcon className="size-4" />
                     </span>
                     <div className="space-y-0.5">
                        <CardTitle className="text-base">Payments</CardTitle>
                        <CardDescription>
                           {groupByClient
                              ? `${groups.length.toLocaleString("en-IN")} client${groups.length === 1 ? "" : "s"}`
                              : `${tableRows.length.toLocaleString("en-IN")} in this view`}
                        </CardDescription>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                           placeholder="Search client or plan"
                           className="h-8 w-52 pl-8"
                        />
                     </div>
                     <Button
                        variant={groupByClient ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setGroupByClient((v) => !v)}
                        aria-pressed={groupByClient}
                     >
                        <LayersIcon className="size-3.5" />
                        Group by client
                     </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={exportCsv}
                        disabled={tableRows.length === 0}
                     >
                        <DownloadIcon className="size-3.5" />
                        Export CSV
                     </Button>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-0 px-0">
               <div className="overflow-x-auto border-t">
                  <Table>
                     <TableHeader className="bg-muted/60">
                        <TableRow className="hover:bg-transparent">
                           <TableHead className="pl-4 text-muted-foreground">Date</TableHead>
                           <TableHead className="text-muted-foreground">Client</TableHead>
                           <TableHead className="text-muted-foreground">Plan</TableHead>
                           <TableHead className="text-muted-foreground">State</TableHead>
                           <TableHead className="text-muted-foreground">Service</TableHead>
                           <TableHead className="text-muted-foreground">Type</TableHead>
                           <TableHead className="pr-4 text-right text-muted-foreground">Amount</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {groupByClient ? (
                           groupTable.getRowModel().rows.length === 0 ? (
                              <TableRow>
                                 <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                                    No payments match the current filters.
                                 </TableCell>
                              </TableRow>
                           ) : (
                              groupTable.getRowModel().rows.map(({ original: g }) => (
                                 <React.Fragment key={g.clientId}>
                                    <ClientGroupRow
                                       group={g}
                                       expanded={expanded.has(g.clientId)}
                                       onToggle={() => toggleExpand(g.clientId)}
                                    />
                                    {expanded.has(g.clientId) &&
                                       g.payments.map((p) => <PaymentRow key={p.id} p={p} grouped />)}
                                 </React.Fragment>
                              ))
                           )
                        ) : pageRows.length === 0 ? (
                           <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                                 No payments match the current filters.
                              </TableCell>
                           </TableRow>
                        ) : (
                           pageRows.map(({ original: p }) => <PaymentRow key={p.id} p={p} />)
                        )}
                     </TableBody>
                  </Table>
               </div>

               {groupByClient
                  ? groups.length > 0 && <DataTablePagination table={groupTable} />
                  : tableRows.length > 0 && <DataTablePagination table={table} />}
            </CardContent>
         </Card>
      </div>
   )
}

// ─── Table rows ───────────────────────────────────────────────────────────────

function ServiceBadge({ service }: { service: RevenuePayment["service"] }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs",
            service === "snapshot"
               ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400"
               : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
         )}
      >
         {service === "snapshot" ? "Snapshot" : "List"}
      </Badge>
   )
}

// A single payment row. In grouped mode the client column is blank (the client
// is the parent group row) and the date is indented to show nesting.
function PaymentRow({ p, grouped = false }: { p: RevenuePayment; grouped?: boolean }) {
   return (
      <TableRow>
         <TableCell className={cn("pl-4 text-xs text-muted-foreground whitespace-nowrap tabular-nums", grouped && "pl-10")}>
            {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
         </TableCell>
         <TableCell className="text-sm font-medium">
            {grouped ? <span className="text-muted-foreground opacity-40">-</span> : p.clientName}
         </TableCell>
         <TableCell className="text-sm">{p.planName}</TableCell>
         <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
            {p.state || <span className="opacity-40">-</span>}
         </TableCell>
         <TableCell>
            <ServiceBadge service={p.service} />
         </TableCell>
         <TableCell className="text-xs text-muted-foreground">
            {DURATION_LABELS[p.durationType] ?? p.durationType}
         </TableCell>
         <TableCell className="pr-4 text-right text-sm font-medium tabular-nums">{inr(p.gross)}</TableCell>
      </TableRow>
   )
}

// Collapsible client header row: shows the client + their total revenue; the
// whole row toggles the expanded payment list.
function ClientGroupRow({
   group,
   expanded,
   onToggle,
}: {
   group: ClientGroup
   expanded: boolean
   onToggle: () => void
}) {
   return (
      <TableRow className="cursor-pointer bg-muted/30 hover:bg-muted/50" onClick={onToggle} aria-expanded={expanded}>
         <TableCell colSpan={6} className="pl-4">
            <div className="flex items-center gap-2">
               <ChevronRightIcon
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
               />
               <span className="text-sm font-semibold">{group.clientName}</span>
               <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  {group.txns} {group.txns === 1 ? "payment" : "payments"}
               </Badge>
            </div>
         </TableCell>
         <TableCell className="pr-4 text-right text-sm font-bold tabular-nums">{inr(group.total)}</TableCell>
      </TableRow>
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
