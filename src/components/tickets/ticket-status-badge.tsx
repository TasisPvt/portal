import { cn } from "@/src/lib/utils"

export type TicketStatus = "open" | "resolved" | "closed"

const STYLES: Record<TicketStatus, { label: string; badge: string; dot: string }> = {
   open: {
      label: "Open",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      dot: "bg-amber-600 dark:bg-amber-400",
   },
   resolved: {
      label: "Resolved",
      badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
      dot: "bg-green-600 dark:bg-green-400",
   },
   closed: {
      label: "Closed",
      badge: "bg-muted text-muted-foreground",
      dot: "bg-muted-foreground/60",
   },
}

export function TicketStatusBadge({ status, className }: { status: string; className?: string }) {
   const s = STYLES[(status as TicketStatus) in STYLES ? (status as TicketStatus) : "open"]
   return (
      <span
         className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
            s.badge,
            className,
         )}
      >
         <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
         {s.label}
      </span>
   )
}
