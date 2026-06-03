"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { XCircleIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { SubscriptionStatusBadge as StatusBadge } from "@/src/components/subscription-status-badge"
import { cancelMySubscription } from "../_actions"

type SubscriptionRow = {
   id: string
   planName: string | null
   planType: string | null
   durationType: string
   status: string
   startDate: Date
   endDate: Date
   priceSnapshot: string
   stocksPerDaySnapshot: number | null
   stocksInDurationSnapshot: number | null
}

function CancelDialog({ id, planName }: { id: string; planName: string }) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleCancel() {
      startTransition(async () => {
         const result = await cancelMySubscription(id)
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
               Are you sure you want to cancel your{" "}
               <span className="font-medium text-foreground">&quot;{planName}&quot;</span> subscription? This cannot be
               undone.
            </p>
            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Keep It
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

export function MySubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
   if (data.length === 0) {
      return (
         <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            No subscriptions yet.{" "}
            <Link href="/plans" className="text-primary underline-offset-4 hover:underline">
               Browse plans
            </Link>
         </div>
      )
   }

   return (
      <div className="overflow-x-auto rounded-xl border">
         <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
               <tr>
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
               {data.map((row) => (
                  <tr key={row.id} className={row.status !== "active" ? "opacity-60" : ""}>
                     <td className="px-4 py-3">
                        <div className="font-medium">{row.planName ?? "—"}</div>
                        {row.planType && (
                           <div className="text-xs text-muted-foreground capitalize">{row.planType}</div>
                        )}
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
                           <CancelDialog id={row.id} planName={row.planName ?? "plan"} />
                        )}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   )
}
