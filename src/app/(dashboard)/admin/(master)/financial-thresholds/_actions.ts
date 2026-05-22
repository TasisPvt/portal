"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { screeningFinancialRatioThreshold } from "@/src/db/schema"

const RATIO_PARAMETERS = [
   { key: "total_debt_total_asset", label: "Total Debt / Total Asset", defaultThreshold: "0.3300" },
   { key: "total_interest_income_total_income", label: "Total Interest Income / Total Income", defaultThreshold: "0.0500" },
   { key: "cash_bank_receivables_total_asset", label: "Cash + Bank + Receivables / Total Asset", defaultThreshold: "0.3300" },
] as const

export type FinancialRatioRow = {
   key: string
   label: string
   id: string | null
   threshold: string
}

export async function getFinancialThresholds(): Promise<FinancialRatioRow[]> {
   const rows = await db.select().from(screeningFinancialRatioThreshold)
   const map = new Map(rows.map((r) => [r.parameter, r]))
   return RATIO_PARAMETERS.map(({ key, label, defaultThreshold }) => {
      const existing = map.get(key)
      return {
         key,
         label,
         id: existing?.id ?? null,
         threshold: existing?.threshold ?? defaultThreshold,
      }
   })
}

export async function upsertFinancialThreshold(
   parameter: string,
   threshold: string,
): Promise<{ success: boolean; message?: string }> {
   const num = parseFloat(threshold)
   if (isNaN(num) || num < 0 || num > 1) {
      return { success: false, message: "Threshold must be a number between 0 and 1." }
   }

   const param = RATIO_PARAMETERS.find((p) => p.key === parameter)
   if (!param) return { success: false, message: "Unknown parameter." }

   try {
      await db
         .insert(screeningFinancialRatioThreshold)
         .values({
            id: randomUUID(),
            parameter,
            label: param.label,
            threshold: num.toFixed(4),
         })
         .onConflictDoUpdate({
            target: screeningFinancialRatioThreshold.parameter,
            set: {
               threshold: num.toFixed(4),
               updatedAt: new Date(),
            },
         })

      revalidatePath("/admin/financial-thresholds")
      return { success: true }
   } catch (err) {
      console.error("[upsertFinancialThreshold]", err)
      return { success: false, message: err instanceof Error ? err.message : "Failed to save." }
   }
}
