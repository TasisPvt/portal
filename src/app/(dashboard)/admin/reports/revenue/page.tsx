import { SiteHeader } from "@/src/components/site-header"
import { getPaidPayments } from "./_actions"
import { RevenueReport } from "./_components/revenue-report"

export default async function RevenueReportPage({
   searchParams,
}: {
   searchParams: Promise<{ group?: string }>
}) {
   const [payments, sp] = await Promise.all([getPaidPayments(), searchParams])

   return (
      <>
         <SiteHeader title="Revenue" breadcrumb="Reports" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                  <RevenueReport payments={payments} initialGroupByClient={sp.group === "clients"} />
               </div>
            </div>
         </div>
      </>
   )
}
