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

const config = {
   value: { label: "Subscriptions" },
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

export function PlansDonut({ data }: { data: { list: number; snapshot: number } }) {
   const total = data.list + data.snapshot
   const chartData = [
      { key: "list", label: "List", value: data.list, fill: "var(--color-list)" },
      { key: "snapshot", label: "Snapshot", value: data.snapshot, fill: "var(--color-snapshot)" },
   ]

   return (
      <Card className="flex flex-col">
         <CardHeader>
            <CardTitle className="text-base">Plans Subscribed</CardTitle>
            <CardDescription>This month · List vs Snapshot</CardDescription>
         </CardHeader>
         <CardContent className="flex flex-1 flex-col">
            {total === 0 ? (
               <EmptyChart label="No subscriptions this month" />
            ) : (
               <>
                  <div className="relative">
                     <ChartContainer config={config} className="mx-auto aspect-square max-h-[220px]">
                        <PieChart>
                           <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                           <Pie data={chartData} dataKey="value" nameKey="key" innerRadius={62} strokeWidth={3} />
                        </PieChart>
                     </ChartContainer>
                     <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold tabular-nums">{total}</span>
                        <span className="text-xs text-muted-foreground">subscriptions</span>
                     </div>
                  </div>

                  {/* Legend */}
                  <div className="mt-2 flex items-center justify-center gap-6 text-sm">
                     {chartData.map((d) => (
                        <div key={d.key} className="flex items-center gap-2">
                           <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: d.fill }} />
                           <span className="text-muted-foreground">{d.label}</span>
                           <span className="font-semibold tabular-nums">{d.value}</span>
                           <span className="text-xs text-muted-foreground">
                              ({Math.round((d.value / total) * 100)}%)
                           </span>
                        </div>
                     ))}
                  </div>
               </>
            )}
         </CardContent>
      </Card>
   )
}

function EmptyChart({ label }: { label: string }) {
   return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
         <PieChartIcon className="size-8 text-muted-foreground/30" />
         <p className="text-sm text-muted-foreground">{label}</p>
      </div>
   )
}
