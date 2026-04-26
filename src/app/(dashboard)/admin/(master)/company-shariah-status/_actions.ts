"use server"

import { randomUUID } from "crypto"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { companyMaster, companyShariah } from "@/src/db/schema"
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

// Called by the import dialog on open — returns current month, existing prowessIds, and prowessId→name map
export async function getImportContext(): Promise<{
   currentMonth: string
   existingProwessIds: Set<string>
   companyNames: Record<string, string>
}> {
   const currentMonth = getCurrentMonth()

   const [allCompanies, existing] = await Promise.all([
      db.select({ prowessId: companyMaster.prowessId, companyName: companyMaster.companyName }).from(companyMaster),
      db
         .select({ prowessId: companyMaster.prowessId })
         .from(companyShariah)
         .innerJoin(companyMaster, eq(companyShariah.companyId, companyMaster.id))
         .where(eq(companyShariah.month, currentMonth)),
   ])

   return {
      currentMonth,
      existingProwessIds: new Set(existing.map((r) => r.prowessId)),
      companyNames: Object.fromEntries(allCompanies.map((c) => [c.prowessId, c.companyName])),
   }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export type ShariahImportRow = {
   prowessId: string
   marketCap?: string | null
   companyStatus?: string | null
   shariahStatus?: number | null
   lastFinancialData?: boolean | null
   primaryBusiness?: boolean | null
   secondaryBusiness?: boolean | null
   compliantOnInvestment?: boolean | null
   sufficientFinancialInfo?: boolean | null
   totalDebtTotalAssetValue?: string | null
   totalDebtTotalAssetStatus?: boolean | null
   totalInterestIncomeTotalIncomeValue?: string | null
   totalInterestIncomeTotalIncomeStatus?: boolean | null
   cashBankReceivablesTotalAssetValue?: string | null
   cashBankReceivablesTotalAssetStatus?: boolean | null
   remark?: string | null
   lastUpdatedAt?: string | null
}

export async function importShariahData(records: ShariahImportRow[]): Promise<{
   inserted: number
   updated: number
   skipped: { prowessId: string; reason: string }[]
}> {
   const month = getCurrentMonth()

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

   let inserted = 0
   let updated = 0
   const skipped: { prowessId: string; reason: string }[] = []
   const seenProwessIds = new Set<string>()

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
         marketCap: record.marketCap || null,
         companyStatus: record.companyStatus || null,
         shariahStatus: record.shariahStatus ?? null,
         lastFinancialData: record.lastFinancialData ?? null,
         primaryBusiness: record.primaryBusiness ?? null,
         secondaryBusiness: record.secondaryBusiness ?? null,
         compliantOnInvestment: record.compliantOnInvestment ?? null,
         sufficientFinancialInfo: record.sufficientFinancialInfo ?? null,
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
      // Order: lastFinancialData → primaryBusiness → secondaryBusiness → compliantOnInvestment → sufficientFinancialInfo
      const complianceChain = [
         "lastFinancialData",
         "primaryBusiness",
         "secondaryBusiness",
         "compliantOnInvestment",
         "sufficientFinancialInfo",
      ] as const
      let cascadeNull = false
      for (const field of complianceChain) {
         if (cascadeNull) {
            values[field] = null
         } else if (values[field] !== true) {
            cascadeNull = true
         }
      }

      try {
         if (existingMap.has(companyId)) {
            await db
               .update(companyShariah)
               .set(values)
               .where(eq(companyShariah.id, existingMap.get(companyId)!))
            updated++
         } else {
            await db.insert(companyShariah).values({ id: randomUUID(), ...values, createdAt: new Date() })
            inserted++
         }
      } catch (err: any) {
         skipped.push({ prowessId: record.prowessId, reason: err?.message ?? "Failed" })
      }
   }

   revalidatePath("/admin/company-shariah-status")
   return { inserted, updated, skipped }
}
