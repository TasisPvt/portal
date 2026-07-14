"use client"

import * as React from "react"
import { toast } from "sonner"
import {
   SearchIcon,
   CheckCircle2Icon,
   XCircleIcon,
   MinusCircleIcon,
   ChevronRightIcon,
   Info,
   ShieldCheckIcon,
   ShieldXIcon,
   ClockIcon,
   BookmarkIcon,
} from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { Progress } from "@/src/components/ui/progress"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
} from "@/src/components/ui/empty"
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import Image from "next/image"
import { cn } from "@/src/lib/utils"
import { formatDateStr as fmtDateStr, formatMonth as fmtMonthStr } from "@/src/lib/format"
import {
   searchCompanies,
   getCompanySnapshot,
   getRecentlyViewed,
   type SnapshotAccess,
   type CompanySearchResult,
   type CompanySnapshotResult,
   type RecentlyViewedCompany,
} from "../_actions"
import { toggleWatchlist, getWatchlistedCompanyIds } from "../../watchlist/_actions"
import { WATCHLIST_LIMIT } from "@/src/lib/constants"
import { Button } from "@/src/components/ui/button"
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from "@/src/components/ui/sheet"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<number, string> = {
   1: "Shariah Compliant",
   2: "Primary Business Non-compliant",
   3: "Secondary Business Non-compliant",
   4: "Financial Ratio/s Non compliant",
   5: "Failed on Investment",
   6: "Incomplete/Old Data",
   7: "Incomplete Business Information",
   8: "Shariah Status on Hold",
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

const BUSINESS_PARAMS = [
   "last_financial_data",
   "incomplete_business_information",
   "primary_business",
   "secondary_business",
   "compliant_on_investment",
]
type TabKey = "business" | "financials" | "historical" | "legends" | "disclaimer"
const TABS: { key: TabKey; label: string }[] = [
   { key: "business", label: "Business & Data" },
   { key: "financials", label: "Financials" },
   { key: "historical", label: "Historical" },
   { key: "legends", label: "Legends" },
   { key: "disclaimer", label: "Disclaimer" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMarketCapRaw(val: string | null | undefined): string {
   if (!val) return "—"
   const n = parseFloat(val)
   if (isNaN(n)) return "—"
   return `₹${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

// ─── CompactQuotaBar (inline with search bar) ─────────────────────────────────

function CompactQuotaBar({
   dailyUsed,
   dailyLimit,
}: {
   dailyUsed: number
   dailyLimit: number | null
}) {
   const dailyPct = dailyLimit ? Math.min(dailyUsed / dailyLimit, 1) : null
   const barColor = (pct: number) =>
      pct >= 0.9 ? "bg-red-500" : pct >= 0.7 ? "bg-amber-500" : "bg-emerald-500"

   return (
      <div className="hidden @2xl/main:flex items-center gap-2 shrink-0">
         {[
            { label: "Today", used: dailyUsed, limit: dailyLimit, pct: dailyPct },
         ].map(({ label, used, limit, pct }) => (
            <div key={label} className="flex min-w-20 flex-col gap-1 rounded-xl border bg-card px-3 py-2">
               <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
                  <span className="font-bold tabular-nums text-foreground">
                     {used}{limit !== null ? `/${limit}` : ""}
                  </span>
               </div>
               <Progress
                  value={pct !== null ? pct * 100 : 0}
                  className="h-0.5"
                  indicatorClassName={pct !== null ? barColor(pct) : undefined}
               />
            </div>
         ))}
      </div>
   )
}

// ─── FullQuotaBar (mobile fallback) ───────────────────────────────────────────

function FullQuotaBar({
   dailyUsed,
   dailyLimit,
}: {
   dailyUsed: number
   dailyLimit: number | null
}) {
   const dailyPct = dailyLimit ? Math.min(dailyUsed / dailyLimit, 1) : null
   const barColor = (pct: number) =>
      pct >= 0.9 ? "bg-red-500" : pct >= 0.7 ? "bg-amber-500" : "bg-emerald-500"

   return (
      <div className="flex @2xl/main:hidden flex-wrap items-center gap-6 rounded-xl border bg-muted/20 px-4 py-2">
         <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Usage</span>
         <div className="flex flex-wrap gap-5">
            {[
               { label: "Today", used: dailyUsed, limit: dailyLimit, pct: dailyPct },
            ].map(({ label, used, limit, pct }) => (
               <div key={label} className="flex min-w-24 flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                     <span className="text-muted-foreground">{label}</span>
                     <span className="font-semibold tabular-nums text-foreground">
                        {used}{limit !== null ? `/${limit}` : ""}
                     </span>
                  </div>
                  {pct !== null && (
                     <Progress value={pct * 100} className="h-1" indicatorClassName={barColor(pct)} />
                  )}
               </div>
            ))}
         </div>
      </div>
   )
}

// ─── Compliance History ────────────────────────────────────────────────────────

function ComplianceHistory({ history }: { history: { month: string; shariahStatus: number | null }[] }) {
   if (history.length === 0) {
      return <p className="text-sm italic text-muted-foreground">No historical data available.</p>
   }
   const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month))
   return (
      <div className="flex flex-wrap gap-2.5">
         {sorted.map(({ month, shariahStatus }) => {
            const color = shariahStatus ? STATUS_COLORS[shariahStatus] : "#e5e7eb"
            const label = shariahStatus ? STATUS_LABELS[shariahStatus] : "No data"
            return (
               <div key={month} className="flex flex-col items-center gap-1" title={`${fmtMonthStr(month)}: ${label}`}>
                  <div className="size-9 rounded-md border border-black/10 shadow-sm" style={{ backgroundColor: color }} />
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">{fmtMonthStr(month)}</span>
               </div>
            )
         })}
      </div>
   )
}

// ─── Remark Panel ─────────────────────────────────────────────────────────────

type ScreeningRemark = SnapshotSuccess["screeningRemarks"][number]

function RemarkPanel({ remark }: { remark: ScreeningRemark | null | undefined }) {
   const activeRemark =
      remark?.value === true
         ? remark.passRemark?.replaceAll("<p></p>", "<br/>")
         : remark?.value === false
            ? remark.failRemark?.replaceAll("<p></p>", "<br/>")
            : null

   return (
      <div className="rounded-2xl border bg-card p-5 c-box-shadow">
         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Remarks</p>
         {remark ? (
            <div className="flex flex-col gap-4">
               <p className="text-sm font-semibold text-foreground">{remark.label}</p>
               {activeRemark ? (
                  <div
                     className={cn(
                        "flex items-start gap-3 rounded-xl p-3",
                        remark.value === true
                           ? "bg-emerald-50 dark:bg-emerald-950/20"
                           : "bg-red-50 dark:bg-red-950/20",
                     )}
                  >
                     {remark.value === true ? (
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                     ) : (
                        <XCircleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
                     )}
                     <div
                        className="text-sm leading-relaxed text-muted-foreground [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: activeRemark }}
                     />
                  </div>
               ) : (
                  <p className="text-sm text-muted-foreground">No remarks available for this parameter.</p>
               )}
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
               <ChevronRightIcon className="mb-2 size-6 opacity-30" />
               <p className="text-sm">Select a parameter on the left to view its explanation.</p>
            </div>
         )}
      </div>
   )
}

// ─── Quantitative Ratios Panel ────────────────────────────────────────────────

type ShariahData = NonNullable<SnapshotSuccess["shariah"]>

function RatioChart({
   label,
   value,
   status,
   threshold,
}: {
   label: string
   value: string | null
   status: boolean | null
   threshold: number // 0–1 decimal stored in DB
}) {
   const numericValue = value !== null ? parseFloat(value) : null
   const thresholdPct = threshold * 100
   const isNull = status === null
   const isPass = status === true
   const hasValue = numericValue !== null
   const isOver = hasValue && numericValue! > thresholdPct
   const hasNegative = hasValue && numericValue! < 0

   const fmtPct = (n: number) =>
      n % 1 === 0 ? `${n.toFixed(0)}%` : `${n.toFixed(2)}%`

   // Threshold-relative axis: axisMin drops below 0 for negative values (0 marked
   // in between); axisMax extends to the value when it exceeds the threshold,
   // otherwise the threshold stays the right edge.
   const axisMin = hasValue ? Math.min(0, numericValue!) : 0
   const axisMax = hasValue ? Math.max(thresholdPct, numericValue!) : thresholdPct
   const axisRange = axisMax - axisMin || 1
   const toPos = (x: number) => ((x - axisMin) / axisRange) * 100

   const zeroPos = toPos(0)
   const valuePos = hasValue ? toPos(numericValue!) : 0
   const thresholdPos = toPos(thresholdPct)

   const barLeft = Math.min(zeroPos, valuePos)
   const barWidth = Math.abs(valuePos - zeroPos)
   const showThresholdLine = isOver && thresholdPos > 0 && thresholdPos < 100

   const limitLabelStyle: React.CSSProperties =
      thresholdPos >= 88
         ? { right: `${Math.max(0, 100 - thresholdPos)}%` }
         : thresholdPos <= 12
            ? { left: `${thresholdPos}%` }
            : { left: `${thresholdPos}%`, transform: "translateX(-50%)" }

   return (
      <div className="@container/bar flex flex-col gap-2">
         {/* Header: status pill (left) + centered title */}
         <div className="relative flex min-h-6 flex-wrap items-center justify-center gap-2">
            {!isNull && (
               <span
                  className={cn(
                     "static rounded-full px-2.5 py-0.5 text-[10px] font-semibold @sm/bar:absolute @sm/bar:left-0",
                     isPass
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                  )}
               >
                  {isPass
                     ? `Compliant — at or below ${fmtPct(thresholdPct)}`
                     : `Non-compliant — exceeds ${fmtPct(thresholdPct)}`}
               </span>
            )}
            <h4 className="text-center text-sm font-semibold text-blue-700 dark:text-blue-400">
               {label}
            </h4>
         </div>

         {/* Card: icon + value (left) · 0–100% scale bar (right) */}
         <div className="flex flex-col @sm/bar:flex-row items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 shadow-sm">
            {/* Left: icon + value + limit status */}
            <div className="flex w-44 shrink-0 items-center gap-3">
               <div
                  className={cn(
                     "flex size-11 shrink-0 items-center justify-center rounded-full",
                     isNull
                        ? "bg-muted"
                        : isPass
                           ? "bg-emerald-100 dark:bg-emerald-950/40"
                           : "bg-red-100 dark:bg-red-950/40",
                  )}
               >
                  {isNull ? (
                     <MinusCircleIcon className="size-5 text-muted-foreground" />
                  ) : isPass ? (
                     <ShieldCheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                     <ShieldXIcon className="size-6 text-red-600 dark:text-red-400" />
                  )}
               </div>
               <div className="flex min-w-0 flex-col leading-tight">
                  <span
                     className={cn(
                        "text-xl font-bold tabular-nums",
                        isNull
                           ? "text-foreground"
                           : isPass
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                     )}
                  >
                     {hasValue ? `${numericValue!.toFixed(2)}%` : "—"}
                  </span>
                  {!isNull && (
                     <span
                        className={cn(
                           "text-[10px] font-semibold uppercase leading-tight tracking-wide",
                           isPass
                              ? "text-emerald-600/80 dark:text-emerald-400/70"
                              : "text-red-600/80 dark:text-red-400/70",
                        )}
                     >
                        {isPass ? "Within limit" : "Exceeds limit"}
                        <br />
                        of {fmtPct(thresholdPct)}
                     </span>
                  )}
               </div>
            </div>

            {/* Right: threshold-relative scale bar */}
            <div className="min-w-0 w-full @sm/bar:w-auto @sm/bar:flex-1">
               {(isOver || hasNegative) && (
                  <div
                     className={cn(
                        "mb-1 flex text-[10px] leading-none",
                        hasNegative ? "justify-start" : "justify-end",
                     )}
                  >
                     <span
                        className={cn(
                           "font-semibold tabular-nums",
                           isPass
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                        )}
                     >
                        {numericValue!.toFixed(2)}%
                     </span>
                  </div>
               )}
               {/* Track */}
               <div className="relative h-4 rounded-full overflow-hidden">
                  {/* Tinted background — gives context for tiny values */}
                  <div
                     className={cn(
                        "absolute inset-0",
                        isNull
                           ? "bg-muted"
                           : isPass
                              ? "bg-emerald-100 dark:bg-emerald-950/30"
                              : "bg-red-100 dark:bg-red-950/30",
                     )}
                  />
                  {/* Value bar — runs between the 0 baseline and the value */}
                  <div
                     className={cn(
                        "absolute inset-y-0 rounded-full transition-all duration-700",
                        isNull
                           ? "bg-muted-foreground/30"
                           : isPass
                              ? "bg-emerald-500"
                              : "bg-red-500",
                     )}
                     style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                  />
                  {/* Zero marker — shown when the axis extends into negative values */}
                  {hasNegative && (
                     <div
                        className="absolute inset-y-0 w-[2px] bg-foreground/50 z-10"
                        style={{ left: `calc(${zeroPos}% - 1px)` }}
                     />
                  )}
                  {/* Threshold line — only when value exceeds threshold */}
                  {showThresholdLine && (
                     <div
                        className="absolute inset-y-0 w-[2px] bg-white/80 z-10"
                        style={{ left: `calc(${thresholdPos}% - 1px)` }}
                     />
                  )}
               </div>

               <div className="relative mt-1.5 h-3.5 text-[10px] text-muted-foreground">
                  {hasNegative ? (
                     <span
                        className="absolute -translate-x-1/2 font-medium"
                        style={{ left: `${zeroPos}%` }}
                     >
                        0%
                     </span>
                  ) : (
                     <span className="absolute left-0 font-medium">0%</span>
                  )}
                  <span className="absolute whitespace-nowrap font-medium" style={limitLabelStyle}>
                     Limit: {fmtPct(thresholdPct)}
                  </span>
               </div>
            </div>
         </div>
      </div>
   )
}

function QuantitativeRatiosPanel({
   shariah,
   thresholds,
}: {
   shariah: ShariahData
   thresholds: Record<string, number>
}) {
   const ratioData = [
      {
         label: "Total Debt / Total Asset",
         parameter: "total_debt_total_asset",
         value: shariah.totalDebtTotalAssetValue,
         status: shariah.totalDebtTotalAssetStatus,
      },
      {
         label: "Total Interest Income / Total Income",
         parameter: "total_interest_income_total_income",
         value: shariah.totalInterestIncomeTotalIncomeValue,
         status: shariah.totalInterestIncomeTotalIncomeStatus,
      },
      {
         label: "Cash + Bank + Receivables / Total Asset",
         parameter: "cash_bank_receivables_total_asset",
         value: shariah.cashBankReceivablesTotalAssetValue,
         status: shariah.cashBankReceivablesTotalAssetStatus,
      },
   ]

   return (
      <div className="rounded-2xl border bg-card p-5 c-box-shadow">
         <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            Quantitative Parameters
         </p>
         <div className="flex flex-col gap-8">
            {ratioData.map(({ label, parameter, value, status }) => (
               <RatioChart
                  key={parameter}
                  label={label}
                  value={value}
                  status={status}
                  threshold={thresholds[parameter] ?? 0.33}
               />
            ))}
         </div>
      </div>
   )
}

// ─── Main Snapshot Card ────────────────────────────────────────────────────────

export type SnapshotSuccess = Extract<CompanySnapshotResult, { company: unknown }>

export function SnapshotCard({ data, commonRemark, thresholds, watchlist }: { data: SnapshotSuccess; commonRemark: string | null; thresholds: Record<string, number>; watchlist?: { active: boolean; pending: boolean; onToggle: () => void } }) {
   const { company, shariah, complianceHistory, screeningRemarks, quota } = data

   const [activeTab, setActiveTab] = React.useState<TabKey>("business")
   const [selectedParam, setSelectedParam] = React.useState<string | null>("last_financial_data")

   const businessRemarks = screeningRemarks.filter((r) => BUSINESS_PARAMS.includes(r.parameter))

   const hasFinancials = !!shariah &&
      businessRemarks.length > 0 &&
      businessRemarks.every((r) => r.value === true)
   const visibleTabs = TABS.filter((t) => t.key !== "financials" || hasFinancials)
   const effectiveTab: TabKey = activeTab === "financials" && !hasFinancials ? "business" : activeTab
   const selectedRemark = screeningRemarks.find((r) => r.parameter === selectedParam) ?? null

   const isCompliant = shariah?.shariahStatus === 1

   const snapshotDate = shariah?.lastUpdatedAt
      ? shariah.lastUpdatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—"

   function handleTabChange(tab: TabKey) {
      setActiveTab(tab)
      setSelectedParam(tab === "business" ? "last_financial_data" : null)
   }

   return (
      <div className="flex flex-col gap-4">

         {/* ── Dark Navy Header ── */}
         <div
            style={{
               background: "linear-gradient(160deg, #0d1f3c 0%, #1a3a6e 100%)"
            }}
            className="overflow-hidden rounded-2xl shadow-lg"
         >
            {/* Company name + codes */}
            <div className="px-6 py-6">
               <div className="flex flex-col justify-between @2xl/main:flex-row @2xl/main:items-start">
                  <h2 className="text-2xl font-bold text-white sm:text-3xl">{company.companyName}</h2>
                  <div className="flex items-center gap-2 self-start">
                     {watchlist && (
                        <button
                           type="button"
                           onClick={watchlist.onToggle}
                           disabled={watchlist.pending}
                           aria-pressed={watchlist.active}
                           aria-label={watchlist.active ? "Remove from watchlist" : "Add to watchlist"}
                           title={watchlist.active ? "Remove from watchlist" : "Add to watchlist"}
                           className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                        >
                           <BookmarkIcon className={cn("size-4", watchlist.active && "fill-current")} />
                        </button>
                     )}
                     <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                        <span className="text-sm font-medium text-white">Updated • {snapshotDate}</span>
                     </div>
                  </div>
               </div>
               <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  {company.nseSymbol && (
                     <span className="text-blue-100">
                        <span className="text-blue-400/80">NSE Symbol</span>{" "}
                        <span className="font-semibold">{company.nseSymbol}</span>
                     </span>
                  )}
                  {company.bseScripCode && (
                     <span className="text-blue-100">
                        <span className="text-blue-400/80">BSE Scrip ID</span>{" "}
                        <span className="font-semibold">{company.bseScripCode}</span>
                     </span>
                  )}
                  {company.isinCode && (
                     <span className="text-blue-100">
                        <span className="text-blue-400/80">ISIN Code</span>{" "}
                        <span className="font-semibold">{company.isinCode}</span>
                     </span>
                  )}
               </div>
            </div>

            {/* Data columns */}
            {shariah && (
               <div className="grid grid-cols-2 border-t border-white/10 @4xl/main:grid-cols-4">
                  {[
                     { label: "Industry", value: company.industryGroup, sub: null },
                     {
                        label: "Market Cap. (in Millions)",
                        value: fmtMarketCapRaw(shariah.marketCap),
                     },
                     {
                        label: "Annual Report",
                        value: fmtDateStr(shariah.assessmentYear),
                        sub: null,
                     },
                     {
                        label: "Reporting Basis",
                        value: shariah.companyStatus ?? "—",
                        sub: null,
                     },
                  ].map(({ label, value, sub }) => (
                     <div key={label} className="flex flex-col gap-0.5 px-5 py-4 border-b border-r border-white/10 [&:nth-child(2n)]:border-r-0 last:border-r-0 @2xl/main:[&:nth-child(2n)]:border-r  @4xl/main:[&:nth-child(3n)]:border-r @4xl/main:border-b-0">
                        <span className="text-xs font-semibold uppercase tracking-widest text-blue-300/60">
                           {label}
                        </span>
                        <span className="mt-1 text-sm font-bold text-white">
                           {value ?? "—"}
                        </span>
                        {sub && (
                           <span className="text-[10px] text-blue-300/50">{sub}</span>
                        )}
                     </div>
                  ))}
               </div>
            )}
         </div>

         {/* ── Compliance Verdict ── */}
         {shariah && (
            <div className="rounded-2xl border bg-card p-5 c-box-shadow">
               <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                     <Image
                        src={
                           shariah.shariahStatus === 1
                              ? "/assets/images/compliantStamp.webp"
                              : "/assets/images/nonCompliantStamp.webp"
                        }
                        height={80}
                        width={80}
                        alt="compliance stamp"
                        className="shrink-0"
                     />
                     <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Compliance Verdict
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                           <p
                              className="text-xl font-bold sm:text-2xl"
                              style={{ color: isCompliant ? "#16a34a" : "#dc2626" }}
                           >
                              Shariah {isCompliant ? "Compliant" : "Non-Compliant"}
                           </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                           {shariah.shariahStatus && shariah.shariahStatus !== 1 ? STATUS_LABELS[shariah.shariahStatus] : null}
                        </p>
                     </div>
                  </div>

               </div>
            </div>
         )}

         {shariah ? (
            <>
               {/* ── Tabs ── */}
               <div className="flex overflow-x-auto border-b">
                  {visibleTabs.map((tab) => (
                     <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={cn(
                           "shrink-0 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
                           effectiveTab === tab.key
                              ? "border-b-2 border-foreground text-foreground"
                              : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
                        )}
                     >
                        {tab.label}
                     </button>
                  ))}
               </div>

               {/* ── Tab Content ── */}

               {/* Business & Data */}
               {effectiveTab === "business" && (
                  <div className="grid grid-cols-1 gap-4 @2xl/main:grid-cols-2">
                     {/* Left: Qualitative Parameters */}
                     <div className="rounded-2xl border bg-card p-5 c-box-shadow">
                        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Qualitative Parameters
                        </p>
                        <div className="flex flex-col space-y-2">
                           {businessRemarks.map((r) => {
                              const isInactive = r.value === null
                              return (
                                 <button
                                    key={r.parameter}
                                    onClick={() => {
                                       if (isInactive) return
                                       setSelectedParam(r.parameter)
                                    }}
                                    disabled={isInactive}
                                    className={cn(
                                       "flex items-center gap-3 rounded-xl px-3 py-3 bg-muted/40 text-left transition-colors border border-transparent",
                                       isInactive
                                          ? "cursor-not-allowed opacity-40"
                                          : "hover:bg-muted",
                                       selectedParam === r.parameter && !isInactive && "border-foreground/20 bg-muted/60",
                                    )}
                                 >
                                    <div
                                       className={cn(
                                          "flex size-7 shrink-0 items-center justify-center rounded-full",
                                          r.value === true
                                             ? "bg-emerald-600"
                                             : r.value === false
                                                ? "bg-red-500"
                                                : "bg-muted",
                                       )}
                                    >
                                       {r.value === true ? (
                                          <CheckCircle2Icon className="size-4 text-white" />
                                       ) : r.value === false ? (
                                          <XCircleIcon className="size-4 text-white" />
                                       ) : (
                                          <MinusCircleIcon className="size-4 text-muted-foreground" />
                                       )}
                                    </div>
                                    <span className="flex-1 text-sm font-medium leading-tight">{r.label}</span>
                                    {!isInactive && (
                                       <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/40" />
                                    )}
                                 </button>
                              )
                           })}
                        </div>
                     </div>

                     {/* Right: Remark panel */}
                     <RemarkPanel remark={selectedRemark} />
                  </div>
               )}

               {/* Financials */}
               {effectiveTab === "financials" && (
                  <div className="">
                     <QuantitativeRatiosPanel shariah={shariah} thresholds={thresholds} />
                  </div>
               )}

               {/* Historical */}
               {effectiveTab === "historical" && (
                  <div className="rounded-2xl border bg-card p-5 c-box-shadow">
                     <div className="mb-4 flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                           Last 12 Months
                        </p>
                     </div>
                     <ComplianceHistory history={complianceHistory} />
                  </div>
               )}

               {/* Legends */}
               {effectiveTab === "legends" && (
                  <div className="rounded-2xl border bg-card p-5 c-box-shadow">
                     <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Status Color Legend
                     </p>
                     <div className="flex flex-col gap-3">
                        {Object.entries(STATUS_COLORS).map(([s, c]) => (
                           <div key={s} className="flex items-center gap-3">
                              <div
                                 className="size-5 shrink-0 rounded border border-black/10"
                                 style={{ backgroundColor: c }}
                              />
                              <span className="text-sm">{STATUS_LABELS[Number(s)]}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Disclaimer */}
               {effectiveTab === "disclaimer" && (
                  <div className="rounded-2xl border bg-card p-5 c-box-shadow">
                     <div className="flex flex-col gap-3">
                        <p className="text-sm leading-relaxed text-muted-foreground">
                           TASIS acts as a Shariah advisor, conducting screening of companies based on established
                           Shariah principles and a defined methodology. This includes periodic review of business
                           activities, financials, investments, and publicly available information.
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                           The Shariah status assigned reflects a professional opinion based on information available
                           at the time. While due care is taken through both automated and manual processes, errors,
                           omissions, or changes in company data may occur.
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                           TASIS does not guarantee that its opinion will be universally accepted, as interpretations
                           may differ among Shariah scholars and investors. Users are encouraged to seek clarification
                           where required.
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                           TASIS and its Shariah advisors shall not be held liable for any losses arising from reliance
                           on the screening results.
                        </p>
                     </div>
                  </div>
               )}

               {/* Important Note */}
               <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                     Important Note from TASIS Shariah Board
                  </h3>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-sm leading-relaxed text-muted-foreground">
                        It is important to note that{" "}
                        <strong>
                           Shariah scholars globally allow investment in companies with a small amount of interest
                           income
                        </strong>
                        .
                     </p>
                     <p className="text-sm leading-relaxed text-muted-foreground">
                        However, investors must{" "}
                        <strong>identify this portion and donate it to charity (purification)</strong>.
                     </p>
                     <p className="text-sm leading-relaxed text-muted-foreground">
                        If this is not done, the{" "}
                        <strong>
                           investment and its returns shall be considered non-compliant for the investor concerned
                        </strong>
                        .
                     </p>
                  </div>
               </div>
            </>
         ) : (
            <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
               No shariah data available for this company.
            </div>
         )}
      </div>
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
   onSelect: (c: CompanySearchResult) => void
}) {
   const [open, setOpen] = React.useState(false)
   // Cap the sheet at the 10 most recently viewed stocks.
   const recent = items.slice(0, 10)
   if (recent.length === 0) return null

   return (
      <Sheet open={open} onOpenChange={setOpen}>
         <SheetTrigger asChild>
            <Button
               variant="outline"
               size="icon"
               className="relative text-muted-foreground"
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

// ─── Search Dropdown ───────────────────────────────────────────────────────────

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
               className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60"
               onClick={() => onSelect(c)}
            >
               <span className="font-medium">{c.companyName}</span>
               <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {c.isinCode && <span>ISIN Code: {c.isinCode}</span>}
                  {c.nseSymbol && <span>NSE Symbol: {c.nseSymbol}</span>}
               </div>
            </button>
         ))}
      </div>
   )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SnapshotClient({ access, commonRemark, thresholds, initialCompanyId }: { access: SnapshotAccess; commonRemark: string | null; thresholds: Record<string, number>; initialCompanyId?: string }) {
   const [query, setQuery] = React.useState("")
   const [searchResults, setSearchResults] = React.useState<CompanySearchResult[]>([])
   const [isSearching, setIsSearching] = React.useState(false)
   const [showDropdown, setShowDropdown] = React.useState(false)
   const [snapshotData, setSnapshotData] = React.useState<SnapshotSuccess | null>(null)
   const [isLoading, setIsLoading] = React.useState(false)
   const [recentlyViewed, setRecentlyViewed] = React.useState<RecentlyViewedCompany[]>([])
   const [quota, setQuota] = React.useState({
      dailyUsed: access.dailyUsed,
      dailyLimit: access.stocksPerDay,
   })
   const [watchlistedIds, setWatchlistedIds] = React.useState<Set<string>>(new Set())
   const [togglingWatchlist, setTogglingWatchlist] = React.useState(false)

   const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
   const containerRef = React.useRef<HTMLDivElement>(null)

   React.useEffect(() => {
      getRecentlyViewed().then(setRecentlyViewed)
      getWatchlistedCompanyIds().then((ids) => setWatchlistedIds(new Set(ids)))
   }, [])

   // Deep-link: open a specific company on mount (e.g. from the watchlist).
   React.useEffect(() => {
      if (initialCompanyId) loadCompanyById(initialCompanyId)
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [initialCompanyId])

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

   async function loadCompanyById(companyId: string) {
      setSnapshotData(null)
      setIsLoading(true)
      try {
         const result = await getCompanySnapshot(companyId)
         if ("error" in result) {
            if (result.error === "daily_quota_exceeded") {
               toast.error("Daily quota reached. You've viewed the maximum companies for today.")
               if ("quota" in result) setQuota(result.quota)
            } else {
               toast.error("Failed to load snapshot.")
            }
            return
         }
         setSnapshotData(result)
         setQuota(result.quota)
         setQuery(result.company.companyName)
         getRecentlyViewed().then(setRecentlyViewed)
      } finally {
         setIsLoading(false)
      }
   }

   async function handleSelectCompany(company: CompanySearchResult) {
      setQuery(company.companyName)
      setShowDropdown(false)
      setSearchResults([])
      await loadCompanyById(company.id)
   }

   // Toggle the currently-shown company in the watchlist (optimistic).
   async function handleToggleWatchlist() {
      if (!snapshotData) return
      const id = snapshotData.company.id
      const wasActive = watchlistedIds.has(id)
      setTogglingWatchlist(true)
      setWatchlistedIds((prev) => {
         const next = new Set(prev)
         if (wasActive) next.delete(id)
         else next.add(id)
         return next
      })
      const res = await toggleWatchlist(id)
      setTogglingWatchlist(false)
      if (!res.ok) {
         // revert
         setWatchlistedIds((prev) => {
            const next = new Set(prev)
            if (wasActive) next.add(id)
            else next.delete(id)
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

   return (
      <div className="@container/main flex flex-col gap-4 p-6">

         {/* ── Search + Compact Quota (desktop inline) ── */}
         <div className="flex items-center gap-3">
            <div ref={containerRef} className="relative flex-1 max-w-full">
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

            {/* Compact quota pills — desktop only */}
            <CompactQuotaBar
               dailyUsed={quota.dailyUsed}
               dailyLimit={quota.dailyLimit}
            />

            {/* TASIS Note button */}
            {commonRemark && (
               <Dialog>
                  <DialogTrigger asChild>
                     <Button variant="outline" size="icon" className="text-muted-foreground">
                        <Info className="size-3.5 text-foreground" />
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[85vh] w-[90vw] sm:max-w-3xl flex-col">
                     <DialogHeader className="shrink-0">
                        <DialogTitle>TASIS Methodology Note</DialogTitle>
                     </DialogHeader>
                     <div className="min-h-0 flex-1 overflow-y-auto">
                        <div
                           className="prose prose-sm max-w-none text-sm text-muted-foreground [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
                           dangerouslySetInnerHTML={{ __html: commonRemark.replaceAll("<p></p>", "<br/>") }}
                        />
                     </div>
                  </DialogContent>
               </Dialog>
            )}

            {/* Recently viewed — opens a sheet */}
            <RecentlyViewedSection items={recentlyViewed} onSelect={handleSelectCompany} />
         </div>

         {/* Mobile quota bar */}
         <FullQuotaBar
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
         />

         {/* Empty state */}
         {recentlyViewed.length === 0 && (
            <Empty className="border py-20">
               <EmptyHeader>
                  <EmptyMedia variant="icon">
                     <SearchIcon />
                  </EmptyMedia>
                  <EmptyTitle>Search for a company above</EmptyTitle>
                  <EmptyDescription>Enter a company name, ISIN, or exchange symbol</EmptyDescription>
               </EmptyHeader>
            </Empty>
         )}
         {/* </>
         )} */}

         {isLoading && (
            <div className="flex items-center justify-center py-16">
               <Spinner className="size-6" />
            </div>
         )}

         {!isLoading && snapshotData && (
            <SnapshotCard
               data={snapshotData}
               commonRemark={commonRemark}
               thresholds={thresholds}
               watchlist={{
                  active: watchlistedIds.has(snapshotData.company.id),
                  pending: togglingWatchlist,
                  onToggle: handleToggleWatchlist,
               }}
            />
         )}
      </div>
   )
}
