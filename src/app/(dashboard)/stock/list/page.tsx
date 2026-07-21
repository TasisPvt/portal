import Link from "next/link"
import { ArrowRightIcon, ListChecksIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { StockEmptyState } from "@/src/components/stock-empty-state"
import { getListSubscriptions } from "./_actions"
import { ListClient } from "./_components/list-client"

export default async function ListPage() {
   const subscriptions = await getListSubscriptions()

   if (!subscriptions.length) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="List" />
            <StockEmptyState
               icon={ListChecksIcon}
               title="No Active List Subscription"
               description="You need an active List plan to access shariah-screened company lists. Unlock complete index-wise lists with compliance status for every company."
               action={
                  <Button
                     asChild
                     size="lg"
                     className="rounded-xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                     <Link href="/plans">
                        Browse Plans
                        <ArrowRightIcon className="size-4" />
                     </Link>
                  </Button>
               }
            />
         </>
      )
   }

   return (
      <>
         <SiteHeader breadcrumb="Stocks" title="List" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main ">
               <ListClient subscriptions={subscriptions} />
            </div>
         </div>
      </>
   )
}
