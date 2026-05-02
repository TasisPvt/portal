"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { screeningStandardRemark } from "@/src/db/schema"

const SCREENING_PARAMETERS = [
   { key: "last_financial_data", label: "Latest Financial Data" },
   { key: "primary_business", label: "Primary Business" },
   { key: "secondary_business", label: "Secondary Business" },
   { key: "compliant_on_investment", label: "Compliant on Investment" },
   { key: "financial_information", label: "Financial Information" },
] as const

export type ScreeningStandardRow = {
   key: string
   label: string
   id: string | null
   passRemark: string | null
   failRemark: string | null
}

export async function getScreeningStandards(): Promise<ScreeningStandardRow[]> {
   const rows = await db.select().from(screeningStandardRemark)
   const map = new Map(rows.map((r) => [r.parameter, r]))
   return SCREENING_PARAMETERS.map(({ key, label }) => {
      const existing = map.get(key)
      return {
         key,
         label,
         id: existing?.id ?? null,
         passRemark: existing?.passRemark ?? null,
         failRemark: existing?.failRemark ?? null,
      }
   })
}

export async function upsertScreeningStandard(
   parameter: string,
   passRemark: string,
   failRemark: string,
): Promise<{ success: boolean; message?: string }> {
   try {
      const existing = await db
         .select({ id: screeningStandardRemark.id })
         .from(screeningStandardRemark)
         .where(eq(screeningStandardRemark.parameter, parameter))
         .limit(1)

      if (existing.length > 0) {
         await db
            .update(screeningStandardRemark)
            .set({
               passRemark: passRemark.trim() || null,
               failRemark: failRemark.trim() || null,
               updatedAt: new Date(),
            })
            .where(eq(screeningStandardRemark.id, existing[0].id))
      } else {
         await db.insert(screeningStandardRemark).values({
            id: randomUUID(),
            parameter,
            passRemark: passRemark.trim() || null,
            failRemark: failRemark.trim() || null,
         })
      }

      revalidatePath("/admin/tasis-screening-standards")
      return { success: true }
   } catch (err) {
      console.error("[upsertScreeningStandard]", err)
      return { success: false, message: err instanceof Error ? err.message : "Failed to save." }
   }
}
