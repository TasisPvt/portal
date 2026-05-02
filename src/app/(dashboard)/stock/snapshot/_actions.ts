"use server"

import { randomUUID } from "crypto"
import { and, count, desc, eq, ilike, max, or, sql } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   companyMaster,
   companyShariah,
   pricingPlan,
   screeningStandardRemark,
   subscription,
} from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SnapshotAccess = {
   subscriptionId: string
   planName: string
   stocksPerDay: number | null
   stocksInDuration: number | null
   dailyUsed: number
   totalUsed: number
}

export type CompanySearchResult = {
   id: string
   companyName: string
   prowessId: string
   isinCode: string | null
   nseSymbol: string | null
   bseScripCode: string | null
}

export type CompanySnapshotResult =
   | { error: "unauthenticated" | "no_subscription" | "company_not_found" }
   | { error: "daily_quota_exceeded"; quota: QuotaInfo }
   | { error: "total_quota_exceeded"; quota: QuotaInfo }
   | {
        company: {
           id: string
           companyName: string
           prowessId: string
           isinCode: string | null
           bseScripCode: string | null
           nseSymbol: string | null
        }
        shariah: {
           month: string
           assessmentYear: string | null
           marketCap: string | null
           companyStatus: string | null
           shariahStatus: number | null
           lastFinancialData: boolean | null
           primaryBusiness: boolean | null
           secondaryBusiness: boolean | null
           compliantOnInvestment: boolean | null
           sufficientFinancialInfo: boolean | null
           totalDebtTotalAssetValue: string | null
           totalDebtTotalAssetStatus: boolean | null
           totalInterestIncomeTotalIncomeValue: string | null
           totalInterestIncomeTotalIncomeStatus: boolean | null
           cashBankReceivablesTotalAssetValue: string | null
           cashBankReceivablesTotalAssetStatus: boolean | null
           remark: string | null
           lastUpdatedAt: Date | null
        } | null
        screeningRemarks: { parameter: string; label: string; value: boolean | null; remark: string | null }[]
        complianceHistory: { month: string; shariahStatus: number | null }[]
        quota: QuotaInfo
     }

type QuotaInfo = {
   dailyUsed: number
   dailyLimit: number | null
   totalUsed: number
   totalLimit: number | null
}

export type RecentlyViewedCompany = {
   id: string
   companyName: string
   prowessId: string
   isinCode: string | null
   nseSymbol: string | null
   bseScripCode: string | null
   lastViewed: string // "YYYY-MM-DD"
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getSnapshotAccess(): Promise<SnapshotAccess | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return null

   const subs = await db
      .select({
         id: subscription.id,
         planName: pricingPlan.name,
         stocksPerDay: subscription.stocksPerDaySnapshot,
         stocksInDuration: subscription.stocksInDurationSnapshot,
      })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            eq(subscription.status, "active"),
            eq(pricingPlan.type, "snapshot"),
         ),
      )
      .limit(1)

   if (!subs.length) return null
   const sub = subs[0]

   const today = new Date().toISOString().slice(0, 10)

   const [dailyRow] = await db
      .select({ cnt: count() })
      .from(stockViewLog)
      .where(
         and(
            eq(stockViewLog.subscriptionId, sub.id),
            eq(stockViewLog.viewedDate, today),
         ),
      )

   const [totalRow] = await db
      .select({ cnt: sql<number>`count(distinct ${stockViewLog.companyId})` })
      .from(stockViewLog)
      .where(eq(stockViewLog.subscriptionId, sub.id))

   return {
      subscriptionId: sub.id,
      planName: sub.planName,
      stocksPerDay: sub.stocksPerDay,
      stocksInDuration: sub.stocksInDuration,
      dailyUsed: dailyRow.cnt,
      totalUsed: Number(totalRow.cnt),
   }
}

export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
   const q = query.trim()
   if (q.length < 2) return []

   return db
      .select({
         id: companyMaster.id,
         companyName: companyMaster.companyName,
         prowessId: companyMaster.prowessId,
         isinCode: companyMaster.isinCode,
         nseSymbol: companyMaster.nseSymbol,
         bseScripCode: companyMaster.bseScripCode,
      })
      .from(companyMaster)
      .where(
         or(
            ilike(companyMaster.companyName, `%${q}%`),
            ilike(companyMaster.prowessId, `%${q}%`),
            ilike(companyMaster.isinCode, `%${q}%`),
            ilike(companyMaster.nseSymbol, `%${q}%`),
         ),
      )
      .limit(20)
}

export async function getCompanySnapshot(companyId: string): Promise<CompanySnapshotResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { error: "unauthenticated" }

   // Get active snapshot subscription
   const subs = await db
      .select({
         id: subscription.id,
         stocksPerDay: subscription.stocksPerDaySnapshot,
         stocksInDuration: subscription.stocksInDurationSnapshot,
      })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            eq(subscription.status, "active"),
            eq(pricingPlan.type, "snapshot"),
         ),
      )
      .limit(1)

   if (!subs.length) return { error: "no_subscription" }
   const sub = subs[0]

   const today = new Date().toISOString().slice(0, 10)

   // Check if already viewed today (free repeat view)
   const viewedTodayRows = await db
      .select({ id: stockViewLog.id })
      .from(stockViewLog)
      .where(
         and(
            eq(stockViewLog.subscriptionId, sub.id),
            eq(stockViewLog.companyId, companyId),
            eq(stockViewLog.viewedDate, today),
         ),
      )
      .limit(1)

   const viewedToday = viewedTodayRows.length > 0

   if (!viewedToday) {
      // Check daily quota
      if (sub.stocksPerDay !== null) {
         const [{ cnt: dailyCnt }] = await db
            .select({ cnt: count() })
            .from(stockViewLog)
            .where(
               and(
                  eq(stockViewLog.subscriptionId, sub.id),
                  eq(stockViewLog.viewedDate, today),
               ),
            )

         if (dailyCnt >= sub.stocksPerDay) {
            const [{ cnt: totalCnt }] = await db
               .select({ cnt: sql<number>`count(distinct ${stockViewLog.companyId})` })
               .from(stockViewLog)
               .where(eq(stockViewLog.subscriptionId, sub.id))

            return {
               error: "daily_quota_exceeded",
               quota: {
                  dailyUsed: dailyCnt,
                  dailyLimit: sub.stocksPerDay,
                  totalUsed: Number(totalCnt),
                  totalLimit: sub.stocksInDuration,
               },
            }
         }
      }

      // Check if company was ever viewed in this subscription
      const everViewedRows = await db
         .select({ id: stockViewLog.id })
         .from(stockViewLog)
         .where(
            and(
               eq(stockViewLog.subscriptionId, sub.id),
               eq(stockViewLog.companyId, companyId),
            ),
         )
         .limit(1)

      const isNewCompany = everViewedRows.length === 0

      if (isNewCompany && sub.stocksInDuration !== null) {
         const [{ cnt: totalCnt }] = await db
            .select({ cnt: sql<number>`count(distinct ${stockViewLog.companyId})` })
            .from(stockViewLog)
            .where(eq(stockViewLog.subscriptionId, sub.id))

         if (Number(totalCnt) >= sub.stocksInDuration) {
            const [{ cnt: dailyCnt }] = await db
               .select({ cnt: count() })
               .from(stockViewLog)
               .where(
                  and(
                     eq(stockViewLog.subscriptionId, sub.id),
                     eq(stockViewLog.viewedDate, today),
                  ),
               )

            return {
               error: "total_quota_exceeded",
               quota: {
                  dailyUsed: dailyCnt,
                  dailyLimit: sub.stocksPerDay,
                  totalUsed: Number(totalCnt),
                  totalLimit: sub.stocksInDuration,
               },
            }
         }
      }

      // Log the view
      await db
         .insert(stockViewLog)
         .values({
            id: randomUUID(),
            subscriptionId: sub.id,
            companyId,
            viewedDate: today,
         })
         .onConflictDoNothing()
   }

   // Fetch company info
   const companies = await db
      .select({
         id: companyMaster.id,
         companyName: companyMaster.companyName,
         prowessId: companyMaster.prowessId,
         isinCode: companyMaster.isinCode,
         bseScripCode: companyMaster.bseScripCode,
         nseSymbol: companyMaster.nseSymbol,
      })
      .from(companyMaster)
      .where(eq(companyMaster.id, companyId))
      .limit(1)

   if (!companies.length) return { error: "company_not_found" }
   const company = companies[0]

   // Latest shariah data
   const shariahRows = await db
      .select({
         month: companyShariah.month,
         assessmentYear: companyShariah.assessmentYear,
         marketCap: companyShariah.marketCap,
         companyStatus: companyShariah.companyStatus,
         shariahStatus: companyShariah.shariahStatus,
         lastFinancialData: companyShariah.lastFinancialData,
         primaryBusiness: companyShariah.primaryBusiness,
         secondaryBusiness: companyShariah.secondaryBusiness,
         compliantOnInvestment: companyShariah.compliantOnInvestment,
         sufficientFinancialInfo: companyShariah.sufficientFinancialInfo,
         totalDebtTotalAssetValue: companyShariah.totalDebtTotalAssetValue,
         totalDebtTotalAssetStatus: companyShariah.totalDebtTotalAssetStatus,
         totalInterestIncomeTotalIncomeValue: companyShariah.totalInterestIncomeTotalIncomeValue,
         totalInterestIncomeTotalIncomeStatus: companyShariah.totalInterestIncomeTotalIncomeStatus,
         cashBankReceivablesTotalAssetValue: companyShariah.cashBankReceivablesTotalAssetValue,
         cashBankReceivablesTotalAssetStatus: companyShariah.cashBankReceivablesTotalAssetStatus,
         remark: companyShariah.remark,
         lastUpdatedAt: companyShariah.lastUpdatedAt,
      })
      .from(companyShariah)
      .where(eq(companyShariah.companyId, companyId))
      .orderBy(desc(companyShariah.month))
      .limit(1)

   const shariah = shariahRows[0] ?? null

   // Compliance history — last 12 months
   const historyRows = await db
      .select({
         month: companyShariah.month,
         shariahStatus: companyShariah.shariahStatus,
      })
      .from(companyShariah)
      .where(eq(companyShariah.companyId, companyId))
      .orderBy(desc(companyShariah.month))
      .limit(12)

   // Per-parameter screening remarks
   const remarkRows = await db.select().from(screeningStandardRemark)
   const remarkMap = new Map(remarkRows.map((r) => [r.parameter, r]))

   const PARAM_MAP = [
      { parameter: "last_financial_data", label: "Latest Financial Data", value: shariah?.lastFinancialData ?? null },
      { parameter: "primary_business", label: "Primary Business", value: shariah?.primaryBusiness ?? null },
      { parameter: "secondary_business", label: "Secondary Business", value: shariah?.secondaryBusiness ?? null },
      { parameter: "compliant_on_investment", label: "Compliant on Investment", value: shariah?.compliantOnInvestment ?? null },
      { parameter: "financial_information", label: "Financial Information", value: shariah?.sufficientFinancialInfo ?? null },
   ]

   const screeningRemarks = PARAM_MAP.map(({ parameter, label, value }) => {
      const entry = remarkMap.get(parameter)
      const remark = value === true ? (entry?.passRemark ?? null) : value === false ? (entry?.failRemark ?? null) : null
      return { parameter, label, value, remark }
   })

   // Updated quota
   const [{ cnt: dailyUsed }] = await db
      .select({ cnt: count() })
      .from(stockViewLog)
      .where(
         and(
            eq(stockViewLog.subscriptionId, sub.id),
            eq(stockViewLog.viewedDate, today),
         ),
      )

   const [{ cnt: totalUsed }] = await db
      .select({ cnt: sql<number>`count(distinct ${stockViewLog.companyId})` })
      .from(stockViewLog)
      .where(eq(stockViewLog.subscriptionId, sub.id))

   return {
      company,
      shariah,
      complianceHistory: historyRows,
      screeningRemarks,
      quota: {
         dailyUsed,
         dailyLimit: sub.stocksPerDay,
         totalUsed: Number(totalUsed),
         totalLimit: sub.stocksInDuration,
      },
   }
}

export async function getRecentlyViewed(): Promise<RecentlyViewedCompany[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return []

   const subs = await db
      .select({ id: subscription.id })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            eq(subscription.status, "active"),
            eq(pricingPlan.type, "snapshot"),
         ),
      )
      .limit(1)

   if (!subs.length) return []

   const rows = await db
      .select({
         id: companyMaster.id,
         companyName: companyMaster.companyName,
         prowessId: companyMaster.prowessId,
         isinCode: companyMaster.isinCode,
         nseSymbol: companyMaster.nseSymbol,
         bseScripCode: companyMaster.bseScripCode,
         lastViewed: max(stockViewLog.viewedDate),
      })
      .from(stockViewLog)
      .innerJoin(companyMaster, eq(stockViewLog.companyId, companyMaster.id))
      .where(eq(stockViewLog.subscriptionId, subs[0].id))
      .groupBy(
         companyMaster.id,
         companyMaster.companyName,
         companyMaster.prowessId,
         companyMaster.isinCode,
         companyMaster.nseSymbol,
         companyMaster.bseScripCode,
      )
      .orderBy(desc(max(stockViewLog.viewedDate)))
      .limit(10)

   return rows.filter((r) => r.lastViewed !== null) as RecentlyViewedCompany[]
}
