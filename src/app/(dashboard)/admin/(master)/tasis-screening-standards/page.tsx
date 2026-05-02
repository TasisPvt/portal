import { SiteHeader } from "@/src/components/site-header"
import { getScreeningStandards, getCommonRemark } from "./_actions"
import { StandardsForm } from "./_components/standards-form"

export default async function TasisScreeningStandardsPage() {
   const [standards, commonRemark] = await Promise.all([getScreeningStandards(), getCommonRemark()])

   return (
      <>
         <SiteHeader breadcrumb="Master" title="TASIS Screening Standards" />
         <div className="flex flex-col gap-6 p-6">
            <div>
               <h1 className="text-xl font-semibold">TASIS Screening Standards</h1>
               <p className="mt-1 text-sm text-muted-foreground">
                  Set the PASS and FAIL remark for each screening parameter. These remarks are shown on the stock snapshot page based on the company's actual compliance value.
               </p>
            </div>
            <StandardsForm data={standards} commonRemark={commonRemark} />
         </div>
      </>
   )
}
