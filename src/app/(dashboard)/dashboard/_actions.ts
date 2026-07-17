"use server"

import { and, count, countDistinct, desc, eq, inArray } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   companyMaster,
   companyShariah,
   payment,
   pricingPlan,
   subscription,
} from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"
import { expireStaleSubscriptions, getSubscriptionAccess } from "@/src/lib/subscription-access"
import { getWatchlist } from "../stock/watchlist/_actions"

// Widget tuning knobs.
const SOON_EXPIRING_DAYS = 7
const WATCHLIST_PREVIEW = 5
const MOST_VIEWED_LIMIT = 3
const MOST_PURCHASED_LIMIT = 2
const DAY_MS = 24 * 60 * 60 * 1000

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardSubscription = {
   id: string
   planName: string | null
   planType: string | null
   durationType: string
   endDate: Date
   daysLeft: number
   soonExpiring: boolean
}

export type DashboardWatchItem = {
   id: string
   companyName: string
   nseSymbol: string | null
   shariahStatus: number | null
}

export type DashboardStock = {
   id: string
   companyName: string
   nseSymbol: string | null
   shariahStatus: number | null
   views: number
}

export type DashboardList = {
   planId: string
   name: string
   purchases: number
   priceFrom: number | null
}

export type ClientDashboard = {
   firstName: string
   companiesScreened: number
   subscriptions: DashboardSubscription[]
   watchlist: DashboardWatchItem[]
   hasWatchlistAccess: boolean
   hasActiveSnapshot: boolean
   mostViewed: DashboardStock[]
   mostPurchasedLists: DashboardList[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Latest known shariah status per company (one row each, newest month).
async function latestShariahStatus(ids: string[]): Promise<Map<string, number | null>> {
   if (!ids.length) return new Map()
   const rows = await db
      .selectDistinctOn([companyShariah.companyId], {
         companyId: companyShariah.companyId,
         shariahStatus: companyShariah.shariahStatus,
      })
      .from(companyShariah)
      .where(inArray(companyShariah.companyId, ids))
      .orderBy(companyShariah.companyId, desc(companyShariah.month))
   return new Map(rows.map((r) => [r.companyId, r.shariahStatus]))
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function getClientDashboard(): Promise<ClientDashboard | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return null
   const userId = session.user.id
   const firstName = session.user.name?.split(" ")[0] ?? "there"

   // Keep the status column truthful before reading the user's active plans.
   await expireStaleSubscriptions(userId)

   const now = new Date()
   const soonThreshold = new Date(now.getTime() + SOON_EXPIRING_DAYS * DAY_MS)

   const [screenedRow, activeSubs, watchlistData, access, viewedRows, purchasedRows] =
      await Promise.all([
         // ① Distinct companies we have Shariah screening data for.
         db.select({ c: countDistinct(companyShariah.companyId) }).from(companyShariah),
         // ② The user's active subscriptions (soonest-expiring first).
         db
            .select({
               id: subscription.id,
               planName: pricingPlan.name,
               planType: pricingPlan.type,
               durationType: subscription.durationType,
               endDate: subscription.endDate,
            })
            .from(subscription)
            .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
            .where(and(eq(subscription.clientId, userId), eq(subscription.status, "active")))
            .orderBy(subscription.endDate),
         // ③ The user's watchlist (already newest-first).
         getWatchlist(),
         // ④a snapshot access → drives lock state on the trending widget.
         getSubscriptionAccess(),
         // ④b Most-viewed companies across all clients (global popularity).
         db
            .select({
               id: companyMaster.id,
               companyName: companyMaster.companyName,
               nseSymbol: companyMaster.nseSymbol,
               views: count(stockViewLog.id),
            })
            .from(stockViewLog)
            .innerJoin(companyMaster, eq(stockViewLog.companyId, companyMaster.id))
            .groupBy(companyMaster.id, companyMaster.companyName, companyMaster.nseSymbol)
            .orderBy(desc(count(stockViewLog.id)))
            .limit(MOST_VIEWED_LIMIT),
         // ⑤ Most-purchased list plans (paid payments, all-time).
         db
            .select({
               planId: pricingPlan.id,
               name: pricingPlan.name,
               purchases: count(payment.id),
               oneTimePrice: pricingPlan.oneTimePrice,
               quarterlyPrice: pricingPlan.quarterlyPrice,
               annualPrice: pricingPlan.annualPrice,
            })
            .from(payment)
            .innerJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
            .where(and(eq(payment.status, "paid"), eq(pricingPlan.type, "list")))
            .groupBy(
               pricingPlan.id,
               pricingPlan.name,
               pricingPlan.oneTimePrice,
               pricingPlan.quarterlyPrice,
               pricingPlan.annualPrice,
            )
            .orderBy(desc(count(payment.id)))
            .limit(MOST_PURCHASED_LIMIT),
      ])

   const statusMap = await latestShariahStatus(viewedRows.map((r) => r.id))

   const subscriptions: DashboardSubscription[] = activeSubs.map((s) => {
      const daysLeft = Math.max(0, Math.ceil((s.endDate.getTime() - now.getTime()) / DAY_MS))
      return {
         id: s.id,
         planName: s.planName,
         planType: s.planType,
         durationType: s.durationType,
         endDate: s.endDate,
         daysLeft,
         soonExpiring: s.endDate <= soonThreshold,
      }
   })

   const watchlist: DashboardWatchItem[] = watchlistData.noAccess
      ? []
      : watchlistData.items.slice(0, WATCHLIST_PREVIEW).map((it) => ({
           id: it.id,
           companyName: it.companyName,
           nseSymbol: it.nseSymbol,
           shariahStatus: it.shariahStatus,
        }))

   const mostViewed: DashboardStock[] = viewedRows.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      nseSymbol: r.nseSymbol,
      shariahStatus: statusMap.get(r.id) ?? null,
      views: r.views,
   }))

   const mostPurchasedLists: DashboardList[] = purchasedRows.map((r) => {
      // Cheapest advertised entry point for the plan → "from ₹X".
      const prices = [r.oneTimePrice, r.quarterlyPrice, r.annualPrice]
         .map((p) => (p != null ? parseFloat(p) : NaN))
         .filter((n) => Number.isFinite(n) && n > 0)
      return {
         planId: r.planId,
         name: r.name,
         purchases: r.purchases,
         priceFrom: prices.length ? Math.min(...prices) : null,
      }
   })

   return {
      firstName,
      companiesScreened: screenedRow[0]?.c ?? 0,
      subscriptions,
      watchlist,
      hasWatchlistAccess: !watchlistData.noAccess,
      hasActiveSnapshot: access?.hasActiveSnapshot ?? false,
      mostViewed,
      mostPurchasedLists,
   }
}
