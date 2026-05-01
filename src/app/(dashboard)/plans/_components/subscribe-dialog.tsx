"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { subscribeToPlan, type DurationType } from "../_actions"
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
import { cn } from "@/src/lib/utils"

export const DURATION_LABELS: Record<DurationType, string> = {
   one_time: "One-Time",
   monthly: "Monthly",
   quarterly: "Quarterly",
   annual: "Annual",
}

function fmtPrice(price: string) {
   return "₹" + new Intl.NumberFormat("en-IN").format(parseFloat(price))
}

interface SubscribeButtonProps {
   planId: string
   planName: string
   durationType: DurationType
   price: string
   stocksPerDay?: number | null
   stocksInDuration?: number | null
   triggerLabel?: string
   triggerClassName?: string
}

export function SubscribeButton(props: SubscribeButtonProps) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const router = useRouter()

   function handleSubscribe() {
      startTransition(async () => {
         const result = await subscribeToPlan(props.planId, props.durationType)
         if (result.success) {
            toast.success(`Subscribed to "${props.planName}" — ${DURATION_LABELS[props.durationType]}`)
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
               className={cn(
                  "font-semibold",
                  props.triggerClassName,
               )}
            >
               {props.triggerLabel ?? "Subscribe"}
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-sm">
            <DialogHeader>
               <DialogTitle>Confirm Subscription</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
               <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
                  <div className="flex justify-between">
                     <span className="text-muted-foreground">Plan</span>
                     <span className="font-medium">{props.planName}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-muted-foreground">Duration</span>
                     <span className="font-medium">{DURATION_LABELS[props.durationType]}</span>
                  </div>
                  {props.stocksPerDay != null && (
                     <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Stocks per day</span>
                        <span>{props.stocksPerDay}</span>
                     </div>
                  )}
                  {props.stocksInDuration != null && (
                     <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total stocks in duration</span>
                        <span>{props.stocksInDuration}</span>
                     </div>
                  )}
                  <div className="flex justify-between border-t pt-2.5">
                     <span className="font-medium">Price</span>
                     <span className="font-semibold text-base">{fmtPrice(props.price)}</span>
                  </div>
               </div>
               <p className="text-xs text-muted-foreground">
                  Payment will be collected separately. Your subscription will be active immediately.
               </p>
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
               </Button>
               <Button onClick={handleSubscribe} disabled={isPending}>
                  {isPending ? "Subscribing…" : "Confirm"}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
