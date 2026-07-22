import Link from "next/link"
import { ArrowRightIcon, CheckIcon, XCircleIcon, Clock3Icon, ReceiptTextIcon, ShieldCheckIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { Card } from "@/src/components/ui/card"
import { formatPrice, formatDate } from "@/src/lib/format"
import { DURATION_LABELS, SUPPORT_EMAIL } from "@/src/lib/constants"
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
         <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-4 md:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
               <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-primary/5 blur-3xl" />
               <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-indigo-500/5 blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-lg">
               <Card className="@container/card animate-slide-up p-6 motion-reduce:animate-none sm:p-8">
                  {details ? <StatusContent details={details} /> : <NotFound />}
               </Card>
            </div>
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
      <div className="flex flex-col items-center gap-6 text-center">
         <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100/70 ring-4 ring-emerald-100/40 dark:bg-emerald-950/40 dark:ring-emerald-950/30">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
               <CheckIcon className="size-7 text-white" strokeWidth={3} />
            </div>
         </div>

         <div>
            <h2 className="text-2xl font-bold tracking-tight">Payment Successful</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
               Your subscription is active. A confirmation has been recorded against your account.
            </p>
         </div>

         {/* Transaction summary */}
         <dl className="w-full rounded-xl border bg-muted/30 p-5 text-left text-sm">
            <div className="space-y-3">
               <Row label="Plan" value={details.planName ?? "-"} />
               <Row label="Duration" value={DURATION_LABELS[details.durationType] ?? details.durationType} />

               <hr className="border-border/60" />

               <TaxRows details={details} />

               <div className="flex items-center justify-between gap-3 pt-0.5">
                  <dt className="font-bold text-foreground">Amount paid</dt>
                  <dd className="text-xl font-bold text-primary tabular-nums">
                     {formatPrice(details.priceSnapshot)}
                  </dd>
               </div>

               {(details.startDate || details.endDate) && (
                  <>
                     <hr className="border-border/60" />
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <p className="text-xs text-muted-foreground">Valid from</p>
                           <p className="mt-1 font-medium tabular-nums">
                              {details.startDate ? formatDate(details.startDate) : "-"}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs text-muted-foreground">Valid until</p>
                           <p className="mt-1 font-medium tabular-nums">
                              {details.endDate ? formatDate(details.endDate) : "-"}
                           </p>
                        </div>
                     </div>
                  </>
               )}
            </div>
         </dl>

         {/* Actions */}
         <div className="flex w-full gap-2.5">
            <Button asChild className="group h-12 flex-1">
               <Link href={listPlan ? "/stock/list" : "/stock/snapshot"}>
                  {listPlan ? "View companies" : "Open snapshot"}
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
               </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 flex-1">
               <Link href="/subscriptions">Go to subscriptions</Link>
            </Button>
         </div>

         <p className="text-xs text-muted-foreground">
            Need help?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline">
               Contact Support
            </a>
         </p>
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

function TaxRows({ details }: { details: PaymentDetails }) {
   const half = Number(details.gstRate || "18") / 2
   const isInterState = Number(details.igst || "0") > 0
   return (
      <>
         <Row label="Base price" value={formatPrice(details.taxableAmount)} />
         {isInterState ? (
            <Row label={`IGST (${details.gstRate || "18"}%)`} value={formatPrice(details.igst)} />
         ) : (
            <>
               <Row label={`CGST (${half}%)`} value={formatPrice(details.cgst)} />
               <Row label={`SGST (${half}%)`} value={formatPrice(details.sgst)} />
            </>
         )}
      </>
   )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
   return (
      <div className="flex items-center justify-between gap-3">
         <dt className="text-muted-foreground">{label}</dt>
         <dd className={strong ? "font-semibold tabular-nums" : "font-medium tabular-nums"}>{value}</dd>
      </div>
   )
}
