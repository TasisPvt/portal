import Link from "next/link"
import { PackageIcon } from "lucide-react"
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
import { getSnapshotAccess, getCommonRemark, getFinancialRatioThresholds } from "./_actions"
import { SnapshotClient } from "./_components/snapshot-client"

export default async function SnapshotPage({
   searchParams,
}: {
   searchParams: Promise<{ company?: string }>
}) {
   const [{ company: initialCompanyId }, access, commonRemark, thresholds] = await Promise.all([
      searchParams,
      getSnapshotAccess(),
      getCommonRemark(),
      getFinancialRatioThresholds(),
   ])

   if (!access) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="Snapshot" />
            <div className="flex flex-1 flex-col p-4 sm:p-6">
               <Empty className="py-24">
                  <EmptyHeader>
                     <EmptyMedia variant="icon" className="size-14 rounded-full bg-muted [&_svg:not([class*='size-'])]:size-6 text-muted-foreground">
                        <PackageIcon />
                     </EmptyMedia>
                     <EmptyTitle>No Active Snapshot Subscription</EmptyTitle>
                     <EmptyDescription>
                        You need an active Snapshot plan to access company shariah screening data.
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
         <SiteHeader breadcrumb="Stocks" title="Snapshot" />
         <SnapshotClient access={access} commonRemark={commonRemark} thresholds={thresholds} initialCompanyId={initialCompanyId} />
      </>
   )
}
