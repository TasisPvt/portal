"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { tasisScreeningStandard } from "@/src/db/schema"

export async function getScreeningStandards() {
   return db
      .select()
      .from(tasisScreeningStandard)
      .orderBy(tasisScreeningStandard.shariahStatus)
}

export async function upsertScreeningStandard(
   shariahStatus: number,
   remark: string,
): Promise<{ success: boolean; message?: string }> {
   try {
      const existing = await db
         .select({ id: tasisScreeningStandard.id })
         .from(tasisScreeningStandard)
         .where(eq(tasisScreeningStandard.shariahStatus, shariahStatus))
         .limit(1)

      if (existing.length > 0) {
         await db
            .update(tasisScreeningStandard)
            .set({ remark: remark.trim() || null, updatedAt: new Date() })
            .where(eq(tasisScreeningStandard.id, existing[0].id))
      } else {
         await db.insert(tasisScreeningStandard).values({
            id: randomUUID(),
            shariahStatus,
            remark: remark.trim() || null,
         })
      }

      revalidatePath("/admin/tasis-screening-standards")
      return { success: true }
   } catch {
      return { success: false, message: "Failed to save." }
   }
}
