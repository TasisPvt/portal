"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { SearchIcon, BuildingIcon, FilterIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, BookmarkIcon, LockIcon, ClockIcon, CalendarDaysIcon, FactoryIcon } from "lucide-react"
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
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from "@/src/components/ui/dialog"
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from "@/src/components/ui/sheet"
import { Button } from "@/src/components/ui/button"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
   EmptyContent,
} from "@/src/components/ui/empty"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
   Card,
   CardHeader,
   CardTitle,
   CardAction,
   CardContent,
   CardFooter,
} from "@/src/components/ui/card"
import { cn } from "@/src/lib/utils"
import { formatMonth as fmtMonth } from "@/src/lib/format"
import { getListCompanies, unlockCurrentMonth, type ListSubscription, type ListCompany, type ListMonthViews } from "../_actions"
import { toggleWatchlist, getWatchlistedCompanyIds } from "../../watchlist/_actions"
import { WATCHLIST_LIMIT, ANNUAL_LIST_MONTH_VIEWS } from "@/src/lib/constants"
import { getCompanySnapshot, getFinancialRatioThresholds, getListRecentlyViewed, type RecentlyViewedCompany } from "../../snapshot/_actions"
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
// never conveyed by color alone - satisfies WCAG color-not-only + contrast rules.
function StatusBadge({ status }: { status: number | null }) {
   if (status === null) return <span className="text-xs text-muted-foreground">-</span>
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

// ─── Recently Viewed ──────────────────────────────────────────────────────────

function fmtLastViewed(dateStr: string): string {
   const today = new Date().toISOString().slice(0, 10)
   const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
   if (dateStr === today) return "Today"
   if (dateStr === yesterday) return "Yesterday"
   const [y, m, d] = dateStr.split("-")
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function RecentlyViewedSection({
   items,
   onSelect,
}: {
   items: RecentlyViewedCompany[]
   onSelect: (c: RecentlyViewedCompany) => void
}) {
   const [open, setOpen] = React.useState(false)
   // Cap the sheet at the 10 most recently viewed stocks - the list can grow large.
   const recent = items.slice(0, 10)
   if (recent.length === 0) return null

   return (
      <Sheet open={open} onOpenChange={setOpen}>
         <SheetTrigger asChild>
            <Button
               variant="outline"
               size="icon"
               className="relative shrink-0 text-muted-foreground"
               aria-label={`Recently viewed (${recent.length})`}
            >
               <ClockIcon className="size-3.5 text-foreground" />
               <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
                  {recent.length}
               </span>
            </Button>
         </SheetTrigger>
         <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
               <SheetTitle>Recently Viewed</SheetTitle>
               <SheetDescription>Companies you&apos;ve looked at recently.</SheetDescription>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
               {recent.map((c) => (
                  <button
                     key={c.id}
                     onClick={() => {
                        onSelect(c)
                        setOpen(false)
                     }}
                     className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                     <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium leading-tight">{c.companyName}</span>
                        <span className="text-[11px] text-muted-foreground">{fmtLastViewed(c.lastViewed)}</span>
                     </span>
                     <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
               ))}
            </div>
         </SheetContent>
      </Sheet>
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
   const [snapshotTitle, setSnapshotTitle] = React.useState<string | null>(null)
   const [snapshotLoading, setSnapshotLoading] = React.useState(false)
   const [snapshotData, setSnapshotData] = React.useState<SnapshotSuccess | null>(null)
   const [snapshotError, setSnapshotError] = React.useState<string | null>(null)
   const [thresholds, setThresholds] = React.useState<Record<string, number>>({})
   const [watchlistedIds, setWatchlistedIds] = React.useState<Set<string>>(new Set())
   const [togglingId, setTogglingId] = React.useState<string | null>(null)
   const [recentlyViewed, setRecentlyViewed] = React.useState<RecentlyViewedCompany[]>([])
   const [monthViews, setMonthViews] = React.useState<ListMonthViews | null>(null)
   const [refreshKey, setRefreshKey] = React.useState(0)
   const [unlockOpen, setUnlockOpen] = React.useState(false)
   const [unlocking, setUnlocking] = React.useState(false)

   React.useEffect(() => {
      getFinancialRatioThresholds().then(setThresholds)
      getWatchlistedCompanyIds().then((ids) => setWatchlistedIds(new Set(ids)))
   }, [])

   // Recently-viewed is per-list: refetch it whenever the selected subscription
   // changes, and clear it when no list is selected.
   React.useEffect(() => {
      if (!selectedSubId) {
         setRecentlyViewed([])
         return
      }
      getListRecentlyViewed(selectedSubId).then(setRecentlyViewed)
   }, [selectedSubId])

   // Open the snapshot dialog for a company and load its screening detail. Used
   // by both the grid cards and the recently-viewed sheet.
   function openSnapshot(companyId: string, companyName: string) {
      setSnapshotTitle(companyName)
      setSnapshotData(null)
      setSnapshotError(null)
      setSnapshotLoading(true)
      getCompanySnapshot(companyId, false, true, selectedSubId ?? undefined)
         .then((result) => {
            if ("error" in result && result.error) setSnapshotError(result.error as string)
            else if ("company" in result) setSnapshotData(result)
         })
         .finally(() => {
            setSnapshotLoading(false)
            // Refresh so the just-viewed company moves to the top of the list.
            if (selectedSubId) getListRecentlyViewed(selectedSubId).then(setRecentlyViewed)
         })
   }

   // Optimistic bookmark toggle for a company card.
   async function handleToggleWatchlist(companyId: string) {
      const wasActive = watchlistedIds.has(companyId)
      setTogglingId(companyId)
      setWatchlistedIds((prev) => {
         const next = new Set(prev)
         if (wasActive) next.delete(companyId)
         else next.add(companyId)
         return next
      })
      const res = await toggleWatchlist(companyId)
      setTogglingId(null)
      if (!res.ok) {
         setWatchlistedIds((prev) => {
            const next = new Set(prev)
            if (wasActive) next.add(companyId)
            else next.delete(companyId)
            return next
         })
         toast.error(
            res.error === "no_active_subscription"
               ? "An active subscription is required to use the watchlist."
               : res.error === "limit_reached"
                  ? `Watchlist is full (${WATCHLIST_LIMIT} companies). Remove a company before adding another.`
                  : "Couldn't update watchlist. Please try again.",
         )
      } else {
         toast.success(res.watchlisted ? "Added to watchlist" : "Removed from watchlist")
      }
   }

   React.useEffect(() => {
      if (!selectedSubId) return
      setLoading(true)
      setCompanies([])
      setAvailableMonths([])
      setMonthViews(null)
      getListCompanies(selectedSubId, selectedMonth ?? undefined)
         .then(({ companies, availableMonths, monthViews }) => {
            setCompanies(companies)
            setAvailableMonths(availableMonths)
            setMonthViews(monthViews)
         })
         .finally(() => setLoading(false))
   }, [selectedSubId, selectedMonth, refreshKey])

   // Consume one month view to unlock the current month (annual subs only).
   async function handleUnlockMonth() {
      if (!selectedSubId) return
      setUnlocking(true)
      const res = await unlockCurrentMonth(selectedSubId)
      setUnlocking(false)
      setUnlockOpen(false)
      if (res.ok || res.error === "already_unlocked") {
         if (res.ok) toast.success(`${fmtMonth(res.month)} list is now available.`)
         setSelectedMonth(null) // jump to the latest (just-unlocked) month
         setRefreshKey((k) => k + 1)
      } else {
         toast.error(
            res.error === "limit_reached"
               ? `All ${monthViews?.limit ?? ANNUAL_LIST_MONTH_VIEWS} month views for this subscription have been used.`
               : "Couldn't unlock this month. Please try again.",
         )
      }
   }

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
      if (q) {
         result = result.filter(
            (c) =>
               c.companyName.toLowerCase().includes(q) ||
               (c.nseSymbol?.toLowerCase().includes(q) ?? false) ||
               (c.bseScripCode?.toLowerCase().includes(q) ?? false) ||
               // (c.isinCode?.toLowerCase().includes(q) ?? false) ||
               (c.industryGroup?.toLowerCase().includes(q) ?? false),
         )
      }

      // Sort alphabetically by company name (A→Z).
      return [...result].sort((a, b) =>
         a.companyName.localeCompare(b.companyName, undefined, { sensitivity: "base" }),
      )
   }, [companies, search, complianceFilter])

   const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

   const paginated = React.useMemo(
      () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      [filtered, currentPage, pageSize],
   )

   // Annual-list plan with no month unlocked yet: the "No month unlocked" empty
   // state is showing, so the filter/search controls have nothing to act on.
   const noMonthUnlocked = !loading && !!monthViews && availableMonths.length === 0
   // Show the month dropdown once at least one month is available. For annual
   // plans that means the first unlock reveals it (so the user always knows which
   // month they're viewing); other durations only need it when there's a choice.
   const showMonthSelector = monthViews ? availableMonths.length > 0 : availableMonths.length > 1

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
                  const select = () => {
                     setSearch("")
                     setSelectedMonth(null)
                     setSelectedSubId(sub.subscriptionId)
                  }
                  return (
                     <Card
                        key={sub.subscriptionId}
                        size="sm"
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        onClick={select}
                        onKeyDown={(e) => {
                           if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              select()
                           }
                        }}
                        className={cn(
                           "cursor-pointer px-3 py-3! gap-2! transition-all",
                           "focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none hover:border-primary",
                           active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "bg-muted hover:bg-muted/60",
                        )}
                     >
                        <span className="block text-sm font-medium">{sub.indexName}</span>
                        <span className="text-xs text-muted-foreground">
                           {fmtDurationType(sub.durationType)} · {fmtMonth(sub.startMonth)} – {fmtMonth(sub.endMonth)}
                        </span>
                     </Card>
                  )
               })}
            </div>
         )}

         {/* ── Empty state (no sub selected) ── */}
         {!selectedSubId ? (
            <Empty className="py-24">
               <EmptyHeader>
                  <EmptyMedia variant="icon">
                     <BuildingIcon />
                  </EmptyMedia>
                  <EmptyTitle>No List Selected</EmptyTitle>
                  <EmptyDescription>Select a list above to view its companies</EmptyDescription>
               </EmptyHeader>
            </Empty>
         ) : (
            <>
               {/* ── Index header card (gradient - matches snapshot header) ── */}
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

               {/* ── Month views banner (annual subs only) ── */}
               {monthViews && !loading && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
                     <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                           <CalendarDaysIcon className="size-4" />
                        </span>
                        <div>
                           <p className="text-sm font-medium">
                              Month views: {monthViews.used} of {monthViews.limit} used
                           </p>
                           <p className="text-xs text-muted-foreground">
                              Your annual plan includes {monthViews.limit} month views. Unlocked months stay available for the rest of your subscription.
                           </p>
                        </div>
                     </div>
                     {monthViews.canUnlock ? (
                        <Button size="sm" onClick={() => setUnlockOpen(true)}>
                           View {fmtMonth(monthViews.currentMonth)} list
                        </Button>
                     ) : !monthViews.currentMonthUnlocked ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                           <LockIcon className="size-3.5" />
                           All month views used
                        </span>
                     ) : null}
                  </div>
               )}

               {/* ── Filter & Search (hidden while no month is unlocked) ── */}
               {!noMonthUnlocked && (
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

                  {/* Recently viewed - opens a sheet */}
                  <RecentlyViewedSection
                     items={recentlyViewed}
                     onSelect={(c) => openSnapshot(c.id, c.companyName)}
                  />
               </div>
               )}

               {/* ── Month selector (quarterly / annual only) ── */}
               {showMonthSelector && (
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

               {/* ── No month unlocked yet (annual subs) ── */}
               {!loading && monthViews && availableMonths.length === 0 ? (
                  <Empty className="border py-16">
                     <EmptyHeader>
                        <EmptyMedia variant="icon">
                           <CalendarDaysIcon />
                        </EmptyMedia>
                        <EmptyTitle>No month unlocked yet</EmptyTitle>
                        <EmptyDescription>
                           Your annual plan includes {monthViews.limit} month views. Unlock the current
                           month to see its company list.
                        </EmptyDescription>
                     </EmptyHeader>
                     {monthViews.canUnlock && (
                        <EmptyContent>
                           <Button onClick={() => setUnlockOpen(true)}>
                              View {fmtMonth(monthViews.currentMonth)} list
                           </Button>
                        </EmptyContent>
                     )}
                  </Empty>
               ) : (

               <>
               {/* ── Company list (2-column grid - adaptive to available space) ── */}
               <div className="grid grid-cols-1 @4xl/main:grid-cols-2 @6xl/main:grid-cols-3 gap-3">
                  {loading ? (
                     <>
                        {Array.from({ length: 6 }).map((_, i) => (
                           <Card key={i} size="sm">
                              <CardHeader>
                                 <Skeleton className="h-4 w-40" />
                                 <CardAction>
                                    <Skeleton className="h-5 w-24" />
                                 </CardAction>
                              </CardHeader>
                              <CardContent className="flex flex-col gap-2">
                                 <Skeleton className="h-3 w-32" />
                                 <Skeleton className="h-3 w-24" />
                              </CardContent>
                           </Card>
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
                        <Card
                           key={company.id}
                           size="sm"
                           role="button"
                           tabIndex={0}
                           aria-label={`View details for ${company.companyName}`}
                           onClick={() => openSnapshot(company.id, company.companyName)}
                           onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                 e.preventDefault()
                                 openSnapshot(company.id, company.companyName)
                              }
                           }}
                           className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-md"
                        >
                           <CardHeader>
                              <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                                 {company.companyName}
                              </CardTitle>
                              <CardAction>
                                 <div className="flex items-center gap-1.5">
                                    <StatusBadge status={company.shariahStatus} />
                                    <button
                                       type="button"
                                       onClick={(e) => {
                                          e.stopPropagation()
                                          handleToggleWatchlist(company.id)
                                       }}
                                       disabled={togglingId === company.id}
                                       aria-pressed={watchlistedIds.has(company.id)}
                                       aria-label={watchlistedIds.has(company.id) ? "Remove from watchlist" : "Add to watchlist"}
                                       title={watchlistedIds.has(company.id) ? "Remove from watchlist" : "Add to watchlist"}
                                       className={cn(
                                          "flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50",
                                          watchlistedIds.has(company.id)
                                             ? "border-primary/30 bg-primary/10 text-primary"
                                             : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                                       )}
                                    >
                                       <BookmarkIcon className={cn("size-3.5", watchlistedIds.has(company.id) && "fill-current")} />
                                    </button>
                                 </div>
                              </CardAction>
                           </CardHeader>

                           <CardContent className="flex flex-col gap-2.5">
                              {(company.nseSymbol || company.bseScripCode) && (
                                 <div className="flex flex-wrap gap-1">
                                    {company.nseSymbol && (
                                       <Badge variant="secondary" className="rounded-lg">
                                          <span className="text-foreground">NSE Symbol: </span>{company.nseSymbol}
                                       </Badge>
                                    )}
                                    {company.bseScripCode && (
                                       <Badge variant="secondary" className="rounded-lg">
                                          <span className="text-foreground">BSE Scrip Code: </span>{company.bseScripCode}
                                       </Badge>
                                    )}
                                 </div>
                              )}
                           </CardContent>

                           {/* Industry - icon replaces the "Industry" label */}
                           {company.industryGroup && (
                              <CardFooter className="mt-auto gap-1.5 border-t pt-3 text-xs">
                                 <FactoryIcon
                                    className="size-3.5 shrink-0 text-primary"
                                    aria-label="Industry"
                                 />
                                 <span className="min-w-0 flex-1 truncate font-medium text-primary">
                                    {company.industryGroup}
                                 </span>
                              </CardFooter>
                           )}
                        </Card>
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
            </>
         )}

         {/* ── Company snapshot dialog ── */}
         <Dialog
            open={snapshotTitle !== null}
            onOpenChange={(open) => {
               if (!open) {
                  setSnapshotTitle(null)
                  setSnapshotData(null)
                  setSnapshotError(null)
               }
            }}
         >
            <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-3xl">
               <DialogHeader className="shrink-0">
                  <DialogTitle className="pr-6 text-base leading-snug">
                     {snapshotTitle}
                  </DialogTitle>
               </DialogHeader>
               <div className="min-h-0 flex-1 overflow-y-auto">
                  {snapshotLoading && (
                     <div className="flex items-center justify-center py-16">
                        <Spinner className="size-6" />
                     </div>
                  )}
                  {!snapshotLoading && snapshotError && (
                     snapshotError === "no_subscription" ? (
                        <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
                           <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                              <LockIcon className="size-5 text-muted-foreground" />
                           </div>
                           <div>
                              <p className="text-sm font-medium text-foreground">Snapshot subscription required</p>
                              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                                 Your list plan lets you browse companies. To view detailed Shariah screening for a
                                 company, you need an active Snapshot plan.
                              </p>
                           </div>
                           <Button asChild size="sm">
                              <Link href="/plans">Browse Snapshot plans</Link>
                           </Button>
                        </div>
                     ) : (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                           {snapshotError === "daily_quota_exceeded"
                              ? "Daily quota reached. You've viewed the maximum companies for today."
                              : "Failed to load snapshot."}
                        </p>
                     )
                  )}
                  {!snapshotLoading && snapshotData && (
                     <div className="p-1">
                        <SnapshotCard
                           data={snapshotData}
                           commonRemark={null}
                           thresholds={thresholds}
                           watchlist={{
                              active: watchlistedIds.has(snapshotData.company.id),
                              pending: togglingId === snapshotData.company.id,
                              onToggle: () => handleToggleWatchlist(snapshotData.company.id),
                           }}
                        />
                     </div>
                  )}
               </div>
            </DialogContent>
         </Dialog>

         {/* ── Unlock current month confirmation (annual subs) ── */}
         <Dialog open={unlockOpen} onOpenChange={(open) => !unlocking && setUnlockOpen(open)}>
            <DialogContent className="sm:max-w-md">
               <DialogHeader>
                  <DialogTitle>
                     View {monthViews ? fmtMonth(monthViews.currentMonth) : "this month's"} list?
                  </DialogTitle>
               </DialogHeader>
               <p className="text-sm text-muted-foreground">
                  This will use{" "}
                  <span className="font-semibold text-foreground">
                     1 of your {monthViews ? monthViews.limit - monthViews.used : 0} remaining month views
                  </span>{" "}
                  for this subscription. The month stays available for the rest of your subscription,
                  but a used view can&apos;t be returned.
               </p>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setUnlockOpen(false)} disabled={unlocking}>
                     Cancel
                  </Button>
                  <Button onClick={handleUnlockMonth} disabled={unlocking}>
                     {unlocking ? "Unlocking…" : "Yes, view this month"}
                     {unlocking && <Spinner className="ml-2" />}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   )
}
