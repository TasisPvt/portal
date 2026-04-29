import { SiteHeader } from "@/src/components/site-header"
import { getActivePlans } from "./_actions"
import { PlansClientView } from "./_components/plans-client-view"

export default async function PlansPage() {
   const plans = await getActivePlans()

   return (
      <>
         <SiteHeader title="Plans" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Subscription Plans</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Choose a plan that fits your needs. Payment will be collected separately.
                     </p>
                  </div>
                  <div className="px-4 lg:px-6">
                     <PlansClientView plans={plans} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
