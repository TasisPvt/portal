"use server"

import { randomUUID } from "crypto"
import { and, desc, eq, inArray, lt, isNotNull } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   companyMaster,
   companyShariah,
   indexCompany,
   indexMaster,
   industryGroup,
   pricingPlan,
   subscription,
   subscriptionListSnapshot,
   subscriptionMonthUnlock,
} from "@/src/db/schema"
import { ANNUAL_LIST_MONTH_VIEWS } from "@/src/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

export type ListSubscription = {
   subscriptionId: string
   indexId: string
   indexName: string
   indexDescription: string | null
   durationType: string
   startMonth: string // YYYY-MM
   endMonth: string   // YYYY-MM
}

export type ListCompany = {
   id: string
   companyName: string
   isinCode: string | null
   bseScripCode: string | null
   bseScripId: string | null
   bseGroup: string | null
   nseSymbol: string | null
   serviceGroup: string | null
   nseListingDate: string | null
   nseDelistingDate: string | null
   bseListingDate: string | null
   bseDelistingDate: string | null
   industryGroup: string | null
   month: string | null
   shariahStatus: number | null
   companyStatus: string | null
   marketCap: string | null
}

// Month-view quota state for annual list subscriptions (null for other durations).
export type ListMonthViews = {
   used: number
   limit: number
   currentMonth: string // YYYY-MM
   currentMonthUnlocked: boolean
   canUnlock: boolean // current month locked and views remaining
}

export type ListCompaniesResult = {
   companies: ListCompany[]
   availableMonths: string[] // viewable months, newest first (annual: unlocked only)
   monthViews: ListMonthViews | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getListSubscriptions(): Promise<ListSubscription[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return []

   const rows = await db
      .select({
         subscriptionId: subscription.id,
         indexId: pricingPlan.indexId,
         indexName: indexMaster.name,
         indexDescription: indexMaster.description,
         durationType: subscription.durationType,
         startDate: subscription.startDate,
         endDate: subscription.endDate,
      })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .innerJoin(indexMaster, eq(pricingPlan.indexId, indexMaster.id))
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            eq(subscription.status, "active"),
            eq(pricingPlan.type, "list"),
            isNotNull(pricingPlan.indexId),
         ),
      )

   return rows
      .filter((r) => r.indexId !== null)
      .map((r) => ({
         subscriptionId: r.subscriptionId,
         indexId: r.indexId!,
         indexName: r.indexName,
         indexDescription: r.indexDescription,
         durationType: r.durationType,
         startMonth: r.startDate.toISOString().slice(0, 7),
         endMonth: r.endDate.toISOString().slice(0, 7),
      }))
}

// selectedMonth = "YYYY-MM" to pin a specific month (quarterly/annual only)
export async function getListCompanies(
   subscriptionId: string,
   selectedMonth?: string,
): Promise<ListCompaniesResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { companies: [], availableMonths: [], monthViews: null }

   // Verify the subscription belongs to this user
   const [sub] = await db
      .select({ durationType: subscription.durationType })
      .from(subscription)
      .where(
         and(
            eq(subscription.id, subscriptionId),
            eq(subscription.clientId, session.user.id),
            eq(subscription.status, "active"),
         ),
      )
      .limit(1)

   if (!sub) return { companies: [], availableMonths: [], monthViews: null }

   // ── Determine viewable months (newest first) ───────────────────────────────
   // Snapshots are written at subscription creation (startMonth) and on every
   // monthly shariah import for quarterly/annual subscriptions.
   // Annual subs are additionally gated: only explicitly unlocked months
   // (ANNUAL_LIST_MONTH_VIEWS per term) are viewable.
   let availableMonths: string[]
   let monthViews: ListMonthViews | null = null

   if (sub.durationType === "annual") {
      const unlockRows = await db
         .select({ month: subscriptionMonthUnlock.month })
         .from(subscriptionMonthUnlock)
         .where(eq(subscriptionMonthUnlock.subscriptionId, subscriptionId))
         .orderBy(desc(subscriptionMonthUnlock.month))

      const currentMonth = new Date().toISOString().slice(0, 7)
      const currentMonthUnlocked = unlockRows.some((r) => r.month === currentMonth)
      availableMonths = unlockRows.map((r) => r.month)
      monthViews = {
         used: unlockRows.length,
         limit: ANNUAL_LIST_MONTH_VIEWS,
         currentMonth,
         currentMonthUnlocked,
         canUnlock: !currentMonthUnlocked && unlockRows.length < ANNUAL_LIST_MONTH_VIEWS,
      }
   } else {
      const monthRows = await db
         .selectDistinct({ month: subscriptionListSnapshot.month })
         .from(subscriptionListSnapshot)
         .where(eq(subscriptionListSnapshot.subscriptionId, subscriptionId))
         .orderBy(desc(subscriptionListSnapshot.month))

      availableMonths = monthRows.map((r) => r.month)
   }

   if (!availableMonths.length) return { companies: [], availableMonths: [], monthViews }

   // ── Determine which month to display ──────────────────────────────────────
   // one_time always has exactly one snapshotted month (the effective month).
   // quarterly/annual: use selectedMonth if valid, otherwise latest snapshotted.
   const targetMonth =
      sub.durationType === "one_time"
         ? availableMonths[0]
         : selectedMonth && availableMonths.includes(selectedMonth)
           ? selectedMonth
           : availableMonths[0]

   // ── Company list from snapshot for targetMonth ─────────────────────────────
   const companies = await db
      .select({
         id: companyMaster.id,
         companyName: companyMaster.companyName,
         isinCode: companyMaster.isinCode,
         bseScripCode: companyMaster.bseScripCode,
         bseScripId: companyMaster.bseScripId,
         bseGroup: companyMaster.bseGroup,
         nseSymbol: companyMaster.nseSymbol,
         serviceGroup: companyMaster.serviceGroup,
         nseListingDate: companyMaster.nseListingDate,
         nseDelistingDate: companyMaster.nseDelistingDate,
         bseListingDate: companyMaster.bseListingDate,
         bseDelistingDate: companyMaster.bseDelistingDate,
         industryGroupName: industryGroup.name,
      })
      .from(subscriptionListSnapshot)
      .innerJoin(companyMaster, eq(subscriptionListSnapshot.companyId, companyMaster.id))
      .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
      .where(
         and(
            eq(subscriptionListSnapshot.subscriptionId, subscriptionId),
            eq(subscriptionListSnapshot.month, targetMonth),
         ),
      )

   if (!companies.length) return { companies: [], availableMonths, monthViews }

   const companyIds = companies.map((c) => c.id)

   // ── Shariah data for targetMonth ───────────────────────────────────────────
   const shariahSelectFields = {
      companyId: companyShariah.companyId,
      month: companyShariah.month,
      shariahStatus: companyShariah.shariahStatus,
      companyStatus: companyShariah.companyStatus,
      marketCap: companyShariah.marketCap,
   }

   const shariahRows = await db
      .select(shariahSelectFields)
      .from(companyShariah)
      .where(
         and(
            inArray(companyShariah.companyId, companyIds),
            eq(companyShariah.month, targetMonth),
         ),
      )

   const shariahMap = new Map<string, (typeof shariahRows)[0]>()
   for (const row of shariahRows) {
      shariahMap.set(row.companyId, row)
   }

   // ── Fallback for quarterly/annual ──────────────────────────────────────────
   // If individual companies have no shariah data for targetMonth yet
   // (e.g. they were skipped in the import), show their most recent prior month.
   // Not applicable for one_time — the effectiveMonth was chosen precisely
   // because it had data.
   if (sub.durationType !== "one_time") {
      const missingIds = companyIds.filter((id) => !shariahMap.has(id))
      if (missingIds.length > 0) {
         const fallbackRows = await db
            .select(shariahSelectFields)
            .from(companyShariah)
            .where(
               and(
                  inArray(companyShariah.companyId, missingIds),
                  lt(companyShariah.month, targetMonth),
               ),
            )
            .orderBy(companyShariah.companyId, desc(companyShariah.month))

         for (const row of fallbackRows) {
            if (!shariahMap.has(row.companyId)) {
               shariahMap.set(row.companyId, row)
            }
         }
      }
   }

   return { companies: mapCompanies(companies, shariahMap), availableMonths, monthViews }
}

// ─── Month unlock (annual list subs) ──────────────────────────────────────────

export type UnlockMonthResult =
   | { ok: true; month: string }
   | { ok: false; error: "unauthorized" | "not_annual" | "already_unlocked" | "limit_reached" }

// Consumes one of the subscription's month views to make the CURRENT month's
// list viewable for the rest of the term. Past months can never be unlocked.
export async function unlockCurrentMonth(subscriptionId: string): Promise<UnlockMonthResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { ok: false, error: "unauthorized" }

   const month = new Date().toISOString().slice(0, 7)

   return db.transaction(async (tx): Promise<UnlockMonthResult> => {
      // Lock the subscription row so concurrent unlocks can't exceed the quota.
      const [sub] = await tx
         .select({
            id: subscription.id,
            durationType: subscription.durationType,
            planType: pricingPlan.type,
            indexId: pricingPlan.indexId,
         })
         .from(subscription)
         .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
         .where(
            and(
               eq(subscription.id, subscriptionId),
               eq(subscription.clientId, session.user.id),
               eq(subscription.status, "active"),
            ),
         )
         .limit(1)
         .for("update", { of: subscription })

      if (!sub || sub.planType !== "list") return { ok: false, error: "unauthorized" }
      if (sub.durationType !== "annual") return { ok: false, error: "not_annual" }

      const unlocked = await tx
         .select({ month: subscriptionMonthUnlock.month })
         .from(subscriptionMonthUnlock)
         .where(eq(subscriptionMonthUnlock.subscriptionId, subscriptionId))

      if (unlocked.some((u) => u.month === month)) return { ok: false, error: "already_unlocked" }
      if (unlocked.length >= ANNUAL_LIST_MONTH_VIEWS) return { ok: false, error: "limit_reached" }

      await tx
         .insert(subscriptionMonthUnlock)
         .values({ id: randomUUID(), subscriptionId, month })
         .onConflictDoNothing()

      // Ensure the month's list snapshot exists. It's normally written by the
      // monthly shariah import; if the user unlocks before this month's publish,
      // freeze the index membership now (mirrors the purchase-time snapshot —
      // shariah data falls back to each company's most recent prior month).
      const [snapshotExists] = await tx
         .select({ id: subscriptionListSnapshot.id })
         .from(subscriptionListSnapshot)
         .where(
            and(
               eq(subscriptionListSnapshot.subscriptionId, subscriptionId),
               eq(subscriptionListSnapshot.month, month),
            ),
         )
         .limit(1)

      if (!snapshotExists && sub.indexId) {
         const members = await tx
            .select({ companyId: indexCompany.companyId })
            .from(indexCompany)
            .where(eq(indexCompany.indexId, sub.indexId))

         if (members.length) {
            await tx
               .insert(subscriptionListSnapshot)
               .values(
                  members.map((m) => ({
                     id: randomUUID(),
                     subscriptionId,
                     companyId: m.companyId,
                     month,
                  })),
               )
               .onConflictDoNothing()
         }
      }

      return { ok: true, month }
   })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ShariahRow = { companyId: string; month: string; shariahStatus: number | null; companyStatus: string | null; marketCap: string | null }
type CompanyRow = { id: string; companyName: string; isinCode: string | null; bseScripCode: string | null; bseScripId: string | null; bseGroup: string | null; nseSymbol: string | null; serviceGroup: string | null; nseListingDate: string | null; nseDelistingDate: string | null; bseListingDate: string | null; bseDelistingDate: string | null; industryGroupName: string | null }

function mapCompanies(companies: CompanyRow[], shariahMap: Map<string, ShariahRow>): ListCompany[] {
   return companies.map((c) => {
      const s = shariahMap.get(c.id) ?? null
      return {
         id: c.id,
         companyName: c.companyName,
         isinCode: c.isinCode,
         bseScripCode: c.bseScripCode,
         bseScripId: c.bseScripId,
         bseGroup: c.bseGroup,
         nseSymbol: c.nseSymbol,
         serviceGroup: c.serviceGroup,
         nseListingDate: c.nseListingDate,
         nseDelistingDate: c.nseDelistingDate,
         bseListingDate: c.bseListingDate,
         bseDelistingDate: c.bseDelistingDate,
         industryGroup: c.industryGroupName,
         month: s?.month ?? null,
         shariahStatus: s?.shariahStatus ?? null,
         companyStatus: s?.companyStatus ?? null,
         marketCap: s?.marketCap ?? null,
      }
   })
}
