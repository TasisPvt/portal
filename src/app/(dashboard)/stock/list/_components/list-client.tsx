"use client"

import * as React from "react"
import { SearchIcon, BuildingIcon, FilterIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/src/components/ui/dialog"
import { Button } from "@/src/components/ui/button"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { cn } from "@/src/lib/utils"
import { formatMonth as fmtMonth } from "@/src/lib/format"
import { getListCompanies, type ListSubscription, type ListCompany } from "../_actions"
import { getCompanySnapshot, getFinancialRatioThresholds } from "../../snapshot/_actions"
import { SnapshotCard, type SnapshotSuccess } from "../../snapshot/_components/snapshot-client"
import { Badge } from "@/src/components/ui/badge"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDurationType(t: string): string {
   return t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// Indian-grouped currency (e.g. ₹12,34,56,78,91,011), no decimals.
function fmtMarketCap(total: number): string {
   return `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Builds the list of page tokens to render: numbers plus "…" placeholders.
// Always shows first/last page and a window around the current page.
function getPageRange(current: number, total: number): (number | "ellipsis")[] {
   if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
   const pages: (number | "ellipsis")[] = [1]
   let start = Math.max(2, current - 1)
   let end = Math.min(total - 1, current + 1)
   if (current <= 3) {
      start = 2
      end = 4
   } else if (current >= total - 2) {
      start = total - 3
      end = total - 1
   }
   if (start > 2) pages.push("ellipsis")
   for (let i = start; i <= end; i++) pages.push(i)
   if (end < total - 1) pages.push("ellipsis")
   pages.push(total)
   return pages
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Uses Tailwind semantic colors (dark-mode aware) + dot shape so status is
// never conveyed by color alone — satisfies WCAG color-not-only + contrast rules.
function StatusBadge({ status }: { status: number | null }) {
   if (status === null) return <span className="text-xs text-muted-foreground">—</span>
   const compliant = status === 1
   return (
      <span
         className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            compliant
               ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
               : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
         )}
      >
         <span
            className={cn(
               "size-1.5 shrink-0 rounded-full",
               compliant ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400",
            )}
            aria-hidden="true"
         />
         {compliant ? "Shariah Compliant" : "Non-Shariah Compliant"}
      </span>
   )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ListClientProps {
   subscriptions: ListSubscription[]
}

export function ListClient({ subscriptions }: ListClientProps) {
   const [selectedSubId, setSelectedSubId] = React.useState<string | null>(
      subscriptions.length === 1 ? subscriptions[0].subscriptionId : null,
   )
   const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null)
   const [companies, setCompanies] = React.useState<ListCompany[]>([])
   const [availableMonths, setAvailableMonths] = React.useState<string[]>([])
   const [loading, setLoading] = React.useState(subscriptions.length === 1)
   const [search, setSearch] = React.useState("")
   const [complianceFilter, setComplianceFilter] = React.useState<"all" | "compliant" | "non-compliant">("all")
   const [pageSize, setPageSize] = React.useState(10)
   const [currentPage, setCurrentPage] = React.useState(1)
   const [selectedCompany, setSelectedCompany] = React.useState<ListCompany | null>(null)
   const [snapshotLoading, setSnapshotLoading] = React.useState(false)
   const [snapshotData, setSnapshotData] = React.useState<SnapshotSuccess | null>(null)
   const [snapshotError, setSnapshotError] = React.useState<string | null>(null)
   const [thresholds, setThresholds] = React.useState<Record<string, number>>({})

   React.useEffect(() => {
      getFinancialRatioThresholds().then(setThresholds)
   }, [])

   React.useEffect(() => {
      if (!selectedSubId) return
      setLoading(true)
      setCompanies([])
      setAvailableMonths([])
      getListCompanies(selectedSubId, selectedMonth ?? undefined)
         .then(({ companies, availableMonths }) => {
            setCompanies(companies)
            setAvailableMonths(availableMonths)
         })
         .finally(() => setLoading(false))
   }, [selectedSubId, selectedMonth])

   const selectedSub = subscriptions.find((s) => s.subscriptionId === selectedSubId)

   const complianceCounts = React.useMemo(() => {
      let compliant = 0
      let nonCompliant = 0
      let totalCap = 0
      let compliantCap = 0
      let nonCompliantCap = 0
      for (const c of companies) {
         const parsed = c.marketCap ? parseFloat(c.marketCap) : 0
         const cap = Number.isFinite(parsed) ? parsed : 0
         totalCap += cap
         if (c.shariahStatus === 1) {
            compliant++
            compliantCap += cap
         } else if (c.shariahStatus !== null) {
            nonCompliant++
            nonCompliantCap += cap
         }
      }
      return { compliant, nonCompliant, all: companies.length, totalCap, compliantCap, nonCompliantCap }
   }, [companies])

   const filtered = React.useMemo(() => {
      let result = companies

      // Apply compliance filter
      if (complianceFilter === "compliant") {
         result = result.filter((c) => c.shariahStatus === 1)
      } else if (complianceFilter === "non-compliant") {
         result = result.filter((c) => c.shariahStatus !== null && c.shariahStatus !== 1)
      }

      // Apply search filter
      const q = search.toLowerCase()
      if (!q) return result
      return result.filter(
         (c) =>
            c.companyName.toLowerCase().includes(q) ||
            (c.nseSymbol?.toLowerCase().includes(q) ?? false) ||
            (c.bseScripCode?.toLowerCase().includes(q) ?? false) ||
            // (c.isinCode?.toLowerCase().includes(q) ?? false) ||
            (c.industryGroup?.toLowerCase().includes(q) ?? false),
      )
   }, [companies, search, complianceFilter])

   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

   const paginated = React.useMemo(
      () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      [filtered, currentPage, pageSize],
   )

   // Reset to the first page whenever the result set or page size changes.
   React.useEffect(() => {
      setCurrentPage(1)
   }, [search, complianceFilter, pageSize, selectedSubId, selectedMonth])

   return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">

         {/* ── Subscription selector (multiple only) ── */}
         {subscriptions.length > 1 && (
            <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Select a list">
               {subscriptions.map((sub) => {
                  const active = sub.subscriptionId === selectedSubId
                  return (
                     <button
                        key={sub.subscriptionId}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                           setSearch("")
                           setSelectedMonth(null)
                           setSelectedSubId(sub.subscriptionId)
                        }}
                        className={cn(
                           "rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-sm transition-all",
                           "hover:cursor-pointer hover:border-primary",
                           active
                              ? "border-primary bg-primary/10 text-foreground font-medium"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
                        )}
                     >
                        <span className="block font-medium">{sub.indexName}</span>
                        <span className="text-xs text-muted-foreground">
                           {fmtDurationType(sub.durationType)} · {fmtMonth(sub.startMonth)} – {fmtMonth(sub.endMonth)}
                        </span>
                     </button>
                  )
               })}
            </div>
         )}

         {/* ── Empty state (no sub selected) ── */}
         {!selectedSubId ? (
            <div className="flex flex-col items-center justify-center gap-4 p-6 py-24 text-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <BuildingIcon className="size-6 text-muted-foreground" />
               </div>
               <div>
                  <h3 className="font-semibold text-foreground">No List Selected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Select a list above to view its companies</p>
               </div>
            </div>
         ) : (
            <>
               {/* ── Index header card (gradient — matches snapshot header) ── */}
               {selectedSub && (
                  <div
                     style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #1a3a6e 100%)" }}
                     className="overflow-hidden rounded-2xl shadow-lg"
                  >
                     {/* List name + window badge */}
                     <div className="px-6 py-6">
                        <div className="flex flex-col justify-between gap-3 @2xl/main:flex-row @2xl/main:items-start">
                           <h1 className="text-2xl font-bold text-white sm:text-3xl">{selectedSub.indexName}</h1>
                           <div className="flex items-center gap-1.5 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1">
                              <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                              <span className="whitespace-nowrap text-xs font-medium text-white">
                                 {fmtMonth(selectedSub.startMonth)} – {fmtMonth(selectedSub.endMonth)}
                              </span>
                           </div>
                        </div>
                        {selectedSub.indexDescription && (
                           <p className="mt-2 max-w-3xl text-sm text-blue-100/70">{selectedSub.indexDescription}</p>
                        )}
                     </div>

                     {/* Statistics table */}
                     {!loading && companies.length > 0 && (
                        <div className="overflow-x-auto border-t border-white/10 px-6 py-5">
                           <table className="w-full border-collapse text-left text-sm">
                              <thead>
                                 <tr className="border-b border-white/10 text-[10px] font-semibold uppercase tracking-widest text-blue-300/60">
                                    <th className="pb-2 font-semibold">Companies</th>
                                    <th className="pb-2 pl-4 text-right font-semibold">Nos</th>
                                    <th className="pb-2 pl-4 text-right font-semibold">Market Cap (in millions)</th>
                                 </tr>
                              </thead>
                              <tbody className="text-white [&_tr:first-child_td]:pt-3">
                                 {[
                                    { label: "Total", nos: complianceCounts.all, cap: complianceCounts.totalCap },
                                    { label: "Shariah Compliant", nos: complianceCounts.compliant, cap: complianceCounts.compliantCap },
                                    { label: "Shariah Non-Compliant", nos: complianceCounts.nonCompliant, cap: complianceCounts.nonCompliantCap },
                                 ].map(({ label, nos, cap }) => (
                                    <tr key={label}>
                                       <td className="py-1.5 font-medium whitespace-nowrap">{label}</td>
                                       <td className="py-1.5 pl-4 text-right tabular-nums">{nos}</td>
                                       <td className="py-1.5 pl-4 text-right tabular-nums whitespace-nowrap">{fmtMarketCap(cap)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               )}

               {/* ── Filter & Search ── */}
               <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center @2xl/main:gap-3">
                  {/* Filter Button */}
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                           variant="outline"
                           size="sm"
                           className="w-fit gap-2"
                        >
                           <FilterIcon className="size-4" />
                           <span>
                              {complianceFilter === "all"
                                 ? "All"
                                 : complianceFilter === "compliant"
                                    ? "Shariah Compliant"
                                    : "Non-Compliant"}
                           </span>
                           {complianceFilter !== "all" && (
                              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">
                                 {complianceFilter === "compliant"
                                    ? complianceCounts.compliant
                                    : complianceCounts.nonCompliant}
                              </span>
                           )}
                           <ChevronDownIcon className="size-4 ml-auto" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="start">
                        <DropdownMenuItem
                           onClick={() => {
                              setComplianceFilter("all")
                              setSearch("")
                           }}
                           className={complianceFilter === "all" ? "bg-primary/10" : ""}
                        >
                           All Companies ({complianceCounts.all})
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onClick={() => {
                              setComplianceFilter("compliant")
                              setSearch("")
                           }}
                           className={complianceFilter === "compliant" ? "bg-primary/10" : ""}
                        >
                           Shariah Compliant ({complianceCounts.compliant})
                        </DropdownMenuItem>
                        <DropdownMenuItem
                           onClick={() => {
                              setComplianceFilter("non-compliant")
                              setSearch("")
                           }}
                           className={complianceFilter === "non-compliant" ? "bg-primary/10" : ""}
                        >
                           Non-Shariah Compliant ({complianceCounts.nonCompliant})
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Search Input */}
                  <div className="relative flex-1 sm:max-w-full">
                     <SearchIcon
                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                     />
                     <Input
                        aria-label="Search companies"
                        placeholder="Search by name, symbol, or industry…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                     />
                  </div>

                  {/* Results Count */}
                  {!loading && companies.length > 0 && (
                     <p className="text-xs text-muted-foreground whitespace-nowrap" aria-live="polite">
                        {filtered.length} of {companies.length} shown
                     </p>
                  )}
               </div>

               {/* ── Month selector (quarterly / annual only) ── */}
               {availableMonths.length > 1 && (
                  <div className="flex items-center gap-2.5">
                     <span className="shrink-0 text-sm text-muted-foreground">Viewing month</span>
                     <Select
                        value={selectedMonth ?? availableMonths[0]}
                        onValueChange={(v) => {
                           setSearch("")
                           setSelectedMonth(v === availableMonths[0] ? null : v)
                        }}
                     >
                        <SelectTrigger className="w-36">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {availableMonths.map((month, i) => (
                              <SelectItem key={month} value={month}>
                                 {fmtMonth(month)}
                                 {i === 0 && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">(latest)</span>
                                 )}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               )}

               {/* ── Company list (2-column grid - adaptive to available space) ── */}
               <div className="grid grid-cols-1 @4xl/main:grid-cols-2 gap-3">
                  {loading ? (
                     <>
                        {Array.from({ length: 6 }).map((_, i) => (
                           <div key={i} className="rounded-xl border p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                 <Skeleton className="h-5 w-40" />
                                 <Skeleton className="h-5 w-20 shrink-0" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <Skeleton className="h-4 w-24" />
                                 <Skeleton className="h-4 w-24" />
                                 <Skeleton className="h-4 w-24" />
                                 <Skeleton className="h-4 w-24" />
                              </div>
                           </div>
                        ))}
                     </>
                  ) : filtered.length === 0 ? (
                     <div className="col-span-1 @4xl/main:col-span-2 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 px-4 text-center">
                        <p className="text-sm font-medium text-foreground">No companies found</p>
                        <p className="text-xs text-muted-foreground">
                           {search ? `No matches for "${search}"` : "Try adjusting your filters or search"}
                        </p>
                     </div>
                  ) : (
                     paginated.map((company) => (
                        <div
                           key={company.id}
                           onClick={() => {
                              setSelectedCompany(company)
                              setSnapshotData(null)
                              setSnapshotError(null)
                              setSnapshotLoading(true)
                              getCompanySnapshot(company.id, false)
                                 .then((result) => {
                                    if ("error" in result && result.error) setSnapshotError(result.error as string)
                                    else if ("company" in result) setSnapshotData(result)
                                 })
                                 .finally(() => setSnapshotLoading(false))
                           }}
                           role="button"
                           tabIndex={0}
                           aria-label={`View details for ${company.companyName}`}
                           onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                 e.preventDefault()
                                 setSelectedCompany(company)
                              }
                           }}
                           className="group cursor-pointer rounded-xl border bg-card p-3 transition-all shadow-sm hover:border-primary/40 hover:shadow-md"
                        >
                           {/* Header: Company name + Status badge */}
                           <div className="flex items-start justify-between gap-2 mb-2.5">
                              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors break-words flex-1 min-w-0">
                                 {company.companyName}
                              </h3>
                              <div className="shrink-0">
                                 <StatusBadge status={company.shariahStatus} />
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-1 mt-1">
                              {company.nseSymbol && (<Badge variant="secondary" className="rounded-lg">
                                 <span className="text-foreground ">NSE Symbol: </span>{company.nseSymbol}
                              </Badge>)}
                              {company.bseScripCode && (<Badge variant="secondary" className="rounded-lg">
                                 <span className="text-foreground ">BSE Scrip Code: </span>{company.bseScripCode}
                              </Badge>)}
                           </div>

                           {/* Details: 2x2 grid */}
                           <div className="text-xs mt-3">
                              {company.industryGroup && (
                                 <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Industry</p>
                                    <p className="text-foreground font-medium truncate">{company.industryGroup}</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     ))
                  )}
               </div>

               {/* ── Pagination ── */}
               {!loading && filtered.length > 0 && (
                  <div className="flex flex-col gap-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
                     {/* Page size selector */}
                     <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">Companies per page</span>
                        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                           <SelectTrigger className="h-9 w-20">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              {PAGE_SIZE_OPTIONS.map((size) => (
                                 <SelectItem key={size} value={String(size)}>
                                    {size}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     {/* Page navigation */}
                     <div className="flex items-center gap-1.5">
                        <Button
                           variant="outline"
                           size="icon"
                           className="size-9"
                           aria-label="Previous page"
                           disabled={currentPage === 1}
                           onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                           <ChevronLeftIcon className="size-4" />
                        </Button>

                        {getPageRange(currentPage, totalPages).map((page, i) =>
                           page === "ellipsis" ? (
                              <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground select-none">
                                 …
                              </span>
                           ) : (
                              <Button
                                 key={page}
                                 variant={page === currentPage ? "default" : "outline"}
                                 size="icon"
                                 className="size-9"
                                 aria-label={`Go to page ${page}`}
                                 aria-current={page === currentPage ? "page" : undefined}
                                 onClick={() => setCurrentPage(page)}
                              >
                                 {page}
                              </Button>
                           ),
                        )}

                        <Button
                           variant="outline"
                           size="icon"
                           className="size-9"
                           aria-label="Next page"
                           disabled={currentPage >= totalPages}
                           onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                           <ChevronRightIcon className="size-4" />
                        </Button>
                     </div>
                  </div>
               )}
            </>
         )}

         {/* ── Company snapshot dialog ── */}
         <Dialog
            open={selectedCompany !== null}
            onOpenChange={(open) => {
               if (!open) {
                  setSelectedCompany(null)
                  setSnapshotData(null)
                  setSnapshotError(null)
               }
            }}
         >
            <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-3xl">
               <DialogHeader className="shrink-0">
                  <DialogTitle className="pr-6 text-base leading-snug">
                     {selectedCompany?.companyName}
                  </DialogTitle>
               </DialogHeader>
               <div className="min-h-0 flex-1 overflow-y-auto">
                  {snapshotLoading && (
                     <div className="flex items-center justify-center py-16">
                        <Spinner className="size-6" />
                     </div>
                  )}
                  {!snapshotLoading && snapshotError && (
                     <p className="py-10 text-center text-sm text-muted-foreground">
                        {snapshotError === "daily_quota_exceeded"
                           ? "Daily quota reached. You've viewed the maximum companies for today."
                           : snapshotError === "total_quota_exceeded"
                              ? "Subscription quota reached."
                              : "Failed to load snapshot."}
                     </p>
                  )}
                  {!snapshotLoading && snapshotData && (
                     <div className="p-1">
                        <SnapshotCard data={snapshotData} commonRemark={null} thresholds={thresholds} />
                     </div>
                  )}
               </div>
            </DialogContent>
         </Dialog>
      </div>
   )
}
