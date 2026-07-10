import Link from "next/link"
import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { getMyPayments } from "./_actions"
import { PaymentsTable } from "./_components/payments-table"

export default async function PaymentHistoryPage() {
   const payments = await getMyPayments()
   const paid = payments.filter((p) => p.status === "paid").length

   return (
      <>
         <SiteHeader title="Payment History" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <div>
                        <h2 className="text-xl font-semibold tracking-tight">Payment History</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                           {paid} successful payment{paid !== 1 ? "s" : ""} · download the tax invoice for any paid order
                        </p>
                     </div>
                     <Button asChild size="sm" variant="outline">
                        <Link href="/subscriptions">My Subscriptions</Link>
                     </Button>
                  </div>
                  <div className="px-4 lg:px-6">
                     <PaymentsTable data={payments} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
