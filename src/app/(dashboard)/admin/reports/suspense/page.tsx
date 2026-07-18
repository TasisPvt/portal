import { SiteHeader } from "@/src/components/site-header"
import { getSuspenseReport } from "./_actions"
import { SuspenseReport } from "./_components/suspense-report"

export default async function SuspenseReportPage({
   searchParams,
}: {
   searchParams: Promise<{ year?: string; month?: string }>
}) {
   const sp = await searchParams
   const now = new Date()

   const y = Number(sp.year)
   const m = Number(sp.month)
   const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear()
   const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1

   const rows = await getSuspenseReport(year, month)

   return (
      <>
         <SiteHeader title="Suspense" breadcrumb="Reports" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                  <SuspenseReport rows={rows} year={year} month={month} />
               </div>
            </div>
         </div>
      </>
   )
}
