"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { XCircleIcon } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import { cn } from "@/src/lib/utils"
import { adminCancelSubscription } from "../_actions"

type SubscriptionRow = {
   id: string
   clientName: string | null
   clientEmail: string | null
   planName: string | null
   planType: string | null
   durationType: string
   status: string
   startDate: Date
   endDate: Date | null
   priceSnapshot: string
   stocksPerDaySnapshot: number | null
   stocksInDurationSnapshot: number | null
   createdAt: Date
}

type StatusFilter = "all" | "active" | "cancelled" | "expired"

const DURATION_LABELS: Record<string, string> = {
   one_time: "One-Time",
   monthly: "Monthly",
   quarterly: "Quarterly",
   annual: "Annual",
}

function fmtPrice(price: string) {
   return "₹" + new Intl.NumberFormat("en-IN").format(parseFloat(price))
}

function fmtDate(d: Date | null | undefined) {
   if (!d) return "—"
   return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
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

function TypeBadge({ type }: { type: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "text-xs font-normal capitalize",
            type === "snapshot"
               ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
               : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
         )}
      >
         {type}
      </Badge>
   )
}

function CancelDialog({ id, clientName, planName }: { id: string; clientName: string; planName: string }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleCancel() {
      startTransition(async () => {
         const result = await adminCancelSubscription(id)
         if (result.success) {
            toast.success("Subscription cancelled.")
            setOpen(false)
            router.refresh()
         } else {
            toast.error(result.message)
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>
            <Button
               variant="ghost"
               size="icon"
               className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
               <XCircleIcon className="size-3.5" />
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Cancel Subscription</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
               Cancel{" "}
               <span className="font-medium text-foreground">{clientName}&apos;s</span> subscription to{" "}
               <span className="font-medium text-foreground">&quot;{planName}&quot;</span>? This cannot be undone.
            </p>
            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Keep
               </Button>
               <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                  {isPending ? "Cancelling…" : "Yes, Cancel"}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}

export function AdminSubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
   const [search, setSearch] = React.useState("")
   const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")

   const filtered = data.filter((row) => {
      const matchesStatus = statusFilter === "all" || row.status === statusFilter
      const q = search.toLowerCase()
      const matchesSearch =
         !q ||
         row.clientName?.toLowerCase().includes(q) ||
         row.clientEmail?.toLowerCase().includes(q) ||
         row.planName?.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
   })

   return (
      <div className="flex flex-col gap-4">
         {/* Toolbar */}
         <div className="flex flex-wrap items-center gap-2">
            <Input
               placeholder="Search client or plan…"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="h-8 w-56 text-sm"
            />
            <div className="flex items-center gap-1 ml-auto">
               {(["all", "active", "cancelled", "expired"] as StatusFilter[]).map((f) => (
                  <button
                     key={f}
                     onClick={() => setStatusFilter(f)}
                     className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize",
                        statusFilter === f
                           ? "bg-primary text-primary-foreground"
                           : "bg-muted/60 text-muted-foreground hover:bg-muted",
                     )}
                  >
                     {f === "all" ? "All" : f}
                  </button>
               ))}
            </div>
            <span className="text-xs text-muted-foreground">
               {filtered.length} of {data.length}
            </span>
         </div>

         {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
               No subscriptions found.
            </div>
         ) : (
            <div className="overflow-x-auto rounded-xl border">
               <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                     <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Plan</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Start</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expires</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-3" />
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {filtered.map((row) => (
                        <tr key={row.id} className={row.status !== "active" ? "opacity-60" : ""}>
                           <td className="px-4 py-3">
                              <div className="font-medium">{row.clientName ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{row.clientEmail ?? ""}</div>
                           </td>
                           <td className="px-4 py-3">
                              <div className="font-medium">{row.planName ?? "—"}</div>
                              {row.planType && <TypeBadge type={row.planType} />}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3">
                              {DURATION_LABELS[row.durationType] ?? row.durationType}
                           </td>
                           <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {fmtDate(row.startDate)}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {fmtDate(row.endDate)}
                           </td>
                           <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                              {fmtPrice(row.priceSnapshot)}
                           </td>
                           <td className="px-4 py-3">
                              {row.status === "active" && (
                                 <CancelDialog
                                    id={row.id}
                                    clientName={row.clientName ?? "Client"}
                                    planName={row.planName ?? "plan"}
                                 />
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
   )
}
