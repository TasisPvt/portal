"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, XAxis, YAxis } from "recharts"
import { ArrowRightIcon, UsersIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import {
   Card,
   CardAction,
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
      <Card className="h-full">
         <CardHeader>
            <div className="flex min-w-0 items-center gap-2.5">
               <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
                  <UsersIcon className="size-4" />
               </span>
               <div className="min-w-0 space-y-0.5">
                  <CardTitle className="truncate text-base">Customers</CardTitle>
                  <CardDescription>Overall</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-1 pt-1">
               <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {total.toLocaleString("en-IN")}
               </span>
               <DeltaBadge pct={pct} title="this month vs last month" emptyLabel={thisMonth > 0 ? "New" : undefined} />
            </div>
            <CardAction>
               <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  aria-label="View all customers"
                  className="shrink-0 gap-1 whitespace-nowrap text-xs text-muted-foreground"
               >
                  <Link href="/admin/clients">
                     {/* Collapses to just the arrow on very narrow cards. */}
                     <span className="hidden @[13rem]/card-header:inline">View all</span>
                     <ArrowRightIcon className="size-3.5" />
                  </Link>
               </Button>
            </CardAction>
         </CardHeader>

         <CardContent className="flex flex-1 flex-col gap-3">
            <ChartContainer config={config} className="aspect-auto h-26 w-full">
               <AreaChart data={trend} margin={{ top: 8, bottom: 8, left: 0, right: 0 }}>
                  <defs>
                     <linearGradient id="fillCustomers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
                     </linearGradient>
                  </defs>
                  <XAxis dataKey="label" hide />
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
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
   )
}
