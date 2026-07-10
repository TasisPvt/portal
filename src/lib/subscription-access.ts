import "server-only"

import { and, eq, gte, lt, ne, sql } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { subscription, pricingPlan } from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"

// Snapshot subscription context, evaluated with the real validity rules rather
// than the (never-updated) `status` column. Snapshot plans are gated only by a
// daily view limit, so validity is purely the time window:
//   • time window → subscription.endDate (computeEndDate already encodes it)
export type SnapshotContext = {
   subscriptionId: string
   endDate: Date
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

// Flips any of the user's active-but-past-endDate subscriptions to "expired" so
// the status column stays truthful. `status` is never updated at expiry time on
// its own, so this must be run whenever we want the column to be current (login,
// the subscriptions page, the snapshot page). Cheap — only stale rows are written.
export async function expireStaleSubscriptions(userId: string): Promise<void> {
   await db
      .update(subscription)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
         and(
            eq(subscription.clientId, userId),
            eq(subscription.status, "active"),
            lt(subscription.endDate, new Date()),
         ),
      )
}

// Global variant of expireStaleSubscriptions for admin surfaces (admin login,
// the admin subscriptions view) that need every client's status to be current,
// not just one user's. Only stale rows are written, so it stays cheap.
export async function expireAllStaleSubscriptions(): Promise<void> {
   await db
      .update(subscription)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
         and(
            eq(subscription.status, "active"),
            lt(subscription.endDate, new Date()),
         ),
      )
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

      const viewedTodayRows = await db
         .select({ companyId: stockViewLog.companyId })
         .from(stockViewLog)
         .where(and(eq(stockViewLog.subscriptionId, sub.id), eq(stockViewLog.viewedDate, today)))

      snapshot = {
         subscriptionId: sub.id,
         endDate: sub.endDate,
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

// Can the user open the full snapshot detail right now? Snapshot plans have no
// total cap anymore — access is granted whenever a snapshot plan is in its time
// window. The daily view limit is enforced (softly, with free same-day re-views)
// at view time in getCompanySnapshot.
export function canViewSnapshot(access: SubscriptionAccess): boolean {
   return access.snapshot !== null
}
