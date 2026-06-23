import { SiteHeader } from "@/src/components/site-header"
import { getActivePlans, getSubscribedPlanIds, getCurrentClientState } from "./_actions"
import { PlansClientView } from "./_components/plans-client-view"

export default async function PlansPage() {
   const [plans, subscribedPlanIds, customerState] = await Promise.all([
      getActivePlans(),
      getSubscribedPlanIds(),
      getCurrentClientState(),
   ])

   return (
      <>
         <SiteHeader title="Plans" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Subscription Plans</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Choose a plan that fits your needs. Pay securely online and your subscription activates instantly.
                     </p>
                  </div>
                  <div className="px-4 lg:px-6">
                     <PlansClientView plans={plans} subscribedPlanIds={subscribedPlanIds} customerState={customerState} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
