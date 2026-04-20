"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { industryGroup } from "@/src/db/schema"

type ActionResult = { success: true } | { success: false; message: string; field?: string }

export async function createIndustryGroup(input: { name: string }): Promise<ActionResult> {
   const { name } = input

   const existing = await db
      .select({ id: industryGroup.id })
      .from(industryGroup)
      .where(eq(industryGroup.name, name))
      .limit(1)

   if (existing.length > 0) {
      return { success: false, message: "An industry group with this name already exists", field: "name" }
   }

   try {
      await db.insert(industryGroup).values({
         id: randomUUID(),
         name,
         createdAt: new Date(),
         updatedAt: new Date(),
      })
      revalidatePath("/admin/industry-group")
      return { success: true }
   } catch (err: any) {
      console.error("[createIndustryGroup]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function updateIndustryGroup(
   id: string,
   input: { name: string },
): Promise<ActionResult> {
   const { name } = input

   const duplicate = await db
      .select({ id: industryGroup.id })
      .from(industryGroup)
      .where(eq(industryGroup.name, name))
      .limit(1)

   if (duplicate.length > 0 && duplicate[0].id !== id) {
      return { success: false, message: "An industry group with this name already exists", field: "name" }
   }

   try {
      await db.update(industryGroup).set({ name, updatedAt: new Date() }).where(eq(industryGroup.id, id))
      revalidatePath("/admin/industry-group")
      return { success: true }
   } catch (err: any) {
      console.error("[updateIndustryGroup]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export type BulkCreateResult = {
   inserted: string[]
   skipped: { name: string; reason: string }[]
}

export async function bulkCreateIndustryGroups(names: string[]): Promise<BulkCreateResult> {
   // Fetch all existing names in one query
   const existing = await db.select({ name: industryGroup.name }).from(industryGroup)
   const existingSet = new Set(existing.map((r) => r.name.toLowerCase()))

   const inserted: string[] = []
   const skipped: { name: string; reason: string }[] = []

   for (const name of names) {
      if (existingSet.has(name.toLowerCase())) {
         skipped.push({ name, reason: "Already exists" })
         continue
      }
      try {
         await db.insert(industryGroup).values({ id: randomUUID(), name, createdAt: new Date(), updatedAt: new Date() })
         existingSet.add(name.toLowerCase())
         inserted.push(name)
      } catch (err: any) {
         skipped.push({ name, reason: err?.message ?? "Insert failed" })
      }
   }

   revalidatePath("/admin/industry-group")
   return { inserted, skipped }
}

export async function deleteIndustryGroup(id: string): Promise<ActionResult> {
   try {
      await db.delete(industryGroup).where(eq(industryGroup.id, id))
      revalidatePath("/admin/industry-group")
      return { success: true }
   } catch (err: any) {
      console.error("[deleteIndustryGroup]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}
