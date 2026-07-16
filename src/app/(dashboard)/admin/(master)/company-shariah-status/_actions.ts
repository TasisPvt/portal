"use server"

import { randomUUID } from "crypto"
import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import {
   companyMaster,
   companyShariah,
   indexCompany,
   pricingPlan,
   subscription,
   subscriptionListSnapshot,
} from "@/src/db/schema"
import { auth } from "@/src/lib/auth"
import { Roles } from "@/src/lib/constants"
import { chunk } from "@/src/lib/db-batch"
import { getCurrentMonth } from "./_utils"

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getShariahDataForMonth(month: string) {
   const rows = await db
      .select({
         companyId: companyMaster.id,
         prowessId: companyMaster.prowessId,
         companyName: companyMaster.companyName,
         shariahId: companyShariah.id,
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
      .from(companyMaster)
      .leftJoin(
         companyShariah,
         and(
            eq(companyShariah.companyId, companyMaster.id),
            eq(companyShariah.month, month),
         ),
      )
      .orderBy(companyMaster.companyName)

   return rows
}

export async function getAvailableMonths(): Promise<string[]> {
   const rows = await db
      .selectDistinct({ month: companyShariah.month })
      .from(companyShariah)
      .orderBy(desc(companyShariah.month))
   return rows.map((r) => r.month)
}

export type ExistingShariahEntry = {
   shariahStatus: number | null
   companyStatus: string | null
   lastFinancialData: boolean | null
   incompleteBusInfo: boolean | null
   primaryBusiness: boolean | null
   secondaryBusiness: boolean | null
   compliantOnInvestment: boolean | null
   totalDebtTotalAssetValue: string | null
   totalDebtTotalAssetStatus: boolean | null
   totalInterestIncomeTotalIncomeValue: string | null
   totalInterestIncomeTotalIncomeStatus: boolean | null
   cashBankReceivablesTotalAssetValue: string | null
   cashBankReceivablesTotalAssetStatus: boolean | null
   marketCap: string | null
   remark: string | null
}

// A target month must be "YYYY-MM" and not in the future (no uploading ahead of time).
function assertValidTargetMonth(month: string): string {
   if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Invalid month format")
   }
   if (month > getCurrentMonth()) {
      throw new Error("Cannot import data for a future month")
   }
   return month
}

// Called by the import dialog — returns existing prowessIds, prowessId→name map, and
// existing shariah values for the given target month (current or a back-dated month).
export async function getImportContext(month: string): Promise<{
   currentMonth: string
   existingProwessIds: Set<string>
   companyNames: Record<string, string>
   existingShariahData: Record<string, ExistingShariahEntry>
}> {
   const targetMonth = assertValidTargetMonth(month)

   const [allCompanies, existingRows] = await Promise.all([
      db.select({ prowessId: companyMaster.prowessId, companyName: companyMaster.companyName }).from(companyMaster),
      db
         .select({
            prowessId: companyMaster.prowessId,
            shariahStatus: companyShariah.shariahStatus,
            companyStatus: companyShariah.companyStatus,
            lastFinancialData: companyShariah.lastFinancialData,
            incompleteBusInfo: companyShariah.incompleteBusInfo,
            primaryBusiness: companyShariah.primaryBusiness,
            secondaryBusiness: companyShariah.secondaryBusiness,
            compliantOnInvestment: companyShariah.compliantOnInvestment,
            totalDebtTotalAssetValue: companyShariah.totalDebtTotalAssetValue,
            totalDebtTotalAssetStatus: companyShariah.totalDebtTotalAssetStatus,
            totalInterestIncomeTotalIncomeValue: companyShariah.totalInterestIncomeTotalIncomeValue,
            totalInterestIncomeTotalIncomeStatus: companyShariah.totalInterestIncomeTotalIncomeStatus,
            cashBankReceivablesTotalAssetValue: companyShariah.cashBankReceivablesTotalAssetValue,
            cashBankReceivablesTotalAssetStatus: companyShariah.cashBankReceivablesTotalAssetStatus,
            marketCap: companyShariah.marketCap,
            remark: companyShariah.remark,
         })
         .from(companyShariah)
         .innerJoin(companyMaster, eq(companyShariah.companyId, companyMaster.id))
         .where(eq(companyShariah.month, targetMonth)),
   ])

   return {
      currentMonth: getCurrentMonth(),
      existingProwessIds: new Set(existingRows.map((r) => r.prowessId)),
      companyNames: Object.fromEntries(allCompanies.map((c) => [c.prowessId, c.companyName])),
      existingShariahData: Object.fromEntries(existingRows.map((r) => [r.prowessId, r])),
   }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ShariahImportRow = {
   prowessId: string
   assessmentYear?: string | null
   marketCap?: string | null
   companyStatus?: string | null
   shariahStatus?: number | null
   lastFinancialData?: boolean | null
   primaryBusiness?: boolean | null
   secondaryBusiness?: boolean | null
   compliantOnInvestment?: boolean | null
   incompleteBusInfo?: boolean | null
   totalDebtTotalAssetValue?: string | null
   totalDebtTotalAssetStatus?: boolean | null
   totalInterestIncomeTotalIncomeValue?: string | null
   totalInterestIncomeTotalIncomeStatus?: boolean | null
   cashBankReceivablesTotalAssetValue?: string | null
   cashBankReceivablesTotalAssetStatus?: boolean | null
   remark?: string | null
   lastUpdatedAt?: string | null
}

export async function importShariahData(records: ShariahImportRow[], targetMonth: string): Promise<{
   inserted: number
   updated: number
   skipped: { prowessId: string; reason: string }[]
}> {
   const month = assertValidTargetMonth(targetMonth)

   // Back-dated edits are restricted to admin / super-admin. Managers may only
   // publish or correct the current month.
   if (month < getCurrentMonth()) {
      const session = await auth.api.getSession({ headers: await headers() })
      if (session?.user?.adminRole === Roles.MANAGER) {
         throw new Error("Your role can only edit the current month's data.")
      }
   }

   // Resolve prowessId → companyId
   const allCompanies = await db
      .select({ id: companyMaster.id, prowessId: companyMaster.prowessId })
      .from(companyMaster)
   const prowessToId = new Map(allCompanies.map((c) => [c.prowessId, c.id]))

   // Existing records for current month
   const existing = await db
      .select({ id: companyShariah.id, companyId: companyShariah.companyId })
      .from(companyShariah)
      .where(eq(companyShariah.month, month))
   const existingMap = new Map(existing.map((r) => [r.companyId, r.id]))

   const skipped: { prowessId: string; reason: string }[] = []
   const seenProwessIds = new Set<string>()

   // Build the full work list first (pre-validation only), then write it in a
   // single transaction below — a failed import must not leave the month
   // half-applied.
   type ShariahValues = typeof companyShariah.$inferInsert
   const toInsert: ShariahValues[] = []
   const toUpdate: { id: string; values: Omit<ShariahValues, "id" | "createdAt"> }[] = []

   for (const record of records) {
      if (seenProwessIds.has(record.prowessId)) {
         skipped.push({ prowessId: record.prowessId, reason: "Duplicate in file (first occurrence used)" })
         continue
      }
      seenProwessIds.add(record.prowessId)

      const companyId = prowessToId.get(record.prowessId)
      if (!companyId) {
         skipped.push({ prowessId: record.prowessId, reason: "Not found in company master" })
         continue
      }

      const values = {
         companyId,
         month,
         assessmentYear: record.assessmentYear || null,
         marketCap: record.marketCap || null,
         companyStatus: record.companyStatus || null,
         shariahStatus: record.shariahStatus ?? null,
         lastFinancialData: record.lastFinancialData ?? null,
         primaryBusiness: record.primaryBusiness ?? null,
         secondaryBusiness: record.secondaryBusiness ?? null,
         compliantOnInvestment: record.compliantOnInvestment ?? null,
         incompleteBusInfo: record.incompleteBusInfo ?? null,
         totalDebtTotalAssetValue: record.totalDebtTotalAssetValue || null,
         totalDebtTotalAssetStatus: record.totalDebtTotalAssetStatus ?? null,
         totalInterestIncomeTotalIncomeValue: record.totalInterestIncomeTotalIncomeValue || null,
         totalInterestIncomeTotalIncomeStatus: record.totalInterestIncomeTotalIncomeStatus ?? null,
         cashBankReceivablesTotalAssetValue: record.cashBankReceivablesTotalAssetValue || null,
         cashBankReceivablesTotalAssetStatus: record.cashBankReceivablesTotalAssetStatus ?? null,
         remark: record.remark || null,
         lastUpdatedAt: record.lastUpdatedAt ? new Date(record.lastUpdatedAt) : null,
         updatedAt: new Date(),
      }

      // Compliance cascade: if a step is not `true`, null out all subsequent steps.
      // Order: lastFinancialData → incompleteBusInfo → primaryBusiness → secondaryBusiness → compliantOnInvestment
      const complianceChain = [
         "lastFinancialData",
         "incompleteBusInfo",
         "primaryBusiness",
         "secondaryBusiness",
         "compliantOnInvestment",
      ] as const
      let cascadeNull = false
      for (const field of complianceChain) {
         if (cascadeNull) {
            values[field] = null
         } else if (values[field] !== true) {
            cascadeNull = true
         }
      }

      if (existingMap.has(companyId)) {
         toUpdate.push({ id: existingMap.get(companyId)!, values })
      } else {
         toInsert.push({ id: randomUUID(), ...values, createdAt: new Date() })
      }
   }

   // Apply atomically: any failure rolls the whole import back instead of
   // leaving an unknown mix of old and new rows for the month.
   try {
      await db.transaction(async (tx) => {
         // Insert in chunks: a single `.values()` for the whole master upload
         // (~6k rows × ~23 columns) exceeds Postgres's 65535-parameter cap and
         // overflows Drizzle's query-builder call stack.
         for (const batch of chunk(toInsert)) {
            await tx.insert(companyShariah).values(batch)
         }
         for (const u of toUpdate) {
            await tx.update(companyShariah).set(u.values).where(eq(companyShariah.id, u.id))
         }
      })
   } catch (err: any) {
      console.error("[importShariahData]", err)
      throw new Error(
         `Import failed — no changes were applied. ${err?.message ?? "Unknown database error."}`,
      )
   }

   const inserted = toInsert.length
   const updated = toUpdate.length

   // After import: snapshot the current index state for the uploaded month
   // for every active quarterly/annual list subscription. This freezes each
   // subscriber's company list to what existed when the admin published this
   // month's data, so later index edits don't affect their view.
   //
   // Only done for a current-month publish. Back-dated corrections to a past
   // month must NOT re-snapshot: that would stamp today's index membership onto
   // a historical month and corrupt subscribers' frozen lists.
   if (month === getCurrentMonth()) {
      await snapshotMonthForActiveListSubscriptions(month)
   }

   revalidatePath("/admin/company-shariah-status")
   return { inserted, updated, skipped }
}

async function snapshotMonthForActiveListSubscriptions(month: string) {
   // Find all active quarterly/annual list subscriptions
   const activeSubs = await db
      .select({
         subscriptionId: subscription.id,
         indexId: pricingPlan.indexId,
      })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(
         and(
            eq(subscription.status, "active"),
            eq(pricingPlan.type, "list"),
            inArray(subscription.durationType, ["quarterly", "annual"]),
         ),
      )

   if (!activeSubs.length) return

   // Group subscriptions by indexId so we fetch each index's companies once
   const byIndex = new Map<string, string[]>()
   for (const sub of activeSubs) {
      if (!sub.indexId) continue
      const existing = byIndex.get(sub.indexId) ?? []
      existing.push(sub.subscriptionId)
      byIndex.set(sub.indexId, existing)
   }

   for (const [indexId, subscriptionIds] of byIndex) {
      const members = await db
         .select({ companyId: indexCompany.companyId })
         .from(indexCompany)
         .where(eq(indexCompany.indexId, indexId))

      if (!members.length) continue

      const rows = subscriptionIds.flatMap((subscriptionId) =>
         members.map((m) => ({
            id: randomUUID(),
            subscriptionId,
            companyId: m.companyId,
            month,
         })),
      )

      // Chunk for the same reason as the shariah insert: subs × members can be
      // large, and one oversized `.values()` overflows Postgres/Drizzle limits.
      for (const batch of chunk(rows)) {
         await db.insert(subscriptionListSnapshot).values(batch).onConflictDoNothing()
      }
   }
}
