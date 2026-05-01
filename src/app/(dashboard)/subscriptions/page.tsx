import Link from "next/link"
import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { getMySubscriptions } from "./_actions"
import { MySubscriptionsTable } from "./_components/my-subscriptions-table"

export default async function MySubscriptionsPage() {
   const subscriptions = await getMySubscriptions()
   const active = subscriptions.filter((s) => s.status === "active").length

   return (
      <>
         <SiteHeader title="My Subscriptions" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <div>
                        <h2 className="text-xl font-semibold tracking-tight">My Subscriptions</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                           {active} active subscription{active !== 1 ? "s" : ""}
                        </p>
                     </div>
                     <Button asChild size="sm" variant="outline">
                        <Link href="/plans">Browse Plans</Link>
                     </Button>
                  </div>
                  <div className="px-4 lg:px-6">
                     <MySubscriptionsTable data={subscriptions} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
