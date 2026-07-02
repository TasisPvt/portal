import "server-only"

import { and, eq, gte, ne, sql } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { subscription, pricingPlan } from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"

// Snapshot subscription context, evaluated with the real validity rules rather
// than the (never-updated) `status` column:
//   • time window → subscription.endDate (computeEndDate already encodes it)
//   • total quota → distinct companies viewed vs stocksInDuration
export type SnapshotContext = {
   subscriptionId: string
   endDate: Date
   stocksInDuration: number | null
   totalViewed: number
   // Total quota is used up. The plan is "expired" for new companies, but the
   // user can still re-view companies already viewed today until the day ends.
   quotaExhausted: boolean
   viewedTodayIds: string[]
}

export type SubscriptionAccess = {
   userId: string
   // Any list plan still inside its (endDate-based) validity window.
   hasActiveList: boolean
   // A snapshot plan still inside its time window (may be quota-exhausted).
   hasActiveSnapshot: boolean
   snapshot: SnapshotContext | null
}

// A subscription counts as active when it is not cancelled and its endDate is
// still in the future. `status` is intentionally ignored for expiry because it
// is never written after creation (only cancellation updates it).
function activeWhere(userId: string, planType: "list" | "snapshot") {
   return and(
      eq(subscription.clientId, userId),
      ne(subscription.status, "cancelled"),
      gte(subscription.endDate, new Date()),
      eq(pricingPlan.type, planType),
   )
}

export async function getSubscriptionAccess(): Promise<SubscriptionAccess | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return null
   const userId = session.user.id

   const [listRows, snapRows] = await Promise.all([
      db
         .select({ id: subscription.id })
         .from(subscription)
         .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
         .where(activeWhere(userId, "list"))
         .limit(1),
      db
         .select({
            id: subscription.id,
            endDate: subscription.endDate,
            stocksInDuration: subscription.stocksInDurationSnapshot,
         })
         .from(subscription)
         .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
         .where(activeWhere(userId, "snapshot"))
         // Prefer the longest-lived active snapshot subscription.
         .orderBy(sql`${subscription.endDate} desc`)
         .limit(1),
   ])

   let snapshot: SnapshotContext | null = null
   if (snapRows.length) {
      const sub = snapRows[0]
      const today = new Date().toISOString().slice(0, 10)

      const [totalRow, viewedTodayRows] = await Promise.all([
         db
            .select({ cnt: sql<number>`count(distinct ${stockViewLog.companyId})` })
            .from(stockViewLog)
            .where(eq(stockViewLog.subscriptionId, sub.id)),
         db
            .select({ companyId: stockViewLog.companyId })
            .from(stockViewLog)
            .where(and(eq(stockViewLog.subscriptionId, sub.id), eq(stockViewLog.viewedDate, today))),
      ])

      const totalViewed = Number(totalRow[0]?.cnt ?? 0)
      const quotaExhausted =
         sub.stocksInDuration !== null && totalViewed >= sub.stocksInDuration

      snapshot = {
         subscriptionId: sub.id,
         endDate: sub.endDate,
         stocksInDuration: sub.stocksInDuration,
         totalViewed,
         quotaExhausted,
         viewedTodayIds: viewedTodayRows.map((r) => r.companyId),
      }
   }

   return {
      userId,
      hasActiveList: listRows.length > 0,
      hasActiveSnapshot: snapshot !== null,
      snapshot,
   }
}

// Can the user open the full snapshot detail for this specific company right now?
// True when a snapshot plan is in its window and either quota remains, or the
// company was already viewed today (free re-view).
export function canViewSnapshot(access: SubscriptionAccess, companyId: string): boolean {
   const s = access.snapshot
   if (!s) return false
   if (!s.quotaExhausted) return true
   return s.viewedTodayIds.includes(companyId)
}
