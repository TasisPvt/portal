"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { SearchIcon, BookmarkIcon, Trash2Icon, FilterIcon, ChevronDownIcon } from "lucide-react"

import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
} from "@/src/components/ui/empty"
import { cn } from "@/src/lib/utils"
import { toggleWatchlist, type WatchlistItem } from "../_actions"

type ComplianceFilter = "all" | "compliant" | "non-compliant"

// Binary status only: compliant (status 1) vs non-compliant — the watchlist
// doesn't surface the specific non-compliance reason.
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
         {compliant ? "Shariah Compliant" : "Shariah Non-Compliant"}
      </span>
   )
}

export function WatchlistClient({ items: initialItems }: { items: WatchlistItem[] }) {
   const [items, setItems] = React.useState(initialItems)
   const [removingId, setRemovingId] = React.useState<string | null>(null)
   const [search, setSearch] = React.useState("")
   const [complianceFilter, setComplianceFilter] = React.useState<ComplianceFilter>("all")

   // Compliant = status 1; everything else with a known status is non-compliant.
   const complianceCounts = React.useMemo(() => {
      let compliant = 0
      let nonCompliant = 0
      for (const i of items) {
         if (i.shariahStatus === 1) compliant++
         else if (i.shariahStatus !== null) nonCompliant++
      }
      return { all: items.length, compliant, nonCompliant }
   }, [items])

   const filtered = React.useMemo(() => {
      let result = items

      // Compliance filter
      if (complianceFilter === "compliant") {
         result = result.filter((i) => i.shariahStatus === 1)
      } else if (complianceFilter === "non-compliant") {
         result = result.filter((i) => i.shariahStatus !== null && i.shariahStatus !== 1)
      }

      // Search filter (name, symbol, scrip code, industry)
      const q = search.trim().toLowerCase()
      if (!q) return result
      return result.filter(
         (i) =>
            i.companyName.toLowerCase().includes(q) ||
            (i.nseSymbol?.toLowerCase().includes(q) ?? false) ||
            (i.bseScripCode?.toLowerCase().includes(q) ?? false) ||
            (i.industryGroup?.toLowerCase().includes(q) ?? false),
      )
   }, [items, search, complianceFilter])

   async function handleRemove(id: string) {
      const prev = items
      setRemovingId(id)
      setItems((cur) => cur.filter((i) => i.id !== id)) // optimistic
      const res = await toggleWatchlist(id)
      setRemovingId(null)
      if (!res.ok || res.watchlisted) {
         setItems(prev) // restore on failure / unexpected re-add
         toast.error("Couldn't remove from watchlist. Please try again.")
      } else {
         toast.success("Removed from watchlist")
      }
   }

   if (items.length === 0) {
      return (
         <Empty className="py-24">
            <EmptyHeader>
               <EmptyMedia variant="icon">
                  <BookmarkIcon />
               </EmptyMedia>
               <EmptyTitle>Your watchlist is empty</EmptyTitle>
               <EmptyDescription>
                  Bookmark companies from the Snapshot or List screens to track them here.
               </EmptyDescription>
            </EmptyHeader>
         </Empty>
      )
   }

   return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
         {/* Toolbar: compliance filter + search */}
         <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Filter */}
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-fit gap-2">
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
                     <ChevronDownIcon className="ml-auto size-4" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="start">
                  <DropdownMenuItem
                     onClick={() => setComplianceFilter("all")}
                     className={complianceFilter === "all" ? "bg-primary/10" : ""}
                  >
                     All Companies ({complianceCounts.all})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => setComplianceFilter("compliant")}
                     className={complianceFilter === "compliant" ? "bg-primary/10" : ""}
                  >
                     Shariah Compliant ({complianceCounts.compliant})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => setComplianceFilter("non-compliant")}
                     className={complianceFilter === "non-compliant" ? "bg-primary/10" : ""}
                  >
                     Non-Shariah Compliant ({complianceCounts.nonCompliant})
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="relative flex-1">
               <SearchIcon
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
               />
               <Input
                  aria-label="Search watchlist"
                  placeholder="Search by name, symbol, or industry…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
               />
            </div>

            {/* Results count */}
            <p className="whitespace-nowrap text-xs text-muted-foreground" aria-live="polite">
               {filtered.length} of {items.length} shown
            </p>
         </div>

         {/* Company cards */}
         <div className="grid grid-cols-1 gap-3 @4xl/main:grid-cols-2">
            {filtered.length === 0 ? (
               <div className="col-span-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center @4xl/main:col-span-2">
                  <p className="text-sm font-medium text-foreground">No companies found</p>
                  <p className="text-xs text-muted-foreground">
                     {search ? `No matches for "${search}"` : "Try adjusting your filter"}
                  </p>
               </div>
            ) : (
               filtered.map((item, i) => (
                  <div
                     key={item.id}
                     className="group animate-slide-up rounded-xl border bg-card p-3 shadow-sm motion-reduce:animate-none"
                     style={{ animationDelay: `${Math.min(i, 8) * 80}ms` }}
                  >
                     {/* Name + status + remove */}
                     <div className="mb-3 flex items-start justify-between gap-2">
                        <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                           {item.companyName}
                        </h3>
                        <div className="flex shrink-0 items-center">
                           <StatusBadge status={item.shariahStatus} />
                           <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              disabled={removingId === item.id}
                              aria-label="Remove from watchlist"
                              title="Remove from watchlist"
                              className="flex h-7 w-0 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover:ml-1.5 group-hover:w-7 group-hover:opacity-100 hover:bg-muted hover:text-red-600 focus-visible:ml-1.5 focus-visible:w-7 focus-visible:opacity-100 disabled:opacity-50 motion-reduce:transition-none dark:hover:text-red-400"
                           >
                              <Trash2Icon className="size-3.5" />
                           </button>
                        </div>
                     </div>

                     {/* NSE / BSE codes */}
                     {(item.nseSymbol || item.bseScripCode) && (
                        <div className="mb-3 flex flex-wrap gap-1">
                           {item.nseSymbol && (
                              <Badge variant="secondary" className="rounded-lg">
                                 <span className="text-foreground">NSE Symbol: </span>
                                 {item.nseSymbol}
                              </Badge>
                           )}
                           {item.bseScripCode && (
                              <Badge variant="secondary" className="rounded-lg">
                                 <span className="text-foreground">BSE Scrip Code: </span>
                                 {item.bseScripCode}
                              </Badge>
                           )}
                        </div>
                     )}

                     {/* Industry */}
                     {item.industryGroup && (
                        <div className="mb-3 text-xs">
                           <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Industry
                           </p>
                           <p className="truncate font-medium text-foreground">{item.industryGroup}</p>
                        </div>
                     )}

                     {/* Action */}
                     <div className="flex justify-end">
                        {item.canViewSnapshot ? (
                           <Button asChild size="sm">
                              <Link href={`/stock/snapshot?company=${item.id}`}>View detailed snapshot</Link>
                           </Button>
                        ) : (
                           <Button asChild size="sm" variant="outline">
                              <Link href="/plans">Unlock detailed snapshot</Link>
                           </Button>
                        )}
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>
   )
}
