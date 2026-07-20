import { SlidersHorizontalIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getFinancialThresholds } from "./_actions"
import { ThresholdsForm } from "./_components/thresholds-form"

export default async function FinancialThresholdsPage() {
   const thresholds = await getFinancialThresholds()

   return (
      <>
         <SiteHeader breadcrumb="Master" title="Financial Ratio Thresholds" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
               <Card>
                  <CardHeader className="border-b">
                     <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <SlidersHorizontalIcon className="size-4.5 text-primary" />
                        Financial Ratio Thresholds
                     </CardTitle>
                     <CardDescription>
                        Set the threshold percentage for each financial ratio. A company passes if its ratio is below this threshold.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <ThresholdsForm data={thresholds} />
                  </CardContent>
               </Card>
            </div>
         </div>
      </>
   )
}
