"use client"

import * as React from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BarChart3Icon, ArrowRightIcon } from "lucide-react"

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
import type { MonthlyRevenue, DailyRevenue } from "../_actions"
import { DeltaBadge } from "./delta-badge"

const config = {
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`
const pad = (n: number) => String(n).padStart(2, "0")
const ym = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

export function RevenueWidget({
   monthly,
   daily,
}: {
   monthly: MonthlyRevenue[]
   daily: DailyRevenue[]
}) {
   // Day-wise for the current month (day 1 → today), with a delta vs last
   // month's total. Full history + filters live on the linked Revenue report.
   const view = React.useMemo(() => {
      const now = new Date()
      const y = now.getFullYear()
      const mo = now.getMonth()
      const dmap = new Map(daily.map((d) => [d.day, d]))

      const data = Array.from({ length: now.getDate() }, (_, i) => {
         const day = i + 1
         const d = dmap.get(`${y}-${pad(mo + 1)}-${pad(day)}`)
         return { label: String(day), list: d?.list ?? 0, snapshot: d?.snapshot ?? 0 }
      })

      const listTotal = data.reduce((a, d) => a + d.list, 0)
      const snapTotal = data.reduce((a, d) => a + d.snapshot, 0)
      const periodTotal = listTotal + snapTotal

      // Delta vs last month's total (from the monthly series).
      const prev = new Map(monthly.map((m) => [m.month, m])).get(ym(new Date(y, mo - 1, 1)))
      const prevTotal = prev ? prev.list + prev.snapshot : 0
      const pct = prevTotal > 0 ? ((periodTotal - prevTotal) / prevTotal) * 100 : null

      return { data, periodTotal, listTotal, snapTotal, pct }
   }, [monthly, daily])

   return (
      <Card className="h-full">
         <CardHeader>
            <div className="flex items-center gap-2.5">
               <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <BarChart3Icon className="size-4" />
               </span>
               <div className="space-y-0.5">
                  <CardTitle className="text-base">Revenue</CardTitle>
                  <CardDescription>This month, daily</CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
               <span className="text-2xl font-bold tracking-tight tabular-nums">{inr(view.periodTotal)}</span>
               <DeltaBadge pct={view.pct} title="this month vs last month" />
            </div>
            <CardAction>
               <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <Link href="/admin/reports/revenue">
                     View all <ArrowRightIcon className="ml-1 size-3" />
                  </Link>
               </Button>
            </CardAction>
         </CardHeader>

         <CardContent className="flex flex-col gap-4">
            {view.periodTotal === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <BarChart3Icon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No revenue this month</p>
               </div>
            ) : (
               <>
                  <ChartContainer config={config} className="aspect-auto h-35 w-full">
                     <BarChart data={view.data} margin={{ top: 8, left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} interval="preserveStartEnd" />
                        <YAxis hide />
                        <ChartTooltip
                           content={<ChartTooltipContent formatter={(v, name) => (
                              <div className="flex w-full items-center justify-between gap-3">
                                 <span className="text-muted-foreground capitalize">{name}</span>
                                 <span className="font-medium tabular-nums">{inr(v as number)}</span>
                              </div>
                           )} />}
                        />
                        <Bar dataKey="list" stackId="rev" fill="var(--color-list)" radius={[0, 0, 4, 4]} maxBarSize={36} />
                        <Bar dataKey="snapshot" stackId="rev" fill="var(--color-snapshot)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                     </BarChart>
                  </ChartContainer>

                  {/* Legend with share */}
                  <div className="flex flex-col gap-2 border-t pt-3 text-sm">
                     <LegendRow color="var(--chart-1)" label="List" amount={view.listTotal} total={view.periodTotal} />
                     <LegendRow color="var(--chart-2)" label="Snapshot" amount={view.snapTotal} total={view.periodTotal} />
                  </div>
               </>
            )}
         </CardContent>
      </Card>
   )
}

function LegendRow({ color, label, amount, total }: { color: string; label: string; amount: number; total: number }) {
   const pct = total > 0 ? Math.round((amount / total) * 100) : 0
   return (
      <div className="flex items-center gap-2.5">
         <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
         <span className="flex-1 text-muted-foreground">{label}</span>
         <span className="font-medium tabular-nums">{inr(amount)}</span>
         <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
   )
}
