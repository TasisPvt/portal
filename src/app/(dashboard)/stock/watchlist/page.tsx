import Link from "next/link"
import { ArrowRightIcon, BookmarkPlusIcon, InfoIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
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
               {data.hasActiveSnapshot && data.items.length > 0 && (
                  <div className="px-4 pt-4 sm:px-6 sm:pt-6">
                     <Alert className="border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10">
                        <InfoIcon className="text-amber-600 dark:text-amber-400" />
                        <AlertDescription className="text-amber-700 dark:text-amber-300/80">
                           Opening a Stock Snapshot from your Watchlist will be counted as one Snapshot View and will count towards your daily viewing limit under your subscription plan.
                        </AlertDescription>
                     </Alert>
                  </div>
               )}
               <WatchlistClient items={data.items} hasActiveSnapshot={data.hasActiveSnapshot} />
            </div>
         </div>
      </>
   )
}
