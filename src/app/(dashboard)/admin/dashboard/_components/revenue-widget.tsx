"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { BarChart3Icon } from "lucide-react"

import { MONTHS_SHORT } from "@/src/lib/format"
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/src/components/ui/card"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
} from "@/src/components/ui/chart"
import type { MonthlyRevenue } from "../_actions"
import { DeltaBadge } from "./delta-badge"

const config = {
   list: { label: "List", color: "var(--chart-1)" },
   snapshot: { label: "Snapshot", color: "var(--chart-2)" },
} satisfies ChartConfig

type Period = "current" | "last" | "last6" | "overall"
const PERIOD_LABEL: Record<Period, string> = {
   current: "This month",
   last: "Last month",
   last6: "Last 6 months",
   overall: "All-time",
}

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`

export function RevenueWidget({ monthly }: { monthly: MonthlyRevenue[] }) {
   const [period, setPeriod] = React.useState<Period>("last6")

   const view = React.useMemo(() => {
      const map = new Map(monthly.map((m) => [m.month, m]))
      const now = new Date()

      // Build the list of month keys for the selected window.
      let keys: string[]
      if (period === "current") keys = [ym(now)]
      else if (period === "last") keys = [ym(new Date(now.getFullYear(), now.getMonth() - 1, 1))]
      else if (period === "last6") {
         keys = Array.from({ length: 6 }, (_, i) =>
            ym(new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)))
      } else {
         // overall: earliest month with data → current month
         const first = monthly[0]?.month ?? ym(now)
         const [fy, fm] = first.split("-").map(Number)
         const start = new Date(fy, fm - 1, 1)
         keys = []
         for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
            keys.push(ym(d))
         }
      }

      const multiYear = new Set(keys.map((k) => k.slice(0, 4))).size > 1
      const data = keys.map((k) => {
         const m = map.get(k)
         const [, mm] = k.split("-")
         const label = multiYear ? `${MONTHS_SHORT[+mm - 1]} '${k.slice(2, 4)}` : MONTHS_SHORT[+mm - 1]
         return { label, list: m?.list ?? 0, snapshot: m?.snapshot ?? 0 }
      })

      const periodTotal = data.reduce((a, d) => a + d.list + d.snapshot, 0)
      const listTotal = data.reduce((a, d) => a + d.list, 0)
      const snapTotal = data.reduce((a, d) => a + d.snapshot, 0)

      // Previous window of the same length, immediately preceding.
      const [sy, sm] = keys[0].split("-").map(Number)
      const start = new Date(sy, sm - 1, 1)
      const prevKeys = Array.from({ length: keys.length }, (_, i) =>
         ym(new Date(start.getFullYear(), start.getMonth() - (keys.length - i), 1)))
      const prevTotal = prevKeys.reduce((a, k) => {
         const m = map.get(k)
         return a + (m ? m.list + m.snapshot : 0)
      }, 0)
      const pct = prevTotal > 0 ? ((periodTotal - prevTotal) / prevTotal) * 100 : null

      return { data, periodTotal, listTotal, snapTotal, pct }
   }, [monthly, period])

   return (
      <Card className="h-full">
         <CardHeader>
            <div className="flex items-start justify-between gap-3">
               <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                     <BarChart3Icon className="size-4" />
                  </span>
                  <div className="space-y-0.5">
                     <CardTitle className="text-base">Revenue</CardTitle>
                     <CardDescription>{PERIOD_LABEL[period]}</CardDescription>
                  </div>
               </div>
               <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger size="sm" className="w-36">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="current">Current month</SelectItem>
                     <SelectItem value="last">Last month</SelectItem>
                     <SelectItem value="last6">Last 6 months</SelectItem>
                     <SelectItem value="overall">Overall</SelectItem>
                  </SelectContent>
               </Select>
            </div>
            <div className="flex items-center gap-2.5 pt-1">
               <span className="text-2xl font-bold tracking-tight tabular-nums">{inr(view.periodTotal)}</span>
               <DeltaBadge pct={view.pct} />
            </div>
         </CardHeader>

         <CardContent className="flex flex-col gap-4">
            {view.periodTotal === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <BarChart3Icon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No revenue in this period</p>
               </div>
            ) : (
               <>
                  <ChartContainer config={config} className="aspect-auto h-35 w-full">
                     <BarChart data={view.data} margin={{ top: 8, left: 8, right: 8 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
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
