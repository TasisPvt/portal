"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import { cn } from "@/src/lib/utils"
import { SubscribeButton, DURATION_LABELS } from "./subscribe-dialog"
import type { DurationType } from "../_actions"

type PlanRow = {
   id: string
   name: string
   type: string
   indexId: string | null
   indexName: string | null
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

function TypeBadge({ type }: { type: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal capitalize shrink-0",
            type === "snapshot"
               ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
               : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
         )}
      >
         {type}
      </Badge>
   )
}

function PlanCard({ plan }: { plan: PlanRow }) {
   const isSnapshot = plan.type === "snapshot"
   const availableDurations = isSnapshot ? SNAPSHOT_DURATIONS : LIST_DURATIONS
   const [selectedDuration, setSelectedDuration] = React.useState<DurationType>(availableDurations[0].key)

   const price = getPrice(plan, selectedDuration)
   const spd = isSnapshot ? getSpd(plan, selectedDuration) : null
   const sid = isSnapshot ? getSid(plan, selectedDuration) : null

   const features: { label: string }[] = []
   if (isSnapshot) {
      if (sid != null) features.push({ label: `${sid} Stock(s) total` })
      if (spd != null && sid != null && spd > 0) {
         const days = Math.round(sid / spd)
         if (days > 0) features.push({ label: `${days} Day(s)` })
      }
      if (spd != null) features.push({ label: `${spd} stock(s) per day` })
   } else {
      features.push({ label: "Unlimited Stock(s)" })
      if (plan.indexName) features.push({ label: `Index: ${plan.indexName}` })
   }

   return (
      <div className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
         {/* Header */}
         <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight text-foreground">{plan.name}</h3>
            <TypeBadge type={plan.type} />
         </div>

         {/* Duration selector */}
         <div className="mt-4">
            <Select
               value={selectedDuration}
               onValueChange={(v) => setSelectedDuration(v as DurationType)}
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
         <div className="mt-5">
            <div className="">
               <span className="text-4xl font-bold tracking-tight text-foreground">
                  ₹{fmtNum(price)}
               </span><br/>
               <span className="text-xs text-muted-foreground">inclusive of GST</span>
            </div>
         </div>

         {/* CTA */}
         <div className="mt-5">
            {price ? (
               <SubscribeButton
                  planId={plan.id}
                  planName={plan.name}
                  durationType={selectedDuration}
                  price={price}
                  stocksPerDay={spd}
                  stocksInDuration={sid}
                  triggerLabel="Select"
                  triggerClassName="w-full h-11"
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
         <div className="mt-6 border-t pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
               What&apos;s Included
            </p>
            <ul className="mt-3 space-y-2.5">
               {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                     <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                     <span>{f.label}</span>
                  </li>
               ))}
            </ul>
         </div>
      </div>
   )
}

export function PlansClientView({ plans }: { plans: PlanRow[] }) {
   const [filter, setFilter] = React.useState<FilterType>("all")

   const filtered = filter === "all" ? plans : plans.filter((p) => p.type === filter)

   return (
      <div className="flex flex-col gap-6">
         {/* Filter */}
         <div className="flex items-center gap-2 flex-wrap">
            {(["all", "snapshot", "list"] as FilterType[]).map((f) => (
               <button
                  key={f}
                  onClick={() => setFilter(f)}
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
               {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
            </span>
         </div>

         {/* Grid */}
         {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
               No plans available.
            </div>
         ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
               {filtered.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
               ))}
            </div>
         )}
      </div>
   )
}
