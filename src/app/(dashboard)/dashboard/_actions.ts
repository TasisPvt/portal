"use server"

import { and, count, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { payment, pricingPlan, subscription } from "@/src/db/schema"
import { expireStaleSubscriptions, getSubscriptionAccess } from "@/src/lib/subscription-access"
import { getWatchlist } from "../stock/watchlist/_actions"
import { getGlobalDashboardStats } from "./_global-stats"

// Widget tuning knobs.
const SOON_EXPIRING_DAYS = 7
const WATCHLIST_PREVIEW = 4
const RECENT_INVOICES_LIMIT = 3
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
   // Distinct clients currently holding an active subscription to this plan.
   subscribers: number
}

export type DashboardInvoice = {
   id: string
   planName: string | null
   durationType: string
   amount: string
   createdAt: Date
}

export type ClientDashboard = {
   firstName: string
   companiesScreened: number
   // KPI row: all-time plans + compliant-company count for the latest month.
   totalPlansTillDate: number
   compliantCompanies: number
   compliantMonth: string | null // "YYYY-MM" of the latest screening
   subscriptions: DashboardSubscription[]
   watchlist: DashboardWatchItem[]
   hasWatchlistAccess: boolean
   hasActiveSnapshot: boolean
   mostViewed: DashboardStock[]
   popularLists: DashboardList[]
   recentInvoices: DashboardInvoice[]
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

   const [globalStats, activeSubs, watchlistData, access, totalPlansRow, invoiceRows] =
      await Promise.all([
         // Cached, request-independent global stats.
         getGlobalDashboardStats(),
         // The user's active subscriptions (soonest-expiring first).
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
         // The user's watchlist (already newest-first).
         getWatchlist(),
         // Snapshot access → drives lock state on the trending widget.
         getSubscriptionAccess(),
         // Every plan the user has ever subscribed to (any status) - "till date".
         db.select({ c: count() }).from(subscription).where(eq(subscription.clientId, userId)),
         // Latest paid payments - each has a downloadable tax invoice.
         db
            .select({
               id: payment.id,
               planName: pricingPlan.name,
               durationType: payment.durationType,
               amount: payment.priceSnapshot,
               createdAt: payment.createdAt,
            })
            .from(payment)
            .leftJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
            .where(and(eq(payment.clientId, userId), eq(payment.status, "paid")))
            .orderBy(desc(payment.createdAt))
            .limit(RECENT_INVOICES_LIMIT),
      ])

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

   const recentInvoices: DashboardInvoice[] = invoiceRows

   return {
      firstName,
      companiesScreened: globalStats.companiesScreened,
      totalPlansTillDate: totalPlansRow[0]?.c ?? 0,
      compliantCompanies: globalStats.compliantCompanies,
      compliantMonth: globalStats.compliantMonth,
      subscriptions,
      watchlist,
      hasWatchlistAccess: !watchlistData.noAccess,
      hasActiveSnapshot: access?.hasActiveSnapshot ?? false,
      mostViewed: globalStats.mostViewed,
      popularLists: globalStats.popularLists,
      recentInvoices,
   }
}
