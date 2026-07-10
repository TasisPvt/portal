import Link from "next/link"
import { ListIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
   EmptyContent,
} from "@/src/components/ui/empty"
import { SiteHeader } from "@/src/components/site-header"
import { getListSubscriptions } from "./_actions"
import { ListClient } from "./_components/list-client"

export default async function ListPage() {
   const subscriptions = await getListSubscriptions()

   if (!subscriptions.length) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="List" />
            <div className="flex flex-1 flex-col p-4 sm:p-6">
               <Empty className="py-24">
                  <EmptyHeader>
                     <EmptyMedia variant="icon" className="size-14 rounded-full bg-muted [&_svg:not([class*='size-'])]:size-6 text-muted-foreground">
                        <ListIcon />
                     </EmptyMedia>
                     <EmptyTitle>No Active List Subscription</EmptyTitle>
                     <EmptyDescription>
                        You need an active List plan to access shariah-screened company lists.
                     </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                     <Button asChild>
                        <Link href="/plans">Browse Plans</Link>
                     </Button>
                  </EmptyContent>
               </Empty>
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
