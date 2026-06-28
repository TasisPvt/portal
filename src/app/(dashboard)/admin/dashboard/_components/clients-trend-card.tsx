"use client"

import * as React from "react"
import Link from "next/link"
import { Area, AreaChart, XAxis } from "recharts"
import { ArrowUpIcon, ArrowDownIcon, ArrowUpRightIcon } from "lucide-react"

import { cn } from "@/src/lib/utils"
import { Badge } from "@/src/components/ui/badge"
import { Card, CardContent } from "@/src/components/ui/card"
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
} from "@/src/components/ui/chart"
import type { ClientsGrowth, TrendPoint } from "../_actions"

const config = {
   total: { label: "Clients", color: "var(--chart-1)" },
} satisfies ChartConfig

export function ClientsTrendCard({
   total,
   growth,
   trend,
}: {
   total: number
   growth: ClientsGrowth
   trend: TrendPoint[]
}) {
   return (
      <Link href="/admin/clients" className="group block h-full focus-visible:outline-none">
         <Card className="h-full transition-colors group-hover:bg-muted/30">
            <CardContent className="flex h-full items-center justify-between gap-4">
               <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                     Total Clients
                     <ArrowUpRightIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
                     {total.toLocaleString("en-IN")}
                  </p>
                  {total > 0 && <DeltaBadge growth={growth} />}
               </div>

               <ChartContainer config={config} className="h-20 w-36 shrink-0 sm:w-44">
                  <AreaChart data={trend} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                     <defs>
                        <linearGradient id="fillClients" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#fillClients)"
                        dot={false}
                     />
                  </AreaChart>
               </ChartContainer>
            </CardContent>
         </Card>
      </Link>
   )
}

function DeltaBadge({ growth }: { growth: ClientsGrowth }) {
   if (growth.pct === null) {
      return (
         <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            New
         </Badge>
      )
   }
   const up = growth.pct > 0
   const down = growth.pct < 0
   return (
      <Badge
         className={cn(
            "gap-1",
            up && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
            down && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
            !up && !down && "bg-muted text-muted-foreground",
         )}
         title="vs last month"
      >
         {up && <ArrowUpIcon className="size-3" />}
         {down && <ArrowDownIcon className="size-3" />}
         {up ? "+" : ""}{growth.pct.toFixed(1)}%
      </Badge>
   )
}
