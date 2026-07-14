import Link from "next/link"
import { BookmarkIcon } from "lucide-react"

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
import { getWatchlist } from "./_actions"
import { WatchlistClient } from "./_components/watchlist-client"

export default async function WatchlistPage() {
   const data = await getWatchlist()

   if (data.noAccess) {
      return (
         <>
            <SiteHeader title="Watchlist" />
            <Empty className="py-24">
               <EmptyHeader>
                  <EmptyMedia variant="icon">
                     <BookmarkIcon />
                  </EmptyMedia>
                  <EmptyTitle>No Active Subscription</EmptyTitle>
                  <EmptyDescription>
                     You need an active List or Snapshot plan to use your watchlist.
                  </EmptyDescription>
               </EmptyHeader>
               <EmptyContent>
                  <Button asChild>
                     <Link href="/plans">Browse Plans</Link>
                  </Button>
               </EmptyContent>
            </Empty>
         </>
      )
   }

   return (
      <>
         <SiteHeader breadcrumb="Stocks" title="Watchlist" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main">
               <WatchlistClient items={data.items} hasActiveSnapshot={data.hasActiveSnapshot} />
            </div>
         </div>
      </>
   )
}
