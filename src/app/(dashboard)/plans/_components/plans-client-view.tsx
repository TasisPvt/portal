"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import { cn } from "@/src/lib/utils"
import { Card } from "@/src/components/ui/card"
import { SubscribeButton } from "./subscribe-dialog"
import { PlanTypeBadge } from "@/src/components/plan-type-badge"
import type { DurationType } from "../_actions"

type PlanRow = {
   id: string
   name: string
   type: string
   indexId: string | null
   indexName: string | null
   indexCompanyCount: number
   category: string | null
   oneTimePrice: string | null
   monthlyPrice: string | null
   quarterlyPrice: string | null
   annualPrice: string | null
   oneTimeStocksPerDay: number | null
   monthlyStocksPerDay: number | null
   quarterlyStocksPerDay: number | null
   annualStocksPerDay: number | null
}

type FilterType = "all" | "snapshot" | "list"

const SNAPSHOT_DURATIONS: { key: DurationType; label: string }[] = [
   { key: "one_time", label: "One-Time" },
   { key: "monthly", label: "Monthly" },
   { key: "quarterly", label: "Quarterly" },
   { key: "annual", label: "Annual" },
]

const LIST_DURATIONS: { key: DurationType; label: string }[] = [
   { key: "one_time", label: "One-Time" },
   { key: "annual", label: "Annual" },
]

function getPrice(plan: PlanRow, key: DurationType): string | null {
   if (key === "one_time") return plan.oneTimePrice
   if (key === "monthly") return plan.monthlyPrice
   if (key === "quarterly") return plan.quarterlyPrice
   return plan.annualPrice
}

function getSpd(plan: PlanRow, key: DurationType): number | null {
   if (key === "one_time") return plan.oneTimeStocksPerDay
   if (key === "monthly") return plan.monthlyStocksPerDay
   if (key === "quarterly") return plan.quarterlyStocksPerDay
   return plan.annualStocksPerDay
}

function fmtNum(n: string | null | undefined): string {
   if (!n) return "0"
   const v = parseFloat(n)
   return isNaN(v) ? "0" : new Intl.NumberFormat("en-IN").format(v)
}

function PlanCard({ plan, isSubscribed, customerState }: { plan: PlanRow; isSubscribed: boolean; customerState: string | null }) {
   const isSnapshot = plan.type === "snapshot"
   const availableDurations = isSnapshot ? SNAPSHOT_DURATIONS : LIST_DURATIONS
   const [selectedDuration, setSelectedDuration] = React.useState<DurationType>(availableDurations[0].key)

   const price = getPrice(plan, selectedDuration)
   const spd = isSnapshot ? getSpd(plan, selectedDuration) : null

   const features: { label: string }[] = []
   if (isSnapshot) {
      if (spd != null) features.push({ label: `${spd} stock(s) per day` })
   } else {
      const n = plan.indexCompanyCount
      features.push({ label: `${new Intl.NumberFormat("en-IN").format(n)} ${n === 1 ? "Stock" : "Stocks"} total` })
      if (plan.indexName) features.push({ label: `Index: ${plan.indexName}` })
   }

   return (
      <Card className="relative row-span-5 !grid grid-rows-subgrid !gap-y-0 !overflow-visible !py-4 px-4 transition-transform duration-200 ease-out hover:-translate-y-1 hover:border-primary/40">
         {/* Already Subscribed banner */}
         {isSubscribed && (
            <div className="absolute -top-px left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
               <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background whitespace-nowrap">
                  <CheckCircle2Icon className="size-3.5 shrink-0" />
                  Already Subscribed
               </span>
            </div>
         )}

         {/* Header */}
         <div className={cn("flex flex-col gap-2", isSubscribed && "mt-2")}>
            <PlanTypeBadge type={plan.type} className="w-fit shrink-0" />
            <h3 className="text-base font-bold leading-tight text-foreground">
               {plan.name}
            </h3>
         </div>

         {/* Payment term row */}
         <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Payment Term</span>
            {availableDurations.length > 1 ? (
               <Select
                  value={selectedDuration}
                  onValueChange={(v) => setSelectedDuration(v as DurationType)}
                  disabled={isSubscribed}
               >
                  <SelectTrigger size="sm" className="h-8 w-auto gap-1.5 rounded-xl font-semibold">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                     {availableDurations.map(({ key, label }) => (
                        <SelectItem key={key} value={key}>
                           {label}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            ) : (
               <span className="text-sm font-semibold text-foreground">{availableDurations[0].label}</span>
            )}
         </div>

         {/* Price box */}
         <div className="mt-2 rounded-xl border border-border/60 bg-primary/10 p-4">
            <div className="flex items-baseline gap-1.5">
               <span className="text-4xl font-bold tracking-tight text-foreground">
                  ₹{fmtNum(price)}
               </span>
               <span className="text-xs text-muted-foreground">/ inclusive of GST</span>
            </div>
         </div>

         {/* CTA */}
         <div className="mt-4">
            {isSubscribed ? (
               <button
                  disabled
                  className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg border border-input bg-muted text-muted-foreground text-sm font-semibold cursor-not-allowed"
               >
                  <CheckCircle2Icon className="size-4 shrink-0" />
                  Subscribed
               </button>
            ) : price ? (
               <SubscribeButton
                  planId={plan.id}
                  planName={plan.name}
                  durationType={selectedDuration}
                  price={price}
                  stocksPerDay={spd}
                  triggerLabel="Select Plan"
                  triggerClassName="w-full h-11"
                  customerState={customerState}
               />
            ) : (
               <button
                  disabled
                  className="w-full h-11 rounded-lg bg-muted text-muted-foreground text-sm font-semibold cursor-not-allowed"
               >
                  Not available
               </button>
            )}
         </div>

         {/* What's included */}
         <div className="mt-4 border-t pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
               What&apos;s Included
            </p>
            <ul className="mt-3 space-y-2.5">
               {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                     <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
                     <span>{f.label}</span>
                  </li>
               ))}
            </ul>
         </div>
      </Card>
   )
}

const UNCATEGORIZED = "Uncategorized"

function planCategory(p: PlanRow): string {
   return p.category?.trim() || UNCATEGORIZED
}

export function PlansClientView({ plans, subscribedPlanIds, customerState }: { plans: PlanRow[]; subscribedPlanIds: string[]; customerState: string | null }) {
   const [filter, setFilter] = React.useState<FilterType>("all")
   const [listCategory, setListCategory] = React.useState<string>("all")

   // Distinct categories across list plans (for the List-tab chips)
   const listCategories = React.useMemo(() => {
      const set = new Set<string>()
      for (const p of plans) if (p.type === "list") set.add(planCategory(p))
      return Array.from(set).sort((a, b) =>
         a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b),
      )
   }, [plans])

   const byType = filter === "all" ? plans : plans.filter((p) => p.type === filter)
   const visible =
      filter === "list" && listCategory !== "all"
         ? byType.filter((p) => planCategory(p) === listCategory)
         : byType

   const showCategories = filter === "list" && listCategories.length > 0

   return (
      <div className="flex flex-col gap-6">
         {/* Toolbar: segmented type tabs (left) + plan count (top right) */}
         <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Segmented plan-type tabs */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
               {(["all", "snapshot", "list"] as FilterType[]).map((f) => (
                  <button
                     key={f}
                     onClick={() => {
                        setFilter(f)
                        setListCategory("all")
                     }}
                     aria-pressed={filter === f}
                     className={cn(
                        "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        filter === f
                           ? "bg-primary text-primary-foreground shadow-sm"
                           : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                     )}
                  >
                     {f === "all" ? "All Plans" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
               ))}
            </div>

            <span className="whitespace-nowrap text-sm font-bold text-primary">
               {visible.length} plan{visible.length !== 1 ? "s" : ""} available
            </span>
         </div>

         {/* Category filters (List tab only) - below the tabs header */}
         {showCategories && (
            <div className="-mt-2 flex flex-wrap items-center gap-2.5">
               <span className="text-sm text-muted-foreground">Filters:</span>
               <div className="flex flex-wrap gap-1.5">
                  {["all", ...listCategories].map((c) => (
                     <button
                        key={c}
                        onClick={() => setListCategory(c)}
                        aria-pressed={listCategory === c}
                        className={cn(
                           "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                           listCategory === c
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
                        )}
                     >
                        {c === "all" ? "All Categories" : c}
                     </button>
                  ))}
               </div>
            </div>
         )}

         {/* Grid - plan cards followed by the advisory card */}
         <div className="grid grid-cols-1 gap-x-4 gap-y-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
            {visible.map((plan) => (
               <PlanCard key={plan.id} plan={plan} isSubscribed={subscribedPlanIds.includes(plan.id)} customerState={customerState} />
            ))}
         </div>
      </div>
   )
}
