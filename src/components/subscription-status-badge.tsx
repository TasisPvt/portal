import { Badge } from "@/src/components/ui/badge"
import { cn } from "@/src/lib/utils"

/** Subscription status pill: active → emerald, cancelled → red, else → amber. */
export function SubscriptionStatusBadge({ status }: { status: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal capitalize",
            status === "active"
               ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
               : status === "cancelled"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
         )}
      >
         {status}
      </Badge>
   )
}
