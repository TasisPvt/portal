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
   InfoIcon,
   BookOpenIcon,
} from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import Image from "next/image"
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

function SectionHeader({ children }: { children: React.ReactNode }) {
   return (
      <div className="px-5 py-2.5" style={{ background: "linear-gradient(to right, #0f2044, #1e3a6e)" }}>
         <h3 className="text-sm font-bold tracking-wide text-white">{children}</h3>
      </div>
   )
}

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
   const dailyPct = dailyLimit ? Math.min(dailyUsed / dailyLimit, 1) : null
   const totalPct = totalLimit ? Math.min(totalUsed / totalLimit, 1) : null
   const barColor = (pct: number) =>
      pct >= 0.9 ? "bg-red-500" : pct >= 0.7 ? "bg-amber-500" : "bg-emerald-500"

   return (
      <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-muted/20 px-4 py-2">
         <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Usage</span>
         <div className="flex flex-wrap gap-5">
            <div className="flex min-w-24 flex-col gap-1">
               <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">Today</span>
                  <span className="font-semibold tabular-nums text-foreground">
                     {dailyUsed}{dailyLimit !== null ? `/${dailyLimit}` : ""}
                  </span>
               </div>
               {dailyPct !== null && (
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                     <div
                        className={cn("h-full rounded-full transition-all duration-300", barColor(dailyPct))}
                        style={{ width: `${dailyPct * 100}%` }}
                     />
                  </div>
               )}
            </div>
            <div className="flex min-w-24 flex-col gap-1">
               <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums text-foreground">
                     {totalUsed}{totalLimit !== null ? `/${totalLimit}` : ""}
                  </span>
               </div>
               {totalPct !== null && (
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                     <div
                        className={cn("h-full rounded-full transition-all duration-300", barColor(totalPct))}
                        style={{ width: `${totalPct * 100}%` }}
                     />
                  </div>
               )}
            </div>
         </div>
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
         if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener("mousedown", handleOutside)
      document.addEventListener("touchstart", handleOutside)
      return () => {
         document.removeEventListener("mousedown", handleOutside)
         document.removeEventListener("touchstart", handleOutside)
      }
   }, [open])

   return (
      <div
         className={cn(
            "relative flex items-center justify-between gap-3 rounded-lg border-l-2 px-3 py-2.5",
            isNull
               ? "border-l-border bg-muted/20"
               : value
                  ? "border-l-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20"
                  : "border-l-red-400 bg-red-50/70 dark:bg-red-950/20",
         )}
      >
         <span
            className={cn(
               "text-sm leading-tight",
               isNull
                  ? "text-muted-foreground"
                  : value
                     ? "text-emerald-800 dark:text-emerald-200"
                     : "text-red-800 dark:text-red-200",
            )}
         >
            {label}
         </span>
         <div className="flex shrink-0 items-center gap-1">
            {remark && (
               <div ref={wrapRef} className="relative">
                  <button
                     type="button"
                     onClick={() => setOpen((v) => !v)}
                     className="flex size-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                     <HelpCircleIcon className="size-3.5" />
                  </button>
                  {open && (
                     <div
                        className="prose prose-xs absolute bottom-full right-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover px-3 py-2.5 text-xs leading-relaxed text-popover-foreground shadow-lg [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: remark }}
                     />
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
   remark,
}: {
   label: string
   value: string | null | undefined
   status: boolean | null | undefined
   remark?: string | null
}) {
   const isNull = status === null || status === undefined
   const [open, setOpen] = React.useState(false)
   const wrapRef = React.useRef<HTMLDivElement>(null)

   React.useEffect(() => {
      if (!open) return
      function handleOutside(e: MouseEvent | TouchEvent) {
         if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener("mousedown", handleOutside)
      document.addEventListener("touchstart", handleOutside)
      return () => {
         document.removeEventListener("mousedown", handleOutside)
         document.removeEventListener("touchstart", handleOutside)
      }
   }, [open])

   return (
      <div
         className={cn(
            "flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5",
            isNull
               ? "border-l-border bg-muted/10"
               : status
                  ? "border-l-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/15"
                  : "border-l-red-400 bg-red-50/50 dark:bg-red-950/15",
         )}
      >
         <span className="flex-1 text-sm text-muted-foreground">{label}</span>
         <span
            className={cn(
               "w-16 text-right text-sm font-semibold tabular-nums",
               isNull
                  ? "text-foreground"
                  : status
                     ? "text-emerald-600 dark:text-emerald-400"
                     : "text-red-600 dark:text-red-400",
            )}
         >
            {fmtRatio(value)}
         </span>
         <div className="flex shrink-0 items-center gap-1">
            {remark && (
               <div ref={wrapRef} className="relative">
                  <button
                     type="button"
                     onClick={() => setOpen((v) => !v)}
                     className="flex size-5 items-center justify-center rounded text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                  >
                     <HelpCircleIcon className="size-3.5" />
                  </button>
                  {open && (
                     <div
                        className="prose prose-xs absolute bottom-full right-0 z-20 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover px-3 py-2.5 text-xs leading-relaxed text-popover-foreground shadow-lg [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
                        dangerouslySetInnerHTML={{ __html: remark }}
                     />
                  )}
               </div>
            )}
            {isNull ? (
               <MinusCircleIcon className="size-4 text-muted-foreground/30" />
            ) : status ? (
               <CheckCircle2Icon className="size-4 text-emerald-500" />
            ) : (
               <XCircleIcon className="size-4 text-red-500" />
            )}
         </div>
      </div>
   )
}


function ComplianceHistory({
   history,
}: {
   history: { month: string; shariahStatus: number | null }[]
}) {
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
               <div
                  key={month}
                  className="flex flex-col items-center gap-1"
                  title={`${fmtMonthStr(month)}: ${label}`}
               >
                  <div
                     className="size-9 rounded-md border border-black/10 shadow-sm"
                     style={{ backgroundColor: color }}
                  />
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
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
      <div className="flex flex-col gap-4">
         <QuotaBar
            dailyUsed={quota.dailyUsed}
            dailyLimit={quota.dailyLimit}
            totalUsed={quota.totalUsed}
            totalLimit={quota.totalLimit}
         />

         <div className="flex flex-col justify-between mt-5 lg:flex-row">
            <h2 className="font-serif text-3xl italic font-semibold text-[#1e3358] dark:text-[#93b4d4]">
               {company.companyName}
            </h2>
            {shariah && <div className="flex flex-row items-end gap-1">
               <dt className="text-[11px] text-muted-foreground">Last Updated</dt>
               <dd className="text-sm font-semibold">
                  {shariah.lastUpdatedAt
                     ? shariah.lastUpdatedAt.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                     })
                     : "—"}
               </dd>
            </div>}
         </div>

         {shariah ? (
            <>
               {/* Verdict */}
               <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-muted/30 p-3">
                  <Image
                     src={
                        shariah.shariahStatus === 1
                           ? "/assets/images/compliantStamp.png"
                           : "/assets/images/nonCompliantStamp.png"
                     }
                     height={110}
                     width={110}
                     alt="compliance stamp"
                     className="shrink-0"
                  />
                  <div className="flex flex-col gap-1.5">
                     <p
                        className="text-2xl font-bold leading-tight sm:text-3xl"
                        style={{ color: shariah.shariahStatus && shariah.shariahStatus == 1 ? "#33cc33" : "#ff0000" }}
                     >
                        {shariah.shariahStatus ? (shariah.shariahStatus == 1 ? "Compliant" : "Non-Compliant") : "No Status"}
                     </p>
                     {shariah.shariahStatus && shariah.shariahStatus != 1 &&
                        <p
                           className=""
                           style={{ color: shariah.shariahStatus ? STATUS_COLORS[shariah.shariahStatus] : "#999" }}
                        >
                           {shariah.shariahStatus ? STATUS_LABELS[shariah.shariahStatus] : "No Status"}
                        </p>
                     }
                     <p className="text-sm text-muted-foreground">
                        Based on financial screening for the assessment period.
                     </p>
                  </div>
               </div>

               {/* Overview */}
               <div className="rounded-xl border p-5">
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                     <BuildingIcon className="size-3.5" />
                     Overview
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                     {company.industryGroup && (
                        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                           <dt className="text-[11px] text-muted-foreground">Industry Group</dt>
                           <dd className="text-sm font-semibold">{company.industryGroup}</dd>
                        </div>
                     )}
                     {company.nseSymbol && <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-3 py-2">
                        <dt className="text-[11px] text-muted-foreground">NSE Symbol</dt>
                        <dd className="text-sm font-semibold tabular-nums">{company.nseSymbol}</dd>
                     </div>}
                     {company.isinCode && (
                        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                           <dt className="text-[11px] text-muted-foreground">ISIN Code</dt>
                           <dd className="text-sm font-semibold tabular-nums">{company.isinCode}</dd>
                        </div>
                     )}
                     {company.bseScripCode && (
                        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                           <dt className="text-[11px] text-muted-foreground">BSE Scrip Code</dt>
                           <dd className="text-sm font-semibold tabular-nums">{company.bseScripCode}</dd>
                        </div>
                     )}
                     {company.bseScripId && (
                        <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                           <dt className="text-[11px] text-muted-foreground">BSE Script Id</dt>
                           <dd className="text-sm font-semibold tabular-nums">{company.bseScripId}</dd>
                        </div>
                     )}
                     <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                        <dt className="text-[11px] text-muted-foreground">Market Cap</dt>
                        <dd className="text-sm font-semibold tabular-nums">{fmtMarketCap(shariah.marketCap)}</dd>
                     </div>
                     <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                        <dt className="text-[11px] text-muted-foreground">Company Status</dt>
                        <dd className="text-sm font-semibold">{shariah.companyStatus ?? "—"}</dd>
                     </div>
                     <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                        <dt className="text-[11px] text-muted-foreground">Assessment Year</dt>
                        <dd className="text-sm font-semibold">{fmtDateStr(shariah.assessmentYear)}</dd>
                     </div>
                     <div className="flex flex-col gap-0.5 rounded-lg bg-muted/20 px-0 py-2">
                        <dt className="text-[11px] text-muted-foreground">Data Month</dt>
                        <dd className="text-sm font-semibold">{fmtMonthStr(shariah.month)}</dd>
                     </div>
                  </dl>
               </div>

               <ParametersRatiosTabs shariah={shariah} screeningRemarks={screeningRemarks} />

               {/* Compliance History */}
               <div className="rounded-xl border p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                     <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                        <ClockIcon className="size-3.5" />
                        Compliance History
                     </h3>
                     <Dialog>
                        <DialogTrigger asChild>
                           <button
                              type="button"
                              className="text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                           >
                              <InfoIcon className="size-4" />
                           </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                           <DialogHeader>
                              <DialogTitle>Color Code Legend</DialogTitle>
                           </DialogHeader>
                           <div className="flex flex-col gap-2.5 pt-1">
                              {Object.entries(STATUS_COLORS).map(([s, c]) => (
                                 <div key={s} className="flex items-center gap-3">
                                    <div
                                       className="size-4 shrink-0 rounded border border-black/10"
                                       style={{ backgroundColor: c }}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                       {STATUS_LABELS[Number(s)]}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        </DialogContent>
                     </Dialog>
                  </div>
                  <ComplianceHistory history={complianceHistory} />
               </div>

               {/* Note */}
               <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                     Important Note
                  </h3>
                  <div className="flex flex-col gap-1.5">
                     <p className="text-xs leading-relaxed text-muted-foreground">
                        It is important to note that <strong>Shariah scholars globally allow investment in companies with a small amount of interest income</strong>.
                     </p>
                     <p className="text-xs leading-relaxed text-muted-foreground">
                        However, investors must <strong>identify this portion and donate it to charity (purification)</strong>.
                     </p>
                     <p className="text-xs leading-relaxed text-muted-foreground">
                        If this is not done, the <strong>investment and its returns shall be considered non-compliant for the investor concerned</strong>.
                     </p>
                  </div>
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

   const paramsValues = [
      shariah.lastFinancialData,
      shariah.primaryBusiness,
      shariah.secondaryBusiness,
      shariah.compliantOnInvestment,
      shariah.sufficientFinancialInfo,
   ]
   const paramsPass = paramsValues.every((v) => v === true)
   const paramsPassCount = paramsValues.filter((v) => v === true).length

   const ratiosValues = [
      shariah.totalDebtTotalAssetStatus,
      shariah.totalInterestIncomeTotalIncomeStatus,
      shariah.cashBankReceivablesTotalAssetStatus,
   ]
   const ratiosPass = ratiosValues.every((v) => v === true)
   const ratiosPassCount = ratiosValues.filter((v) => v === true).length

   function tabCls(tab: "parameters" | "ratios", passes: boolean) {
      const isActive = active === tab
      const passColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
      const failColor = "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400"
      return cn(
         "flex flex-1 items-center gap-2 px-4 py-3.5 text-sm font-medium transition-colors",
         isActive ? (passes ? passColor : failColor) : "text-muted-foreground hover:bg-muted/30",
      )
   }

   function badgeCls(passes: boolean) {
      return cn(
         "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
         passes
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
      )
   }

   return (
      <div className="rounded-xl border">
         {/* Tab bar */}
         <div className="flex overflow-hidden rounded-t-xl border-b">
            <button
               className={cn(tabCls("parameters", paramsPass), "border-r")}
               onClick={() => setActive("parameters")}
            >
               <ShieldCheckIcon className="size-4 shrink-0" />
               <span>Shariah Parameters</span>
               <span className={badgeCls(paramsPass)}>{paramsPassCount}/5</span>
            </button>
            <button className={tabCls("ratios", ratiosPass)} onClick={() => setActive("ratios")}>
               <BarChart3Icon className="size-4 shrink-0" />
               <span>Financial Ratios</span>
               <span className={badgeCls(ratiosPass)}>{ratiosPassCount}/3</span>
            </button>
         </div>

         {/* Content */}
         <div className="p-4">
            {active === "parameters" ? (
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <BoolRow
                     label="Last Financial Data Available"
                     value={shariah.lastFinancialData}
                     remark={remarkMap.get("last_financial_data")}
                  />
                  <BoolRow
                     label="Primary Business Compliant"
                     value={shariah.primaryBusiness}
                     remark={remarkMap.get("primary_business")}
                  />
                  <BoolRow
                     label="Secondary Business Compliant"
                     value={shariah.secondaryBusiness}
                     remark={remarkMap.get("secondary_business")}
                  />
                  <BoolRow
                     label="Compliant on Investment"
                     value={shariah.compliantOnInvestment}
                     remark={remarkMap.get("compliant_on_investment")}
                  />
                  <BoolRow
                     label="Sufficient Financial Information"
                     value={shariah.sufficientFinancialInfo}
                     remark={remarkMap.get("financial_information")}
                  />
               </div>
            ) : (
               <div className="flex flex-col gap-2">
                  <RatioRow
                     label="Total Debt / Total Asset"
                     value={shariah.totalDebtTotalAssetValue}
                     status={shariah.totalDebtTotalAssetStatus}
                     remark={remarkMap.get("total_debt_total_asset")}
                  />
                  <RatioRow
                     label="Total Interest Income / Total Income"
                     value={shariah.totalInterestIncomeTotalIncomeValue}
                     status={shariah.totalInterestIncomeTotalIncomeStatus}
                     remark={remarkMap.get("total_interest_income_total_income")}
                  />
                  <RatioRow
                     label="Cash + Bank + Receivables / Total Asset"
                     value={shariah.cashBankReceivablesTotalAssetValue}
                     status={shariah.cashBankReceivablesTotalAssetStatus}
                     remark={remarkMap.get("cash_bank_receivables_total_asset")}
                  />
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
      <div className="flex flex-col gap-2.5 mt-3">
         <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recently Viewed</p>
         <div className="flex flex-wrap gap-2">
            {items.map((c) => (
               <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="flex flex-col items-start gap-0.5 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted/40"
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
               className="flex w-full flex-col gap-0.5 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60"
               onClick={() => onSelect(c)}
            >
               <span className="font-medium">{c.companyName}</span>
               <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {/* <span>{c.prowessId}</span> */}
                  {c.isinCode && <span>{c.isinCode}</span>}
                  {c.nseSymbol && <span>NSE: {c.nseSymbol}</span>}
               </div>
            </button>
         ))}
      </div>
   )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SnapshotClient({ access, commonRemark }: { access: SnapshotAccess; commonRemark: string | null }) {
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

   React.useEffect(() => {
      getRecentlyViewed().then(setRecentlyViewed)
   }, [])

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
      <div className="flex flex-col gap-2 p-6">
         {/* Header row */}
         <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
               Search for a company to view its TASIS shariah screening snapshot.{" "}
               Plan: <span className="font-medium text-foreground">{access.planName}</span>
            </p>
            {commonRemark && (
               <Dialog>
                  <DialogTrigger asChild>
                     <button
                        type="button"
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground"
                     >
                        <BookOpenIcon className="size-3.5" />
                        TASIS Note
                     </button>
                  </DialogTrigger>
                  <DialogContent className="flex max-h-[85vh] w-[90vw] sm:max-w-3xl flex-col">
                     <DialogHeader className="shrink-0">
                        <DialogTitle>TASIS Methodology Note</DialogTitle>
                     </DialogHeader>
                     <div className="min-h-0 flex-1 overflow-y-auto">
                        <div
                           className="prose prose-sm max-w-none text-sm text-muted-foreground [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
                           dangerouslySetInnerHTML={{ __html: commonRemark }}
                        />
                     </div>
                  </DialogContent>
               </Dialog>
            )}
         </div>

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

         {!isLoading && !snapshotData && (
            <>
               <QuotaBar
                  dailyUsed={quota.dailyUsed}
                  dailyLimit={quota.dailyLimit}
                  totalUsed={quota.totalUsed}
                  totalLimit={quota.totalLimit}
               />
               <RecentlyViewedSection items={recentlyViewed} onSelect={handleSelectCompany} />
            </>
         )}

         {isLoading && (
            <div className="flex items-center justify-center py-16">
               <Spinner className="size-6" />
            </div>
         )}

         {!isLoading && snapshotData && <SnapshotCard data={snapshotData} />}

         {!isLoading && !snapshotData && recentlyViewed.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
               <SearchIcon className="mb-3 size-8 text-muted-foreground/30" />
               <p className="text-sm font-medium text-muted-foreground">Search for a company above</p>
               <p className="mt-1 text-xs text-muted-foreground/70">
                  Enter a company name, ISIN, or exchange symbol
               </p>
               {/* <div className="mt-5">
                  <QuotaBar
                     dailyUsed={quota.dailyUsed}
                     dailyLimit={quota.dailyLimit}
                     totalUsed={quota.totalUsed}
                     totalLimit={quota.totalLimit}
                  />
               </div> */}
            </div>
         )}
      </div>
   )
}
