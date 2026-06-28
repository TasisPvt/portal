"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import { BarChart3Icon } from "lucide-react"

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
   value: { label: "Revenue" },
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

const inr = (v: number | string) => `₹${Number(v).toLocaleString("en-IN")}`

function SummaryStat({ label, value, dot }: { label: string; value: string; dot: string }) {
   return (
      <div className="px-3 py-1.5">
         <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: dot }} />
            {label}
         </p>
         <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
   )
}

export function RevenueBar({ data }: { data: { list: number; snapshot: number } }) {
   const total = data.list + data.snapshot
   const chartData = [
      { label: "List", value: data.list, fill: "var(--color-list)" },
      { label: "Snapshot", value: data.snapshot, fill: "var(--color-snapshot)" },
   ]

   return (
      <Card className="flex flex-col">
         <CardHeader>
            <div className="flex items-start justify-between gap-4">
               <div className="space-y-1">
                  <CardTitle className="text-base">Revenue</CardTitle>
                  <CardDescription>This month · List vs Snapshot</CardDescription>
               </div>
               {total > 0 && (
                  <div className="flex shrink-0 divide-x rounded-lg border">
                     <SummaryStat label="List" value={inr(data.list)} dot="var(--chart-1)" />
                     <SummaryStat label="Snapshot" value={inr(data.snapshot)} dot="var(--chart-2)" />
                  </div>
               )}
            </div>
         </CardHeader>
         <CardContent className="flex flex-1 flex-col">
            {total === 0 ? (
               <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
                  <BarChart3Icon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No revenue this month</p>
               </div>
            ) : (
               <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
                  <BarChart data={chartData} margin={{ top: 24, left: 8, right: 8 }}>
                     <CartesianGrid vertical={false} />
                     <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                     <YAxis hide />
                     <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideIndicator formatter={(v) => inr(v as number)} />}
                     />
                     <Bar dataKey="value" radius={8} maxBarSize={96}>
                        {chartData.map((d) => (
                           <Cell key={d.label} fill={d.fill} />
                        ))}
                        <LabelList
                           dataKey="value"
                           position="top"
                           className="fill-foreground"
                           fontSize={12}
                           formatter={(v) => inr(v as number)}
                        />
                     </Bar>
                  </BarChart>
               </ChartContainer>
            )}
         </CardContent>
      </Card>
   )
}
