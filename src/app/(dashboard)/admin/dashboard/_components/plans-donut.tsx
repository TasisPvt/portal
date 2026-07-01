"use client"

import * as React from "react"
import { Pie, PieChart } from "recharts"
import { PieChartIcon } from "lucide-react"

import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/src/components/ui/card"
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
} from "@/src/components/ui/chart"
import type { ByPlanType } from "../_actions"
import { DeltaBadge } from "./delta-badge"

const config = {
   value: { label: "Subscriptions" },
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

export function PlansDonut({
   data,
   lastMonthTotal,
}: {
   data: ByPlanType
   lastMonthTotal: number
}) {
   const total = data.list + data.snapshot
   const pct = lastMonthTotal === 0 ? null : ((total - lastMonthTotal) / lastMonthTotal) * 100
   const diff = total - lastMonthTotal

   const chartData = [
      { key: "list", label: "List", value: data.list, fill: "var(--color-list)" },
      { key: "snapshot", label: "Snapshot", value: data.snapshot, fill: "var(--color-snapshot)" },
   ]

   return (
      <Card className="h-full">
         <CardHeader>
            <div className="flex flex-col items-start justify-between gap-2">
               <div className="flex gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                     <PieChartIcon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                     <CardTitle className="text-base">Subscriptions</CardTitle>
                     <CardDescription>This month</CardDescription>
                  </div>
               </div>
               <div className="flex flex-row items-center gap-1">
                  <span className="text-2xl font-bold tracking-tight tabular-nums">{total}</span>
                  <DeltaBadge pct={pct} title="this month vs last month" emptyLabel={total > 0 ? "New" : undefined} />
               </div>
            </div>
         </CardHeader>

         <CardContent className="flex flex-1 flex-col items-center gap-3">
            {total === 0 ? (
               <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                  <PieChartIcon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No subscriptions this month</p>
               </div>
            ) : (
               <>
                  <ChartContainer config={config} className="mx-auto aspect-square w-full max-w-[170px]">
                     <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                        <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={48} strokeWidth={3} />
                     </PieChart>
                  </ChartContainer>

                  <div className="flex items-center justify-center gap-5 text-sm">
                     {chartData.map((d) => (
                        <div key={d.key} className="flex items-center gap-1.5">
                           <span className="size-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                           <span className="text-muted-foreground">{d.label}</span>
                           <span className="font-semibold tabular-nums">{d.value}</span>
                        </div>
                     ))}
                  </div>
               </>
            )}

            <p className="mt-auto pt-2 text-center text-xs text-muted-foreground">
               {diff > 0
                  ? `${diff} more than last month`
                  : diff < 0
                     ? `${-diff} fewer than last month`
                     : "Same as last month"}
            </p>
         </CardContent>
      </Card>
   )
}
