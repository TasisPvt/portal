import Link from "next/link"
import { ListIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { getListSubscriptions } from "./_actions"
import { ListClient } from "./_components/list-client"

export default async function ListPage() {
   const subscriptions = await getListSubscriptions()

   if (!subscriptions.length) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="List" />
            <div className="flex flex-col items-center justify-center gap-4 p-6 py-24 text-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <ListIcon className="size-6 text-muted-foreground" />
               </div>
               <div>
                  <h2 className="text-lg font-semibold">No Active List Subscription</h2>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                     You need an active List plan to access shariah-screened company lists.
                  </p>
               </div>
               <Button asChild>
                  <Link href="/plans">Browse Plans</Link>
               </Button>
            </div>
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
