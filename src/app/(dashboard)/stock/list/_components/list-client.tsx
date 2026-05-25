"use client"

import * as React from "react"
import { SearchIcon, BuildingIcon, FilterIcon, ChevronDownIcon } from "lucide-react"
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
import { getListCompanies, type ListSubscription, type ListCompany } from "../_actions"
import { getCompanySnapshot, getFinancialRatioThresholds, type CompanySnapshotResult } from "../../snapshot/_actions"
import { SnapshotCard, type SnapshotSuccess } from "../../snapshot/_components/snapshot-client"
import { Badge } from "@/src/components/ui/badge"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMonth(month: string | null): string {
   if (!month) return "—"
   const [y, m] = month.split("-")
   const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${names[parseInt(m) - 1]} '${y.slice(2)}`
}

function fmtDate(date: string | null): string {
   if (!date) return "—"
   const [y, m, d] = date.split("-")
   const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${parseInt(d)} ${names[parseInt(m) - 1]} ${y}`
}

function fmtDurationType(t: string): string {
   return t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
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

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
   return (
      <div className="grid grid-cols-2 gap-2 border-b py-2.5 text-sm last:border-0">
         <span className="text-muted-foreground">{label}</span>
         <span className="text-right font-medium">{value || "—"}</span>
      </div>
   )
}

function TableSkeleton() {
   return (
      <>
         {Array.from({ length: 10 }).map((_, i) => (
            <tr key={i} className="border-b">
               <td className="px-4 py-3.5"><Skeleton className="h-3.5 w-5" /></td>
               <td className="px-4 py-3.5"><Skeleton className="h-4 w-52" /></td>
               <td className="hidden px-4 py-3.5 sm:table-cell"><Skeleton className="h-4 w-20" /></td>
               <td className="hidden px-4 py-3.5 md:table-cell"><Skeleton className="h-4 w-36" /></td>
               <td className="px-4 py-3.5"><Skeleton className="h-6 w-36 rounded-full" /></td>
               <td className="hidden px-4 py-3.5 lg:table-cell"><Skeleton className="h-4 w-14" /></td>
            </tr>
         ))}
      </>
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
      const compliant = companies.filter((c) => c.shariahStatus === 1).length
      const nonCompliant = companies.filter((c) => c.shariahStatus !== null && c.shariahStatus !== 1).length
      return { compliant, nonCompliant, all: companies.length }
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
               {/* ── Index header with statistics ── */}
               {selectedSub && (
                  <div className="space-y-4">
                     <div>
                        <h1 className="text-3xl font-bold text-foreground">{selectedSub.indexName}</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                           {selectedSub.indexDescription}
                        </p>
                     </div>

                     {/* ── Statistics ── */}
                     {!loading && companies.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 sm:gap-6">
                           <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Companies</p>
                              <p className="text-sm font-bold text-foreground">{companies.length}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compliant</p>
                              <p className="text-sm font-bold text-foreground">{complianceCounts.compliant}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Window</p>
                              <p className="text-sm font-medium text-foreground">
                                 {fmtMonth(selectedSub.startMonth)} – {fmtMonth(selectedSub.endMonth)}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* ── Filter & Search ── */}
               <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
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
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                     <div className="col-span-1 lg:col-span-2 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 px-4 text-center">
                        <p className="text-sm font-medium text-foreground">No companies found</p>
                        <p className="text-xs text-muted-foreground">
                           {search ? `No matches for "${search}"` : "Try adjusting your filters or search"}
                        </p>
                     </div>
                  ) : (
                     filtered.map((company, i) => (
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
                           className="group cursor-pointer rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-md"
                           style={{ boxShadow: "0 12px 32px -20px oklch(0.18 0.05 255 / 0.18)" }}
                        >
                           {/* Header: Company name + Status badge */}
                           <div className="flex items-start justify-between gap-2 mb-2.5">
                              <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors break-words flex-1 min-w-0">
                                 {company.companyName}
                                 <div className="flex flex-wrap gap-1 mt-1">
                                    {company.nseSymbol && (<Badge variant="secondary" className="rounded-lg">
                                       <span className="text-muted-foreground ">NSE: </span>{company.nseSymbol}
                                    </Badge>)}
                                    {company.bseScripCode && (<Badge variant="secondary" className="rounded-lg">
                                       <span className="text-muted-foreground ">BSE: </span>{company.bseScripCode}
                                    </Badge>)}
                                 </div>
                              </h3>
                              <div className="shrink-0">
                                 <StatusBadge status={company.shariahStatus} />
                              </div>
                           </div>

                           {/* Details: 2x2 grid */}
                           <div className="text-xs">
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
