"use client"

import * as React from "react"
import { SearchIcon, BuildingIcon } from "lucide-react"
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
import { cn } from "@/src/lib/utils"
import { getListCompanies, type ListSubscription, type ListCompany } from "../_actions"
import { getCompanySnapshot, getFinancialRatioThresholds, type CompanySnapshotResult } from "../../snapshot/_actions"
import { SnapshotCard, type SnapshotSuccess } from "../../snapshot/_components/snapshot-client"

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

   const filtered = React.useMemo(() => {
      const q = search.toLowerCase()
      if (!q) return companies
      return companies.filter(
         (c) =>
            c.companyName.toLowerCase().includes(q) ||
            (c.nseSymbol?.toLowerCase().includes(q) ?? false) ||
            (c.bseScripCode?.toLowerCase().includes(q) ?? false) ||
            (c.isinCode?.toLowerCase().includes(q) ?? false) ||
            (c.industryGroup?.toLowerCase().includes(q) ?? false),
      )
   }, [companies, search])

   return (
      <div className="flex flex-col gap-5 p-4 sm:p-6">

         {/* ── Subscription selector (multiple only) ── */}
         {subscriptions.length > 1 && (
            <div className="flex flex-wrap gap-3" role="group" aria-label="Select a list">
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
                           "flex min-h-[56px] flex-col justify-center gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                           active
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                              : "border-border bg-card hover:border-border/70 hover:bg-muted/40",
                        )}
                     >
                        <span className="text-sm font-semibold leading-tight">{sub.indexName}</span>
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
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <BuildingIcon className="size-6 text-muted-foreground" />
               </div>
               <p className="text-sm text-muted-foreground">Select a list above to view its companies</p>
            </div>
         ) : (
            <>
               {/* ── Index header ── */}
               {selectedSub && (
                  <div className="flex items-start justify-between gap-4">
                     <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold tracking-tight">
                           {selectedSub.indexName}
                        </h2>
                        {selectedSub.indexDescription && (
                           <p className="mt-1 text-sm text-muted-foreground">{selectedSub.indexDescription}</p>
                        )}
                     </div>
                     <div className="flex shrink-0 flex-col items-end gap-1">
                        {!loading && companies.length > 0 && (
                           <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                              {companies.length} companies
                           </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                           {fmtMonth(selectedSub.startMonth)} – {fmtMonth(selectedSub.endMonth)}
                        </span>
                     </div>
                  </div>
               )}

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

               {/* ── Search bar + filtered count ── */}
               <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full max-w-sm">
                     <SearchIcon
                        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                     />
                     <Input
                        aria-label="Search companies"
                        placeholder="Search name, symbol, ISIN, industry…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                     />
                  </div>
                  {!loading && search && (
                     <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
                        {filtered.length} of {companies.length} shown
                     </p>
                  )}
               </div>

               {/* ── Data table ── */}
               <div className="overflow-hidden rounded-xl border">
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm" aria-label={selectedSub?.indexName ?? "Companies"}>
                        <thead>
                           <tr className="border-b bg-muted/50">
                              <th scope="col" className="w-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 #
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Company
                              </th>
                              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                                 NSE Symbol
                              </th>
                              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                                 Industry
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 Status
                              </th>
                              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                                 Screening Month
                              </th>
                           </tr>
                        </thead>
                        <tbody>
                           {loading ? (
                              <TableSkeleton />
                           ) : filtered.length === 0 ? (
                              <tr>
                                 <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">
                                    {search
                                       ? `No companies match "${search}".`
                                       : "No companies found for this index."}
                                 </td>
                              </tr>
                           ) : (
                              filtered.map((company, i) => (
                                 <tr
                                    key={company.id}
                                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
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
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`View details for ${company.companyName}`}
                                    onKeyDown={(e) => {
                                       if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault()
                                          setSelectedCompany(company)
                                       }
                                    }}
                                 >
                                    <td className="px-4 py-3.5 text-xs tabular-nums text-muted-foreground">
                                       {i + 1}
                                    </td>
                                    <td className="px-4 py-3.5 font-medium">{company.companyName}</td>
                                    <td className="hidden px-4 py-3.5 text-muted-foreground sm:table-cell">
                                       {company.nseSymbol || "—"}
                                    </td>
                                    <td className="hidden px-4 py-3.5 text-muted-foreground md:table-cell">
                                       {company.industryGroup || "—"}
                                    </td>
                                    <td className="px-4 py-3.5">
                                       <StatusBadge status={company.shariahStatus} />
                                    </td>
                                    <td className="hidden px-4 py-3.5 text-muted-foreground lg:table-cell">
                                       {fmtMonth(company.month)}
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
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
