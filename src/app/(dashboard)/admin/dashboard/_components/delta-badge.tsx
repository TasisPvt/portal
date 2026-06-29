"use client"

import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"

import { cn } from "@/src/lib/utils"
import { Badge } from "@/src/components/ui/badge"

// pct === null means no comparable baseline last period. If `emptyLabel` is
// given (e.g. "New"), show that as a positive badge; otherwise render nothing.
export function DeltaBadge({
   pct,
   title = "vs previous period",
   emptyLabel,
}: {
   pct: number | null
   title?: string
   emptyLabel?: string
}) {
   if (pct === null) {
      if (!emptyLabel) return null
      return (
         <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" title={title}>
            {emptyLabel}
         </Badge>
      )
   }
   const up = pct > 0
   const down = pct < 0
   return (
      <Badge
         className={cn(
            "gap-1",
            up && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
            down && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
            !up && !down && "bg-muted text-muted-foreground",
         )}
         title={title}
      >
         {up && <ArrowUpIcon className="size-3" />}
         {down && <ArrowDownIcon className="size-3" />}
         {up ? "+" : ""}{pct.toFixed(1)}%
      </Badge>
   )
}
