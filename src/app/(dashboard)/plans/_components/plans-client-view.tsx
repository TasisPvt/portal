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
   oneTimeStocksInDuration: number | null
   monthlyStocksPerDay: number | null
   monthlyStocksInDuration: number | null
   quarterlyStocksPerDay: number | null
   quarterlyStocksInDuration: number | null
   annualStocksPerDay: number | null
   annualStocksInDuration: number | null
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
   { key: "quarterly", label: "Quarterly" },
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

function getSid(plan: PlanRow, key: DurationType): number | null {
   if (key === "one_time") return plan.oneTimeStocksInDuration
   if (key === "monthly") return plan.monthlyStocksInDuration
   if (key === "quarterly") return plan.quarterlyStocksInDuration
   return plan.annualStocksInDuration
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
   const sid = isSnapshot ? getSid(plan, selectedDuration) : null

   const features: { label: string }[] = []
   if (isSnapshot) {
      if (sid != null) features.push({ label: `${sid} Stock(s) total` })
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

         {/* Duration selector */}
         <div className="mt-3">
            <Select
               value={selectedDuration}
               onValueChange={(v) => setSelectedDuration(v as DurationType)}
               disabled={isSubscribed}
            >
               <SelectTrigger className="w-full">
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  {availableDurations.map(({ key, label }) => (
                     <SelectItem key={key} value={key}>
                        {label}
                     </SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>

         {/* Price */}
         <div className="mt-3">
            <div className="">
               <span className="text-4xl font-bold tracking-tight text-foreground">
                  ₹{fmtNum(price)}
               </span><br/>
               <span className="text-xs text-muted-foreground">inclusive of GST</span>
            </div>
         </div>

         {/* CTA */}
         <div className="mt-1">
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
                  stocksInDuration={sid}
                  triggerLabel="Select"
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
         <div className="mt-3 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
               What&apos;s Included
            </p>
            <ul className="mt-2 space-y-2.5">
               {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                     <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
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

   return (
      <div className="flex flex-col gap-6">
         {/* Filter */}
         <div className="flex items-center gap-2 flex-wrap">
            {(["all", "snapshot", "list"] as FilterType[]).map((f) => (
               <button
                  key={f}
                  onClick={() => {
                     setFilter(f)
                     setListCategory("all")
                  }}
                  className={cn(
                     "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                     filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted",
                  )}
               >
                  {f === "all" ? "All Plans" : f.charAt(0).toUpperCase() + f.slice(1)}
               </button>
            ))}
            <span className="ml-auto text-sm text-muted-foreground">
               {visible.length} plan{visible.length !== 1 ? "s" : ""}
            </span>
         </div>

         {/* Category chips (List tab only) */}
         {filter === "list" && listCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
               {["all", ...listCategories].map((c) => (
                  <button
                     key={c}
                     onClick={() => setListCategory(c)}
                     className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        listCategory === c
                           ? "border-primary bg-primary/10 text-primary"
                           : "border-border text-muted-foreground hover:bg-muted",
                     )}
                  >
                     {c === "all" ? "All Categories" : c}
                  </button>
               ))}
            </div>
         )}

         {/* Grid */}
         {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
               No plans available.
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3">
               {visible.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} isSubscribed={subscribedPlanIds.includes(plan.id)} customerState={customerState} />
               ))}
            </div>
         )}
      </div>
   )
}
