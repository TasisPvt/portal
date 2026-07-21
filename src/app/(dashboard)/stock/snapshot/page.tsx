import Link from "next/link"
import { ArrowRightIcon, FileSearchIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { StockEmptyState } from "@/src/components/stock-empty-state"
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
            <StockEmptyState
               icon={FileSearchIcon}
               title="No Active Snapshot Subscription"
               description="You need an active Snapshot plan to access company shariah screening data. Unlock detailed compliance verdicts, financial ratios, and screening history for any listed company."
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
         <SiteHeader breadcrumb="Stocks" title="Snapshot" />
         <SnapshotClient access={access} commonRemark={commonRemark} thresholds={thresholds} initialCompanyId={initialCompanyId} />
      </>
   )
}
