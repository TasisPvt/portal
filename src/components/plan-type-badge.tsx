import { Badge } from "@/src/components/ui/badge"
import { cn } from "@/src/lib/utils"

/** Pricing-plan type pill: "snapshot" → blue, everything else → violet. */
export function PlanTypeBadge({ type, className }: { type: string; className?: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal capitalize",
            type === "snapshot"
               ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
               : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
            className,
         )}
      >
         {type}
      </Badge>
   )
}
