"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, XAxis } from "recharts"
import { ArrowUpRightIcon, UsersIcon } from "lucide-react"

import {
   Card,
   CardContent,
  CardTitle,
  CardDescription
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
         <Card className="h-full transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:c-box-shadow group-hover:border">
            <CardContent className="flex h-full flex-col gap-3">
               <div className="flex flex-col items-start justify-between gap-2">
                  <div className="flex gap-2.5">
                     <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
                        <UsersIcon className="size-4" />
                     </span>
                     <div className="space-y-0.5">
                        <CardTitle className="flex items-center gap-1 text-base">
                           Customers
                           <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </CardTitle>
                        <CardDescription>Overall</CardDescription>
                     </div>
                  </div>
                  <div className="flex flex-row items-center gap-1">
                     <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                        {total.toLocaleString("en-IN")}
                     </span>
                     <DeltaBadge pct={pct} title="this month vs last month" emptyLabel={thisMonth > 0 ? "New" : undefined} />
                  </div>
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
