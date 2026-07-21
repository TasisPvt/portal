import Link from "next/link"
import { ArrowRightIcon, BookmarkPlusIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { StockEmptyState } from "@/src/components/stock-empty-state"
import { getWatchlist } from "./_actions"
import { WatchlistClient } from "./_components/watchlist-client"

export default async function WatchlistPage() {
   const data = await getWatchlist()

   if (data.noAccess) {
      return (
         <>
            <SiteHeader title="Watchlist" />
            <StockEmptyState
               icon={BookmarkPlusIcon}
               title="No Active Subscription"
               description="You need an active List or Snapshot plan to use your watchlist and monitor Shariah-compliant stocks. Unlock screening insights and compliance tracking for the companies you care about."
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
         <SiteHeader breadcrumb="Stocks" title="Watchlist" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col">
               <WatchlistClient items={data.items} hasActiveSnapshot={data.hasActiveSnapshot} />
            </div>
         </div>
      </>
   )
}
