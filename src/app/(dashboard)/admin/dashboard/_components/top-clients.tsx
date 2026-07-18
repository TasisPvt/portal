"use client"

import Link from "next/link"
import { TrophyIcon, ArrowRightIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import {
   Card,
   CardAction,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from "@/src/components/ui/card"
import type { TopClientsByPeriod } from "../_actions"

// One color per ranked client; Others is a neutral grey.
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const OTHERS_COLOR = "#94a3b8"

const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

export function TopClients({ data }: { data: TopClientsByPeriod }) {
   // Current month only. Full history + per-period breakdowns live on the linked
   // Revenue report (which can group revenue by client).
   const dist = data.currentMonth

   const segments = [
      ...dist.clients.map((c, i) => ({ share: c.share, color: COLORS[i % COLORS.length] })),
      ...(dist.othersTotal > 0 ? [{ share: dist.othersShare, color: OTHERS_COLOR }] : []),
   ]

   return (
      <Card>
         <CardHeader>
            <div className="flex items-center gap-2.5">
               <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <TrophyIcon className="size-4" />
               </span>
               <div className="space-y-0.5">
                  <CardTitle className="text-base">Top Clients</CardTitle>
                  <CardDescription>This month</CardDescription>
               </div>
            </div>
            <CardAction>
               <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <Link href="/admin/reports/revenue?group=clients">
                     View all <ArrowRightIcon className="ml-1 size-3" />
                  </Link>
               </Button>
            </CardAction>
         </CardHeader>

         <CardContent>
            {dist.periodTotal === 0 ? (
               <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <TrophyIcon className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No revenue this month</p>
               </div>
            ) : (
               <div className="flex flex-col gap-5">
                  {/* Total */}
                  <div>
                     <p className="text-2xl font-bold tracking-tight tabular-nums">{inr(dist.periodTotal)}</p>
                     <p className="text-xs text-muted-foreground">Total revenue · This month</p>
                  </div>

                  {/* Distribution bar */}
                  <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
                     {segments.map((seg, i) => (
                        <div
                           key={i}
                           className="h-full"
                           style={{ width: `${Math.max(seg.share, 1)}%`, backgroundColor: seg.color }}
                        />
                     ))}
                  </div>

                  {/* Legend */}
                  <ul className="flex flex-col gap-2.5">
                     {dist.clients.map((c, i) => (
                        <li key={c.id} className="flex items-center gap-2.5 text-sm">
                           <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                           <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                           <span className="shrink-0 font-semibold tabular-nums">{inr(c.total)}</span>
                           <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                              {c.share.toFixed(0)}%
                           </span>
                        </li>
                     ))}
                     {dist.othersTotal > 0 && (
                        <li className="flex items-center gap-2.5 text-sm">
                           <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: OTHERS_COLOR }} />
                           <span className="min-w-0 flex-1 truncate text-muted-foreground">Others</span>
                           <span className="shrink-0 font-semibold tabular-nums text-muted-foreground">{inr(dist.othersTotal)}</span>
                           <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                              {dist.othersShare.toFixed(0)}%
                           </span>
                        </li>
                     )}
                  </ul>
               </div>
            )}
         </CardContent>
      </Card>
   )
}
