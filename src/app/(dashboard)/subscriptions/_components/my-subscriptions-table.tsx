"use client"

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
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import { SubscriptionStatusBadge as StatusBadge } from "@/src/components/subscription-status-badge"

type SubscriptionRow = {
   id: string
   planName: string | null
   planType: string | null
   durationType: string
   status: string
   startDate: Date
   endDate: Date
   priceSnapshot: string
   stocksPerDaySnapshot: number | null
   stocksInDurationSnapshot: number | null
}

export function MySubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
   if (data.length === 0) {
      return (
         <Empty className="border py-16">
            <EmptyHeader>
               <EmptyMedia variant="icon">
                  <PackageIcon />
               </EmptyMedia>
               <EmptyTitle>No subscriptions yet</EmptyTitle>
               <EmptyDescription>
                  You haven&apos;t subscribed to any plans yet. Browse our plans to get started.
               </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
               <Button asChild>
                  <Link href="/plans">Browse plans</Link>
               </Button>
            </EmptyContent>
         </Empty>
      )
   }

   return (
      <div className="overflow-x-auto rounded-xl border">
         <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
               <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Expires</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Price</th>
               </tr>
            </thead>
            <tbody className="divide-y">
               {data.map((row) => (
                  <tr key={row.id} className={row.status !== "active" ? "opacity-60" : ""}>
                     <td className="px-4 py-3">
                        <div className="font-medium">{row.planName ?? "—"}</div>
                        {row.planType && (
                           <div className="text-xs text-muted-foreground capitalize">{row.planType}</div>
                        )}
                     </td>
                     <td className="whitespace-nowrap px-4 py-3">
                        {DURATION_LABELS[row.durationType] ?? row.durationType}
                     </td>
                     <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                     </td>
                     <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {fmtDate(row.startDate)}
                     </td>
                     <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {fmtDate(row.endDate)}
                     </td>
                     <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                        {fmtPrice(row.priceSnapshot)}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   )
}
