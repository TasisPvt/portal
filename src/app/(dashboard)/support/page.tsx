import { SiteHeader } from "@/src/components/site-header"
import { getMyTickets, getMySubscriptionOptions } from "./_actions"
import { SupportClient } from "./_components/support-client"

export default async function SupportPage() {
   const [tickets, subscriptionOptions] = await Promise.all([
      getMyTickets(),
      getMySubscriptionOptions(),
   ])

   return (
      <>
         <SiteHeader title="Support" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main">
               <SupportClient tickets={tickets} subscriptionOptions={subscriptionOptions} />
            </div>
         </div>
      </>
   )
}
