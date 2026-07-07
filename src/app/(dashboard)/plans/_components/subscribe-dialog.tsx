"use client"

import * as React from "react"
import { toast } from "sonner"
import { createPaymentOrder, verifyPayment, markPaymentFailed, markPaymentCancelled, type DurationType } from "../_actions"
import { loadRazorpay } from "@/src/lib/load-razorpay"
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
import { formatPrice as fmtPrice } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { computeGstFromPrice, paiseToAmount, GST_RATE } from "@/src/lib/gst"

interface SubscribeButtonProps {
   planId: string
   planName: string
   durationType: DurationType
   price: string
   stocksPerDay?: number | null
   customerState?: string | null
   triggerLabel?: string
   triggerClassName?: string
}

export function SubscribeButton(props: SubscribeButtonProps) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()

   // GST is included in the gross price (18% of gross), split by place of supply.
   const gst = computeGstFromPrice(props.price, props.customerState)
   const halfRate = GST_RATE / 2

   function handleSubscribe() {
      startTransition(async () => {
         const order = await createPaymentOrder(props.planId, props.durationType)
         if (!order.success) {
            toast.error(order.message)
            return
         }

         const ready = await loadRazorpay()
         if (!ready || !window.Razorpay) {
            toast.error("Could not load the payment gateway. Please try again.")
            return
         }

         const rzp = new window.Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.orderId,
            name: "TASIS",
            description: `${props.planName} — ${DURATION_LABELS[props.durationType]}`,
            prefill: order.prefill,
            theme: { color: "#1a3a6e" },
            handler: (response) => {
               // Verify server-side, then show the result on the confirm page.
               // Hard navigation (not router.push): Razorpay's modal teardown
               // swallows Next.js soft navigations, leaving the user on /plans.
               verifyPayment({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
               }).finally(() => {
                  window.location.assign(`/confirm-payment?order=${order.orderId}`)
               })
            },
            modal: {
               ondismiss: () => {
                  // User closed checkout without paying — mark the order cancelled.
                  markPaymentCancelled(order.orderId)
                  toast.info("Payment cancelled.")
               },
            },
         })

         rzp.on("payment.failed", () => {
            markPaymentFailed(order.orderId).finally(() => {
               window.location.assign(`/confirm-payment?order=${order.orderId}`)
            })
         })

         setOpen(false)
         rzp.open()
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
                  {/* GST breakdown (price is inclusive of GST) */}
                  <div className="flex flex-col gap-2 border-t pt-2.5 text-xs text-muted-foreground">
                     <div className="flex justify-between">
                        <span>Base price</span>
                        <span>{fmtPrice(paiseToAmount(gst.taxable))}</span>
                     </div>
                     {gst.isIntraState ? (
                        <>
                           <div className="flex justify-between">
                              <span>CGST ({halfRate}%)</span>
                              <span>{fmtPrice(paiseToAmount(gst.cgst))}</span>
                           </div>
                           <div className="flex justify-between">
                              <span>SGST ({halfRate}%)</span>
                              <span>{fmtPrice(paiseToAmount(gst.sgst))}</span>
                           </div>
                        </>
                     ) : (
                        <div className="flex justify-between">
                           <span>IGST ({GST_RATE}%)</span>
                           <span>{fmtPrice(paiseToAmount(gst.igst))}</span>
                        </div>
                     )}
                  </div>

                  <div className="flex justify-between border-t pt-2.5">
                     <span className="font-medium">Total <span className="font-normal text-muted-foreground">(incl. GST)</span></span>
                     <span className="font-semibold text-base">{fmtPrice(props.price)}</span>
                  </div>
               </div>
               <p className="text-xs text-muted-foreground">
                  You&apos;ll be redirected to Razorpay to complete payment securely. Your subscription
                  activates as soon as the payment succeeds.
               </p>
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
               </Button>
               <Button onClick={handleSubscribe} disabled={isPending}>
                  {isPending ? "Processing…" : `Pay ${fmtPrice(props.price)}`}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
