"use cache"

import { and, count, countDistinct, desc, eq, gte, inArray, sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { db } from "@/src/db/client"
import { companyMaster, companyShariah, pricingPlan, subscription } from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"
import type { DashboardStock, DashboardList } from "./_actions"

const MOST_VIEWED_LIMIT = 3
const POPULAR_LISTS_LIMIT = 3

export type GlobalDashboardStats = {
   companiesScreened: number
   compliantCompanies: number
   compliantMonth: string | null
   mostViewed: DashboardStock[]
   popularLists: DashboardList[]
}

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

// These four stats are identical for every client and don't depend on the
// request, so they're cached instead of recomputed on every dashboard load.
// The whole module is a cache boundary ("use cache"); this export is revalidated
// periodically and tagged so it can be invalidated on demand (e.g. after a
// screening import) via revalidateTag("dashboard-global-stats"). All returned
// values are JSON-serializable, as the cache requires.
export async function getGlobalDashboardStats(): Promise<GlobalDashboardStats> {
   cacheLife({ stale: 300, revalidate: 900, expire: 1800 })
   cacheTag("dashboard-global-stats")

   const now = new Date()

   const [screenedRow, viewedRows, popularLists, compliant] = await Promise.all([
      // Distinct companies we have Shariah screening data for.
      db.select({ c: countDistinct(companyShariah.companyId) }).from(companyShariah),
      // Most-viewed companies across all clients (global popularity).
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
      // Popular list plans - ranked by distinct clients with a live subscription
      // (status + endDate guard: status alone can be stale).
      db
         .select({
            planId: pricingPlan.id,
            name: pricingPlan.name,
            subscribers: countDistinct(subscription.clientId),
         })
         .from(subscription)
         .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
         .where(
            and(
               eq(pricingPlan.type, "list"),
               eq(subscription.status, "active"),
               gte(subscription.endDate, now),
            ),
         )
         .groupBy(pricingPlan.id, pricingPlan.name)
         .orderBy(desc(countDistinct(subscription.clientId)))
         .limit(POPULAR_LISTS_LIMIT),
      // Compliant companies in the latest published screening month.
      (async () => {
         const [latest] = await db
            .select({ m: sql<string | null>`max(${companyShariah.month})` })
            .from(companyShariah)
         const month = latest?.m ?? null
         if (!month) return { count: 0, month: null as string | null }
         const [row] = await db
            .select({ c: countDistinct(companyShariah.companyId) })
            .from(companyShariah)
            .where(and(eq(companyShariah.month, month), eq(companyShariah.shariahStatus, 1)))
         return { count: row?.c ?? 0, month }
      })(),
   ])

   const statusMap = await latestShariahStatus(viewedRows.map((r) => r.id))
   const mostViewed: DashboardStock[] = viewedRows.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      nseSymbol: r.nseSymbol,
      shariahStatus: statusMap.get(r.id) ?? null,
      views: r.views,
   }))

   return {
      companiesScreened: screenedRow[0]?.c ?? 0,
      compliantCompanies: compliant.count,
      compliantMonth: compliant.month,
      mostViewed,
      popularLists,
   }
}
