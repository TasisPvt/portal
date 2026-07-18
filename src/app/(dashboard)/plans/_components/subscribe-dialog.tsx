"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { CreditCardIcon } from "lucide-react"
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

// Full-screen overlay shown after a successful (or failed) payment while we
// verify server-side and hard-redirect to the confirm page. It bridges the
// otherwise-blank gap where the user is left on /plans, unsure what happened.
// Never shown when the checkout is dismissed (that path stays on /plans).
//
// Rendered through a portal to document.body: the plan Card uses a transform
// (hover lift), which would otherwise become the containing block for this
// `fixed` element and trap it inside the card instead of covering the viewport.
function PaymentProcessingOverlay() {
   if (typeof document === "undefined") return null
   return createPortal(
      <div
         className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 backdrop-blur-sm"
         role="status"
         aria-live="polite"
      >
         <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-10 py-8 shadow-xl">
            <div className="relative flex size-16 items-center justify-center">
               <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
               <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
               <CreditCardIcon className="relative size-7 animate-pulse text-primary" />
            </div>
            <div className="text-center">
               <p className="text-sm font-medium">Processing your payment…</p>
               <p className="mt-0.5 text-xs text-muted-foreground">
                  Please don&apos;t close or refresh this page.
               </p>
            </div>
         </div>
      </div>,
      document.body,
   )
}

export function SubscribeButton(props: SubscribeButtonProps) {
   const [open, setOpen] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   // Drives the post-payment overlay while verify + redirect are in flight.
   const [processing, setProcessing] = React.useState(false)

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
            description: `${props.planName} - ${DURATION_LABELS[props.durationType]}`,
            prefill: order.prefill,
            theme: { color: "#1a3a6e" },
            handler: (response) => {
               // Payment done - cover /plans with the processing overlay while we
               // verify server-side and hard-redirect, so the user isn't left
               // staring at a blank page wondering what happened.
               setProcessing(true)
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
                  // User closed checkout without paying - no redirect happens, so
                  // make sure the overlay is not showing and mark the order cancelled.
                  setProcessing(false)
                  markPaymentCancelled(order.orderId)
                  toast.info("Payment cancelled.")
               },
            },
         })

         rzp.on("payment.failed", () => {
            // A failed payment also hard-redirects to the confirm page.
            setProcessing(true)
            markPaymentFailed(order.orderId).finally(() => {
               window.location.assign(`/confirm-payment?order=${order.orderId}`)
            })
         })

         setOpen(false)
         rzp.open()
      })
   }

   return (
      <>
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
      {processing && <PaymentProcessingOverlay />}
      </>
   )
}
