"use client"

import * as React from "react"
import { toast } from "sonner"
import {
   SearchIcon,
   BuildingIcon,
   CheckCircle2Icon,
   XCircleIcon,
   MinusCircleIcon,
   ShieldCheckIcon,
   BarChart3Icon,
   ClockIcon,
   HelpCircleIcon,
} from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { Spinner } from "@/src/components/ui/spinner"
import { cn } from "@/src/lib/utils"
import {
   searchCompanies,
   getCompanySnapshot,
   getRecentlyViewed,
   type SnapshotAccess,
   type CompanySearchResult,
   type CompanySnapshotResult,
   type RecentlyViewedCompany,
} from "../_actions"

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = {
   1: "Shariah Compliant",
   2: "Primary Bus. Non-compliant",
   3: "Secondary Bus. Non-compliant",
   4: "Financial Non-comp",
   5: "Fail on Investment",
   6: "Incomplete / Old Data",
   7: "Incomplete Bus. Info",
   8: "Status on Hold",
   9: "Not in Universe",
}

const STATUS_COLORS: Record<number, string> = {
   1: "#33cc33",
   2: "#ff0000",
   3: "#ffff00",
   4: "#ffc000",
   5: "#c65911",
   6: "#00b0f0",
   7: "#8497b0",
   8: "#525252",
   9: "#806000",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateStr(dateStr: string | null | undefined): string {
   if (!dateStr) return "—"
   const [y, m, d] = dateStr.split("-")
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function fmtMonthStr(month: string): string {
   const [y, m] = month.split("-")
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${months[parseInt(m) - 1]} '${y.slice(2)}`
}

function fmtMarketCap(val: string | null | undefined): string {
   if (!val) return "—"
   const n = parseFloat(val)
   if (isNaN(n)) return "—"
   if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
   return `₹${n.toLocaleString("en-IN")}`
}

function fmtRatio(val: string | null | undefined): string {
   if (!val) return "—"
   return `${parseFloat(val).toFixed(2)}%`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuotaBar({
   dailyUsed,
   dailyLimit,
   totalUsed,
   totalLimit,
}: {
   dailyUsed: number
   dailyLimit: number | null
   totalUsed: number
   totalLimit: number | null
}) {
   return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
         <span className="font-medium text-foreground">Quota</span>
         <span>
            Today:{" "}
            <span className="font-medium text-foreground tabular-nums">
               {dailyUsed}{dailyLimit !== null ? `/${dailyLimit}` : ""} companies
            </span>
         </span>
         <span>
            Total:{" "}
            <span className="font-medium text-foreground tabular-nums">
               {totalUsed}{totalLimit !== null ? `/${totalLimit}` : ""} companies
            </span>
         </span>
      </div>
   )
}

function BoolRow({
   label,
   value,
   remark,
}: {
   label: string
   value: boolean | null | undefined
   remark?: string | null
}) {
   const isNull = value === null || value === undefined
   const [open, setOpen] = React.useState(false)
   const wrapRef = React.useRef<HTMLDivElement>(null)

   React.useEffect(() => {
      if (!open) return
      function handleOutside(e: MouseEvent | TouchEvent) {
         if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
            setOpen(false)
         }
      }
      document.addEventListener("mousedown", handleOutside)
      document.addEventListener("touchstart", handleOutside)
      return () => {
         document.removeEventListener("mousedown", handleOutside)
         document.removeEventListener("touchstart", handleOutside)
      }
   }, [open])

   return (
      <div className="relative flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
         <span className="text-sm text-muted-foreground">{label}</span>
         <div className="flex shrink-0 items-center gap-1.5">
            {remark && (
               <div ref={wrapRef} className="relative">
                  <button
                     type="button"
                     onClick={() => setOpen((v) => !v)}
                     className="flex size-4 items-center justify-center text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                     <HelpCircleIcon className="size-4" />
                  </button>
                  {open && (
                     <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border bg-popover px-3 py-2.5 text-xs leading-relaxed text-popover-foreground shadow-lg z-120">
                        {remark}
                     </div>
                  )}
               </div>
            )}
            {isNull ? (
               <MinusCircleIcon className="size-4 text-muted-foreground/30" />
            ) : value ? (
               <CheckCircle2Icon className="size-4 text-emerald-500" />
            ) : (
               <XCircleIcon className="size-4 text-red-500" />
            )}
         </div>
      </div>
   )
}

function RatioRow({
   label,
   value,
   status,
}: {
   label: string
   value: string | null | undefined
   status: boolean | null | undefined
}) {
   return (
      <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
         <span className="text-sm text-muted-foreground flex-1">{label}</span>
         <span className="text-sm font-medium tabular-nums w-16 text-right">{fmtRatio(value)}</span>
         {status === null || status === undefined ? (
            <MinusCircleIcon className="size-4 text-muted-foreground/30" />
         ) : status ? (
            <CheckCircle2Icon className="size-4 text-emerald-500" />
         ) : (
            <XCircleIcon className="size-4 text-red-500" />
         )}
      </div>
   )
}

function TasisStamp({ status }: { status: number | null | undefined }) {
   if (!status) {
      return (
         <div className="flex size-28 flex-col items-center justify-center rounded-full border-2 border-dashed text-muted-foreground">
            <span className="text-xs">No Status</span>
         </div>
      )
   }
   const color = STATUS_COLORS[status]
   const label = STATUS_LABELS[status]
   const isDark = [1, 2, 5, 6, 8, 9].includes(status)
   const textColor = isDark ? "text-white" : "text-gray-900"

   return (
      <div
         className={cn("flex size-28 flex-col items-center justify-center rounded-full border-2 shadow-md", textColor)}
         style={{ backgroundColor: color, borderColor: color }}
      >
         {/* <span className={cn("text-3xl font-black leading-none", textColor)}>{status}</span> */}
         <span className={cn("mt-1 max-w-20 text-center text-[9px] font-semibold leading-tight", textColor)}>
            {label}
         </span>
      </div>
   )
}

function ComplianceHistory({
   history,
}: {
   history: { month: string; shariahStatus: number | null }[]
}) {
   if (history.length === 0) {
      return <p className="text-sm text-muted-foreground italic">No historical data available.</p>
   }

   const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))

   return (
      <div className="flex flex-wrap gap-3">
         {sorted.map(({ month, shariahStatus }) => {
            const color = shariahStatus ? STATUS_COLORS[shariahStatus] : "#e5e7eb"
            const label = shariahStatus ? STATUS_LABELS[shariahStatus] : "No data"
            return (
               <div key={month} className="flex flex-col items-center gap-1" title={`${fmtMonthStr(month)}: ${label}`}>
                  <div
                     className="size-8 rounded border border-black/10 shadow-sm"
                     style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                     {fmtMonthStr(month)}
                  </span>
               </div>
            )
         })}
      </div>
   )
}

// ─── Main snapshot card ────────────────────────────────────────────────────────

type SnapshotSuccess = Extract<CompanySnapshotResult, { company: unknown }>

function SnapshotCard({ data }: { data: SnapshotSuccess }) {
   const { company, shariah, complianceHistory, screeningRemarks, quota } = data

   return (
      <div className="flex flex-col gap-5">
         {/* Quota */}
         <QuotaBar
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
            totalUsed={quota.totalUsed}
            totalLimit={quota.totalLimit}
         />

         {/* Company header */}
         <div className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
               <div className="flex flex-col gap-1.5">
                  <h2 className="text-lg font-semibold leading-tight">{company.companyName}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                     {/* <Badge variant="outline" className="text-xs font-normal">
                        Prowess: {company.prowessId}
                     </Badge> */}

                  </div>
               </div>
               <TasisStamp status={shariah?.shariahStatus} />
            </div>
         </div>

         {shariah ? (
            <>
               {/* Overview */}
               <div className="rounded-xl border p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                     <BuildingIcon className="size-4 text-muted-foreground" />
                     Overview
                  </h3>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                     <div>
                        <dt className="text-xs text-muted-foreground">Market Cap</dt>
                        <dd className="text-sm font-medium tabular-nums">{fmtMarketCap(shariah.marketCap)}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">Company Status</dt>
                        <dd className="text-sm font-medium">{shariah.companyStatus ?? "—"}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">Assessment Year</dt>
                        <dd className="text-sm font-medium">{fmtDateStr(shariah.assessmentYear)}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">Data Month</dt>
                        <dd className="text-sm font-medium">{fmtMonthStr(shariah.month)}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">Last Updated</dt>
                        <dd className="text-sm font-medium">
                           {shariah.lastUpdatedAt
                              ? shariah.lastUpdatedAt.toLocaleDateString("en-IN", {
                                 day: "2-digit",
                                 month: "short",
                                 year: "numeric",
                              })
                              : "—"}
                        </dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">ISIN</dt>
                        <dd className="text-sm font-medium">{company.isinCode ?? "—"}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">NSE</dt>
                        <dd className="text-sm font-medium">{company.nseSymbol ?? "—"}</dd>
                     </div>
                     <div>
                        <dt className="text-xs text-muted-foreground">BSE Scrip code</dt>
                        <dd className="text-sm font-medium">{company.bseScripCode ?? "—"}</dd>
                     </div>
                  </dl>
               </div>

               {/* Shariah Parameters + Financial Ratios (tabbed) */}
               <ParametersRatiosTabs shariah={shariah} screeningRemarks={screeningRemarks} />

               {/* Compliance History */}
               <div className="rounded-xl border p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                     <ClockIcon className="size-4 text-muted-foreground" />
                     Compliance History
                  </h3>
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                     {Object.entries(STATUS_COLORS).map(([s, c]) => (
                        <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                           <div className="size-3 rounded-sm border border-black/10" style={{ backgroundColor: c }} />
                           {s}. {STATUS_LABELS[Number(s)]}
                        </div>
                     ))}
                  </div>
                  <ComplianceHistory history={complianceHistory} />
               </div>

               {/* Note */}
               <div className="rounded-xl border bg-muted/20 p-5">
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Note</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                     It is important to note that <b>Shariah scholars globally allow investment in companies with a small amount of interest income</b>.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                     However, investors must <b>identify this portion and donate it to charity (purification)</b>.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                     If this is not done, the <b>investment and its returns shall be considered non-compliant for the investor concerned</b>.
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                     It is important to note that <b>Shariah scholars globally allow investment in companies with a small amount of interest income</b>.
                  </p>
               </div>
            </>
         ) : (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
               No shariah data available for this company.
            </div>
         )}
      </div>
   )
}

// ─── Parameters + Ratios tabbed section ──────────────────────────────────────

type ShariahDetail = NonNullable<SnapshotSuccess["shariah"]>

function ParametersRatiosTabs({
   shariah,
   screeningRemarks,
}: {
   shariah: ShariahDetail
   screeningRemarks: SnapshotSuccess["screeningRemarks"]
}) {
   const remarkMap = new Map(screeningRemarks.map((r) => [r.parameter, r.remark]))
   const [active, setActive] = React.useState<"parameters" | "ratios">("parameters")

   const paramsPass = [
      shariah.lastFinancialData,
      shariah.primaryBusiness,
      shariah.secondaryBusiness,
      shariah.compliantOnInvestment,
      shariah.sufficientFinancialInfo,
   ].every((v) => v === true)

   const ratiosPass = [
      shariah.totalDebtTotalAssetStatus,
      shariah.totalInterestIncomeTotalIncomeStatus,
      shariah.cashBankReceivablesTotalAssetStatus,
   ].every((v) => v === true)

   function tabCls(tab: "parameters" | "ratios", passes: boolean) {
      const isActive = active === tab
      const passColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
      const failColor = "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
      return cn(
         "flex flex-1 items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors",
         isActive ? (passes ? passColor : failColor) : "text-muted-foreground hover:bg-muted/30",
      )
   }

   return (
      <div className="rounded-xl border">
         {/* Tab bar */}
         <div className="flex overflow-hidden rounded-t-xl border-b">
            <button className={cn(tabCls("parameters", paramsPass), "border-r")} onClick={() => setActive("parameters")}>
               <ShieldCheckIcon className="size-4 shrink-0" />
               <span>Shariah Parameters</span>
               <div
                  className={cn(
                     "ml-auto size-2 shrink-0 rounded-full",
                     paramsPass ? "bg-emerald-500" : "bg-red-500",
                  )}
               />
            </button>
            <button className={tabCls("ratios", ratiosPass)} onClick={() => setActive("ratios")}>
               <BarChart3Icon className="size-4 shrink-0" />
               <span>Financial Ratios</span>
               <div
                  className={cn(
                     "ml-auto size-2 shrink-0 rounded-full",
                     ratiosPass ? "bg-emerald-500" : "bg-red-500",
                  )}
               />
            </button>
         </div>

         {/* Content */}
         <div className="p-5">
            {active === "parameters" ? (
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <BoolRow label="Last Financial Data Available" value={shariah.lastFinancialData} remark={remarkMap.get("last_financial_data")} />
                  <BoolRow label="Primary Business Compliant" value={shariah.primaryBusiness} remark={remarkMap.get("primary_business")} />
                  <BoolRow label="Secondary Business Compliant" value={shariah.secondaryBusiness} remark={remarkMap.get("secondary_business")} />
                  <BoolRow label="Compliant on Investment" value={shariah.compliantOnInvestment} remark={remarkMap.get("compliant_on_investment")} />
                  <BoolRow label="Sufficient Financial Information" value={shariah.sufficientFinancialInfo} remark={remarkMap.get("financial_information")} />
               </div>
            ) : (
               <div>
                  <RatioRow
                     label="Total Debt / Total Asset"
                     value={shariah.totalDebtTotalAssetValue}
                     status={shariah.totalDebtTotalAssetStatus}
                  />
                  <RatioRow
                     label="Total Interest Income / Total Income"
                     value={shariah.totalInterestIncomeTotalIncomeValue}
                     status={shariah.totalInterestIncomeTotalIncomeStatus}
                  />
                  <RatioRow
                     label="Cash + Bank + Receivables / Total Asset"
                     value={shariah.cashBankReceivablesTotalAssetValue}
                     status={shariah.cashBankReceivablesTotalAssetStatus}
                  />
                  {remarkMap.get("last_financial_data")}
               </div>
            )}
         </div>
      </div>
   )
}

// ─── Recently viewed ──────────────────────────────────────────────────────────

function fmtLastViewed(dateStr: string): string {
   const today = new Date().toISOString().slice(0, 10)
   const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
   if (dateStr === today) return "Today"
   if (dateStr === yesterday) return "Yesterday"
   return fmtDateStr(dateStr)
}

function RecentlyViewedSection({
   items,
   onSelect,
}: {
   items: RecentlyViewedCompany[]
   onSelect: (c: CompanySearchResult) => void
}) {
   if (items.length === 0) return null
   return (
      <div className="flex flex-col gap-2">
         <p className="text-xs font-medium text-muted-foreground">Recently Viewed</p>
         <div className="flex flex-wrap gap-2">
            {items.map((c) => (
               <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="flex flex-col items-start rounded-lg border bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60 hover:border-border"
               >
                  <span className="max-w-48 truncate text-sm font-medium leading-tight">{c.companyName}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtLastViewed(c.lastViewed)}</span>
               </button>
            ))}
         </div>
      </div>
   )
}

// ─── Search dropdown ───────────────────────────────────────────────────────────

function SearchDropdown({
   results,
   onSelect,
}: {
   results: CompanySearchResult[]
   onSelect: (c: CompanySearchResult) => void
}) {
   if (results.length === 0) return null
   return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover shadow-lg">
         {results.map((c) => (
            <button
               key={c.id}
               className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm hover:bg-muted/60 transition-colors"
               onClick={() => onSelect(c)}
            >
               <span className="font-medium">{c.companyName}</span>
               <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{c.prowessId}</span>
                  {c.isinCode && <span>{c.isinCode}</span>}
                  {c.nseSymbol && <span>NSE: {c.nseSymbol}</span>}
               </div>
            </button>
         ))}
      </div>
   )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SnapshotClient({ access }: { access: SnapshotAccess }) {
   const [query, setQuery] = React.useState("")
   const [searchResults, setSearchResults] = React.useState<CompanySearchResult[]>([])
   const [isSearching, setIsSearching] = React.useState(false)
   const [showDropdown, setShowDropdown] = React.useState(false)
   const [selectedCompany, setSelectedCompany] = React.useState<CompanySearchResult | null>(null)
   const [snapshotData, setSnapshotData] = React.useState<SnapshotSuccess | null>(null)
   const [isLoading, setIsLoading] = React.useState(false)
   const [recentlyViewed, setRecentlyViewed] = React.useState<RecentlyViewedCompany[]>([])
   const [quota, setQuota] = React.useState({
      dailyUsed: access.dailyUsed,
      dailyLimit: access.stocksPerDay,
      totalUsed: access.totalUsed,
      totalLimit: access.stocksInDuration,
   })

   const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
   const containerRef = React.useRef<HTMLDivElement>(null)

   // Load recently viewed on mount
   React.useEffect(() => {
      getRecentlyViewed().then(setRecentlyViewed)
   }, [])

   // Close dropdown on outside click
   React.useEffect(() => {
      function handleClick(e: MouseEvent) {
         if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setShowDropdown(false)
         }
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
   }, [])

   function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
      const val = e.target.value
      setQuery(val)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (val.trim().length < 2) {
         setSearchResults([])
         setShowDropdown(false)
         return
      }

      debounceRef.current = setTimeout(async () => {
         setIsSearching(true)
         try {
            const results = await searchCompanies(val.trim())
            setSearchResults(results)
            setShowDropdown(results.length > 0)
         } finally {
            setIsSearching(false)
         }
      }, 300)
   }

   async function handleSelectCompany(company: CompanySearchResult) {
      setSelectedCompany(company)
      setQuery(company.companyName)
      setShowDropdown(false)
      setSearchResults([])
      setSnapshotData(null)
      setIsLoading(true)

      try {
         const result = await getCompanySnapshot(company.id)

         if ("error" in result) {
            if (result.error === "daily_quota_exceeded") {
               toast.error("Daily quota reached. You've viewed the maximum companies for today.")
               if ("quota" in result) setQuota(result.quota)
            } else if (result.error === "total_quota_exceeded") {
               toast.error("Subscription quota reached. You've viewed the maximum companies for this subscription.")
               if ("quota" in result) setQuota(result.quota)
            } else {
               toast.error("Failed to load snapshot.")
            }
            return
         }

         setSnapshotData(result)
         setQuota(result.quota)
         getRecentlyViewed().then(setRecentlyViewed)
      } finally {
         setIsLoading(false)
      }
   }

   return (
      <div className="flex flex-col gap-5 p-6">
         <p className="text-sm text-muted-foreground">
            Search for a company to view its TASIS shariah screening snapshot.
            Plan: <span className="font-medium text-foreground">{access.planName}</span>
         </p>

         {/* Search */}
         <div ref={containerRef} className="relative max-w-xl">
            <div className="relative">
               <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               {isSearching && (
                  <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2" />
               )}
               <Input
                  placeholder="Search by company name, ISIN, Prowess ID, or NSE symbol…"
                  value={query}
                  onChange={handleQueryChange}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  className="pl-9 pr-9"
               />
            </div>
            {showDropdown && (
               <SearchDropdown results={searchResults} onSelect={handleSelectCompany} />
            )}
         </div>

         {/* Recently viewed — shown when not loading and no snapshot selected */}
         {!isLoading && !snapshotData && (
            <RecentlyViewedSection items={recentlyViewed} onSelect={handleSelectCompany} />
         )}

         {/* Loading */}
         {isLoading && (
            <div className="flex items-center justify-center py-16">
               <Spinner className="size-6" />
            </div>
         )}

         {/* Snapshot */}
         {!isLoading && snapshotData && <SnapshotCard data={snapshotData} />}

         {/* Empty state — only when no recently viewed and no snapshot */}
         {!isLoading && !snapshotData && recentlyViewed.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
               <SearchIcon className="mb-3 size-8 text-muted-foreground/40" />
               <p className="text-sm text-muted-foreground">Search for a company above to view its shariah snapshot.</p>
               <div className="mt-4">
                  <QuotaBar
                     dailyUsed={quota.dailyUsed}
                     dailyLimit={quota.dailyLimit}
                     totalUsed={quota.totalUsed}
                     totalLimit={quota.totalLimit}
                  />
               </div>
            </div>
         )}
      </div>
   )
}
