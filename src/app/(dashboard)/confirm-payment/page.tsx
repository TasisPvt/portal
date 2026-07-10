import Link from "next/link"
import { CheckCircle2Icon, XCircleIcon, Clock3Icon, ReceiptTextIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { Card } from "@/src/components/ui/card"
import { formatPrice, formatDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { getPaymentDetails, type PaymentDetails } from "../plans/_actions"

export default async function ConfirmPaymentPage({
   searchParams,
}: {
   searchParams: Promise<{ order?: string }>
}) {
   const { order } = await searchParams
   const details = order ? await getPaymentDetails(order) : null

   return (
      <>
         <SiteHeader title="Payment" />
         <div className="flex flex-1 flex-col items-center justify-center p-4 md:p-6">
            <Card className="@container/card w-full max-w-md p-6 sm:p-8">
               {details ? <StatusContent details={details} /> : <NotFound />}
            </Card>
         </div>
      </>
   )
}

function NotFound() {
   return (
      <div className="flex flex-col items-center gap-4 text-center">
         <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ReceiptTextIcon className="size-6 text-muted-foreground" />
         </div>
         <div>
            <h2 className="text-lg font-semibold">Payment not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               We couldn&apos;t find this payment. It may belong to another account or the link is invalid.
            </p>
         </div>
         <Button asChild>
            <Link href="/plans">Back to plans</Link>
         </Button>
      </div>
   )
}

function StatusContent({ details }: { details: PaymentDetails }) {
   if (details.status === "paid") return <PaidContent details={details} />
   if (details.status === "failed") return <FailedContent />
   if (details.status === "cancelled") return <CancelledContent />
   return <ProcessingContent />
}

function PaidContent({ details }: { details: PaymentDetails }) {
   const listPlan = details.planType === "list"
   return (
      <div className="flex flex-col items-center gap-5 text-center">
         <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <CheckCircle2Icon className="size-7 text-emerald-600 dark:text-emerald-400" />
         </div>
         <div>
            <h2 className="text-xl font-semibold">Payment successful</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               Your subscription is active. A confirmation has been recorded against your account.
            </p>
         </div>

         <dl className="w-full space-y-2.5 rounded-xl border bg-muted/30 p-4 text-sm">
            <Row label="Plan" value={details.planName ?? "—"} />
            <Row label="Duration" value={DURATION_LABELS[details.durationType] ?? details.durationType} />
            <GstRows details={details} />
            <div className="border-t pt-2.5">
               <Row label="Amount paid" value={formatPrice(details.priceSnapshot)} strong />
            </div>
            {details.startDate && <Row label="Valid from" value={formatDate(details.startDate)} />}
            {details.endDate && <Row label="Valid until" value={formatDate(details.endDate)} />}
         </dl>

         <div className="flex w-full flex-col gap-2 @xs/card:flex-row">
            <Button asChild className="flex-1">
               <Link href={listPlan ? "/stock/list" : "/stock/snapshot"}>
                  {listPlan ? "View companies" : "Open snapshot"}
               </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
               <Link href="/subscriptions">My subscriptions</Link>
            </Button>
         </div>
      </div>
   )
}

function FailedContent() {
   return (
      <div className="flex flex-col items-center gap-5 text-center">
         <div className="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
            <XCircleIcon className="size-7 text-red-600 dark:text-red-400" />
         </div>
         <div>
            <h2 className="text-xl font-semibold">Payment failed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               Your payment didn&apos;t go through and you have not been charged. You can try again from the plans
               page.
            </p>
         </div>
         <div className="flex w-full flex-col gap-2 @xs/card:flex-row">
            <Button asChild className="flex-1">
               <Link href="/plans">Try again</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
               <Link href="/subscriptions">My subscriptions</Link>
            </Button>
         </div>
      </div>
   )
}

function CancelledContent() {
   return (
      <div className="flex flex-col items-center gap-5 text-center">
         <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <XCircleIcon className="size-7 text-muted-foreground" />
         </div>
         <div>
            <h2 className="text-xl font-semibold">Payment cancelled</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               You cancelled the payment and have not been charged. You can start again from the plans page
               whenever you&apos;re ready.
            </p>
         </div>
         <div className="flex w-full flex-col gap-2 @xs/card:flex-row">
            <Button asChild className="flex-1">
               <Link href="/plans">Back to plans</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
               <Link href="/subscriptions">My subscriptions</Link>
            </Button>
         </div>
      </div>
   )
}

function ProcessingContent() {
   return (
      <div className="flex flex-col items-center gap-5 text-center">
         <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Clock3Icon className="size-7 text-amber-600 dark:text-amber-400" />
         </div>
         <div>
            <h2 className="text-xl font-semibold">Payment processing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
               We&apos;re still confirming this payment. If you completed it, it will reflect on your subscriptions
               shortly.
            </p>
         </div>
         <div className="flex w-full flex-col gap-2 @xs/card:flex-row">
            <Button asChild className="flex-1">
               <Link href="/subscriptions">My subscriptions</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
               <Link href="/plans">Back to plans</Link>
            </Button>
         </div>
      </div>
   )
}

function GstRows({ details }: { details: PaymentDetails }) {
   const half = Number(details.gstRate || "18") / 2
   const isInterState = Number(details.igst || "0") > 0
   return (
      <div className="space-y-2.5 border-t pt-2.5 text-xs text-muted-foreground">
         <Row label="Base price" value={formatPrice(details.taxableAmount)} />
         {isInterState ? (
            <Row label={`IGST (${details.gstRate || "18"}%)`} value={formatPrice(details.igst)} />
         ) : (
            <>
               <Row label={`CGST (${half}%)`} value={formatPrice(details.cgst)} />
               <Row label={`SGST (${half}%)`} value={formatPrice(details.sgst)} />
            </>
         )}
      </div>
   )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
   return (
      <div className="flex items-center justify-between gap-3">
         <dt className="text-muted-foreground">{label}</dt>
         <dd className={strong ? "font-semibold" : "font-medium"}>{value}</dd>
      </div>
   )
}
