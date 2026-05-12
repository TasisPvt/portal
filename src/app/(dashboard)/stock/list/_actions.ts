"use server"

import { and, desc, eq, inArray, lt, isNotNull } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   companyMaster,
   companyShariah,
   indexMaster,
   industryGroup,
   pricingPlan,
   subscription,
   subscriptionListSnapshot,
} from "@/src/db/schema"

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
}

export type ListCompaniesResult = {
   companies: ListCompany[]
   availableMonths: string[] // all snapshotted months, newest first
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
   if (!session) return { companies: [], availableMonths: [] }

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

   if (!sub) return { companies: [], availableMonths: [] }

   // ── All snapshotted months for this subscription (newest first) ────────────
   // Written at subscription creation (startMonth) and on every monthly
   // shariah import for quarterly/annual subscriptions.
   const monthRows = await db
      .selectDistinct({ month: subscriptionListSnapshot.month })
      .from(subscriptionListSnapshot)
      .where(eq(subscriptionListSnapshot.subscriptionId, subscriptionId))
      .orderBy(desc(subscriptionListSnapshot.month))

   const availableMonths = monthRows.map((r) => r.month)
   if (!availableMonths.length) return { companies: [], availableMonths: [] }

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

   if (!companies.length) return { companies: [], availableMonths }

   const companyIds = companies.map((c) => c.id)

   // ── Shariah data for targetMonth ───────────────────────────────────────────
   const shariahSelectFields = {
      companyId: companyShariah.companyId,
      month: companyShariah.month,
      shariahStatus: companyShariah.shariahStatus,
      companyStatus: companyShariah.companyStatus,
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

   return { companies: mapCompanies(companies, shariahMap), availableMonths }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ShariahRow = { companyId: string; month: string; shariahStatus: number | null; companyStatus: string | null }
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
      }
   })
}
