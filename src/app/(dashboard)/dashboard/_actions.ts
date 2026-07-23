"use server"

import { randomUUID } from "crypto"
import { and, count, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { payment, pricingPlan, subscription } from "@/src/db/schema"
import { expireStaleSubscriptions, getSubscriptionAccess } from "@/src/lib/subscription-access"
import { TRIAL_PLAN_ID, TRIAL_PLAN_NAME, TRIAL_DAYS, TRIAL_STOCKS_PER_DAY } from "@/src/lib/constants"
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
   // Show the "claim your free trial" banner: never claimed the trial before
   // and currently without an active snapshot plan (so the trial isn't wasted).
   trialEligible: boolean
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

   const [globalStats, activeSubs, watchlistData, access, totalPlansRow, invoiceRows, trialRows] =
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
         // Ever claimed the free trial (any status)? One trial per client, forever.
         db
            .select({ id: subscription.id })
            .from(subscription)
            .where(and(eq(subscription.clientId, userId), eq(subscription.planId, TRIAL_PLAN_ID)))
            .limit(1),
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
      trialEligible: trialRows.length === 0 && !(access?.hasActiveSnapshot ?? false),
   }
}

// ─── Free snapshot trial claim ───────────────────────────────────────────────

type ClaimTrialResult = { success: true } | { success: false; message: string }

export async function claimSnapshotTrial(): Promise<ClaimTrialResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Please sign in first." }
   const userId = session.user.id

   try {
      const result = await db.transaction(async (tx): Promise<ClaimTrialResult> => {
         // Ensure the hidden system plan exists (isActive: false keeps it off
         // the Plans page; access checks don't filter on isActive).
         await tx
            .insert(pricingPlan)
            .values({
               id: TRIAL_PLAN_ID,
               name: TRIAL_PLAN_NAME,
               type: "snapshot",
               isActive: false,
            })
            .onConflictDoNothing()

         // One trial per client, forever - regardless of its current status.
         const [claimed] = await tx
            .select({ id: subscription.id })
            .from(subscription)
            .where(and(eq(subscription.clientId, userId), eq(subscription.planId, TRIAL_PLAN_ID)))
            .limit(1)
         if (claimed) return { success: false, message: "You've already used your free trial." }

         const now = new Date()
         await tx.insert(subscription).values({
            id: randomUUID(),
            clientId: userId,
            planId: TRIAL_PLAN_ID,
            durationType: "trial",
            status: "active",
            startDate: now,
            endDate: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
            priceSnapshot: "0",
            taxableAmount: "0",
            cgst: "0",
            sgst: "0",
            igst: "0",
            gstRate: "0",
            placeOfSupply: "",
            stocksPerDaySnapshot: TRIAL_STOCKS_PER_DAY,
            createdAt: now,
            updatedAt: now,
         })
         return { success: true }
      })

      if (result.success) {
         revalidatePath("/dashboard")
         revalidatePath("/stock/snapshot")
         revalidatePath("/stock/watchlist")
         revalidatePath("/subscriptions")
      }
      return result
   } catch (err) {
      console.error("[claimSnapshotTrial]", err)
      return { success: false, message: "Something went wrong. Please try again." }
   }
}
