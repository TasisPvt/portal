"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, XAxis } from "recharts"
import { ArrowUpRightIcon } from "lucide-react"

import {
   Card,
   CardContent,
} from "@/src/components/ui/card"
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
} from "@/src/components/ui/chart"
import type { TrendPoint } from "../_actions"
import { DeltaBadge } from "./delta-badge"

const config = {
   total: { label: "Customers", color: "var(--chart-3)" },
} satisfies ChartConfig

export function CustomersCard({
   total,
   thisMonth,
   lastMonth,
   trend,
}: {
   total: number
   thisMonth: number
   lastMonth: number
   trend: TrendPoint[]
}) {
   const pct = lastMonth === 0 ? null : ((thisMonth - lastMonth) / lastMonth) * 100

   return (
      <Link href="/admin/clients" className="group block h-full focus-visible:outline-none">
         <Card className="h-full transition-colors group-hover:bg-muted/30">
            <CardContent className="flex h-full flex-col gap-3">
               <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                     <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        Customers
                        <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                     </p>
                     <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                        {total.toLocaleString("en-IN")}
                     </p>
                  </div>
                  <DeltaBadge pct={pct} title="this month vs last month" emptyLabel={thisMonth > 0 ? "New" : undefined} />
               </div>

               <ChartContainer config={config} className="aspect-auto h-16 w-full">
                  <AreaChart data={trend} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                     <defs>
                        <linearGradient id="fillCustomers" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
                           <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
                        </linearGradient>
                     </defs>
                     <XAxis dataKey="label" hide />
                     <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                     <Area
                        dataKey="total"
                        type="natural"
                        stroke="var(--color-total)"
                        strokeWidth={2}
                        fill="url(#fillCustomers)"
                        dot={false}
                     />
                  </AreaChart>
               </ChartContainer>

               <div className="mt-auto flex flex-col gap-2 border-t pt-3 text-sm">
                  <div className="flex items-center gap-2.5">
                     <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-3)" }} />
                     <span className="flex-1 text-muted-foreground">This month</span>
                     <span className="font-semibold tabular-nums">{thisMonth.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                     <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                     <span className="flex-1 text-muted-foreground">Last month</span>
                     <span className="font-semibold tabular-nums">{lastMonth.toLocaleString("en-IN")}</span>
                  </div>
               </div>
            </CardContent>
         </Card>
      </Link>
   )
}
