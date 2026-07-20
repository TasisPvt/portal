import { ClipboardCheckIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getScreeningStandards, getCommonRemark } from "./_actions"
import { StandardsForm } from "./_components/standards-form"

export default async function TasisScreeningStandardsPage() {
   const [standards, commonRemark] = await Promise.all([getScreeningStandards(), getCommonRemark()])

   return (
      <>
         <SiteHeader breadcrumb="Master" title="TASIS Screening Standards" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
               <Card>
                  <CardHeader className="border-b">
                     <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ClipboardCheckIcon className="size-4.5 text-primary" />
                        TASIS Screening Standards
                     </CardTitle>
                     <CardDescription>
                        Set the PASS and FAIL remark for each screening parameter. These remarks are shown on the stock snapshot page based on the company&apos;s actual compliance value.
                     </CardDescription>
                  </CardHeader>
                  <CardContent>
                     <StandardsForm data={standards} commonRemark={commonRemark} />
                  </CardContent>
               </Card>
            </div>
         </div>
      </>
   )
}
