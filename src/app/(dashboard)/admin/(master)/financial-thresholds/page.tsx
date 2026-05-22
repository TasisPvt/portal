import { SiteHeader } from "@/src/components/site-header"
import { getFinancialThresholds } from "./_actions"
import { ThresholdsForm } from "./_components/thresholds-form"

export default async function FinancialThresholdsPage() {
   const thresholds = await getFinancialThresholds()

   return (
      <>
         <SiteHeader breadcrumb="Master" title="Financial Ratio Thresholds" />
         <div className="flex flex-col gap-6 p-6">
            <div>
               <h1 className="text-xl font-semibold">Financial Ratio Thresholds</h1>
               <p className="mt-1 text-sm text-muted-foreground">
                  Set the threshold percentage for each financial ratio. A company passes if its ratio is below this threshold.
               </p>
            </div>
            <ThresholdsForm data={thresholds} />
         </div>
      </>
   )
}
