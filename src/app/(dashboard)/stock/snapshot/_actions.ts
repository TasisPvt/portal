"use server"

import { randomUUID } from "crypto"
import { and, count, desc, eq, ilike, max, or } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   appSettings,
   companyMaster,
   companyShariah,
   screeningFinancialRatioThreshold,
   industryGroup,
   pricingPlan,
   screeningStandardRemark,
   subscription,
   subscriptionListSnapshot,
} from "@/src/db/schema"
import { stockViewLog } from "@/src/db/schema/stock-views"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SnapshotAccess = {
   subscriptionId: string
   planName: string
   stocksPerDay: number | null
   dailyUsed: number
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
   | {
        company: {
           id: string
           companyName: string
           prowessId: string
           isinCode: string | null
           bseScripCode: string | null
           bseScripId: string | null
           nseSymbol: string | null
           industryGroup: string | null
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
           incompleteBusInfo: boolean | null
           totalDebtTotalAssetValue: string | null
           totalDebtTotalAssetStatus: boolean | null
           totalInterestIncomeTotalIncomeValue: string | null
           totalInterestIncomeTotalIncomeStatus: boolean | null
           cashBankReceivablesTotalAssetValue: string | null
           cashBankReceivablesTotalAssetStatus: boolean | null
           remark: string | null
           lastUpdatedAt: Date | null
        } | null
        screeningRemarks: { parameter: string; label: string; value: boolean | null; remark: string | null; passRemark: string | null; failRemark: string | null }[]
        complianceHistory: { month: string; shariahStatus: number | null }[]
        quota: QuotaInfo
     }

type QuotaInfo = {
   dailyUsed: number
   dailyLimit: number | null
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

   return {
      subscriptionId: sub.id,
      planName: sub.planName,
      stocksPerDay: sub.stocksPerDay,
      dailyUsed: dailyRow.cnt,
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

export async function getCompanySnapshot(
   companyId: string,
   trackQuota = true,
   fromList = false,
): Promise<CompanySnapshotResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { error: "unauthenticated" }

   // Resolve viewing access. Two independent paths:
   //  • Snapshot plan → gated by an active snapshot subscription + daily quota.
   //  • List plan     → a list subscriber may open the full screening detail for
   //    any company in their own list, with NO snapshot subscription and NO
   //    quota. When `fromList` is set we authorize against the list snapshot
   //    membership instead and leave `sub` null (no quota accounting applies).
   let sub: { id: string; stocksPerDay: number | null } | null = null

   if (fromList) {
      const [listAccess] = await db
         .select({ id: subscription.id })
         .from(subscription)
         .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
         .innerJoin(
            subscriptionListSnapshot,
            eq(subscriptionListSnapshot.subscriptionId, subscription.id),
         )
         .where(
            and(
               eq(subscription.clientId, session.user.id),
               eq(subscription.status, "active"),
               eq(pricingPlan.type, "list"),
               eq(subscriptionListSnapshot.companyId, companyId),
            ),
         )
         .limit(1)

      if (!listAccess) return { error: "no_subscription" }
   } else {
      // Get active snapshot subscription
      const subs = await db
         .select({
            id: subscription.id,
            stocksPerDay: subscription.stocksPerDaySnapshot,
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
      sub = subs[0]
   }

   const today = new Date().toISOString().slice(0, 10)

   // Quota tracking — only for snapshot-plan views (skipped for list viewers).
   if (trackQuota && sub) {
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
               return {
                  error: "daily_quota_exceeded",
                  quota: {
                     dailyUsed: dailyCnt,
                     dailyLimit: sub.stocksPerDay,
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
   }

   // Fetch company, shariah, history, and remarks in parallel
   const [companies, shariahRows, historyRows, remarkRows] = await Promise.all([
      db
         .select({
            id: companyMaster.id,
            companyName: companyMaster.companyName,
            prowessId: companyMaster.prowessId,
            isinCode: companyMaster.isinCode,
            bseScripCode: companyMaster.bseScripCode,
            bseScripId: companyMaster.bseScripId,
            nseSymbol: companyMaster.nseSymbol,
            industryGroup: industryGroup.name,
         })
         .from(companyMaster)
         .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
         .where(eq(companyMaster.id, companyId))
         .limit(1),
      db
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
            incompleteBusInfo: companyShariah.incompleteBusInfo,
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
         .limit(1),
      db
         .select({
            month: companyShariah.month,
            shariahStatus: companyShariah.shariahStatus,
         })
         .from(companyShariah)
         .where(eq(companyShariah.companyId, companyId))
         .orderBy(desc(companyShariah.month))
         .limit(12),
      db.select().from(screeningStandardRemark),
   ])

   if (!companies.length) return { error: "company_not_found" }
   const company = companies[0]
   const shariah = shariahRows[0] ?? null
   const remarkMap = new Map(remarkRows.map((r) => [r.parameter, r]))

   const isOnHold = shariah?.shariahStatus === 8

   const PARAM_MAP = [
      { parameter: "last_financial_data", label: "Financial Data", value: isOnHold ? null : (shariah?.lastFinancialData ?? null) },
      { parameter: "incomplete_business_information", label: "Incomplete Business Information", value: isOnHold ? null : (shariah?.incompleteBusInfo ?? null) },
      { parameter: "primary_business", label: "Primary Business", value: isOnHold ? null : (shariah?.primaryBusiness ?? null) },
      { parameter: "secondary_business", label: "Secondary Business", value: isOnHold ? null : (shariah?.secondaryBusiness ?? null) },
      { parameter: "compliant_on_investment", label: "Compliance on Investment", value: isOnHold ? null : (shariah?.compliantOnInvestment ?? null) },
      { parameter: "total_debt_total_asset", label: "Total Debt / Total Asset", value: isOnHold ? null : (shariah?.totalDebtTotalAssetStatus ?? null) },
      { parameter: "total_interest_income_total_income", label: "Total Interest Income / Total Income", value: isOnHold ? null : (shariah?.totalInterestIncomeTotalIncomeStatus ?? null) },
      { parameter: "cash_bank_receivables_total_asset", label: "Cash + Bank + Receivables / Total Asset", value: isOnHold ? null : (shariah?.cashBankReceivablesTotalAssetStatus ?? null) },
   ]

   const screeningRemarks = PARAM_MAP.map(({ parameter, label, value }) => {
      const entry = remarkMap.get(parameter)
      const remark = value === true ? (entry?.passRemark ?? null) : value === false ? (entry?.failRemark ?? null) : null
      return { parameter, label, value, remark, passRemark: entry?.passRemark ?? null, failRemark: entry?.failRemark ?? null }
   })

   // Updated quota — only meaningful for snapshot-plan views. List viewers have
   // no quota, so report an unlimited/empty quota.
   let quota: QuotaInfo = { dailyUsed: 0, dailyLimit: null }
   if (sub) {
      const [{ cnt: dailyUsed }] = await db
         .select({ cnt: count() })
         .from(stockViewLog)
         .where(
            and(
               eq(stockViewLog.subscriptionId, sub.id),
               eq(stockViewLog.viewedDate, today),
            ),
         )
      quota = { dailyUsed, dailyLimit: sub.stocksPerDay }
   }

   return {
      company,
      shariah,
      complianceHistory: historyRows,
      screeningRemarks,
      quota,
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

export async function getCommonRemark(): Promise<string | null> {
   const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "snapshot_common_remark"))
      .limit(1)
   return rows[0]?.value ?? null
}

export async function getFinancialRatioThresholds(): Promise<Record<string, number>> {
   const defaults: Record<string, number> = {
      total_debt_total_asset: 0.33,
      total_interest_income_total_income: 0.05,
      cash_bank_receivables_total_asset: 0.33,
   }
   const rows = await db.select().from(screeningFinancialRatioThreshold)
   for (const row of rows) {
      defaults[row.parameter] = parseFloat(row.threshold)
   }
   return defaults
}
