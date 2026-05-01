import Link from "next/link"
import { PackageIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { getSnapshotAccess } from "./_actions"
import { SnapshotClient } from "./_components/snapshot-client"

export default async function SnapshotPage() {
   const access = await getSnapshotAccess()

   if (!access) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="Snapshot" />
            <div className="flex flex-col items-center justify-center gap-4 p-6 py-24 text-center">
               <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <PackageIcon className="size-6 text-muted-foreground" />
               </div>
               <div>
                  <h2 className="text-lg font-semibold">No Active Snapshot Subscription</h2>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                     You need an active Snapshot plan to access company shariah screening data.
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
         <SiteHeader breadcrumb="Stocks" title="Snapshot" />
         <SnapshotClient access={access} />
      </>
   )
}
