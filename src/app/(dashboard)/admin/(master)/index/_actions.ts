"use server"

import { randomUUID } from "crypto"
import { eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { indexMaster, indexCompany, companyMaster } from "@/src/db/schema"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndexInput = {
   name: string
   description?: string
}

type ActionResult = { success: true } | { success: false; message: string }

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function getIndexes() {
   const rows = await db
      .select({
         id: indexMaster.id,
         name: indexMaster.name,
         description: indexMaster.description,
         companyCount: sql<number>`count(${indexCompany.id})::int`,
         createdAt: indexMaster.createdAt,
         updatedAt: indexMaster.updatedAt,
      })
      .from(indexMaster)
      .leftJoin(indexCompany, eq(indexMaster.id, indexCompany.indexId))
      .groupBy(indexMaster.id)
      .orderBy(indexMaster.name)

   return rows
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getIndexDetail(id: string) {
   const [idx] = await db
      .select({
         id: indexMaster.id,
         name: indexMaster.name,
         description: indexMaster.description,
         createdAt: indexMaster.createdAt,
         updatedAt: indexMaster.updatedAt,
      })
      .from(indexMaster)
      .where(eq(indexMaster.id, id))
      .limit(1)

   if (!idx) return null

   const companies = await db
      .select({
         indexCompanyId: indexCompany.id,
         addedAt: indexCompany.addedAt,
         companyId: companyMaster.id,
         prowessId: companyMaster.prowessId,
         companyName: companyMaster.companyName,
         isinCode: companyMaster.isinCode,
         bseScripCode: companyMaster.bseScripCode,
         nseSymbol: companyMaster.nseSymbol,
      })
      .from(indexCompany)
      .innerJoin(companyMaster, eq(indexCompany.companyId, companyMaster.id))
      .where(eq(indexCompany.indexId, id))
      .orderBy(companyMaster.companyName)

   return { ...idx, companies }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createIndex(input: IndexInput): Promise<ActionResult> {
   const dup = await db
      .select({ id: indexMaster.id })
      .from(indexMaster)
      .where(eq(indexMaster.name, input.name))
      .limit(1)

   if (dup.length > 0) {
      return { success: false, message: "An index with this name already exists" }
   }

   try {
      await db.insert(indexMaster).values({
         id: randomUUID(),
         name: input.name,
         description: input.description || null,
         createdAt: new Date(),
         updatedAt: new Date(),
      })
      revalidatePath("/admin/index")
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function updateIndex(id: string, input: IndexInput): Promise<ActionResult> {
   const dup = await db
      .select({ id: indexMaster.id })
      .from(indexMaster)
      .where(eq(indexMaster.name, input.name))
      .limit(1)

   if (dup.length > 0 && dup[0].id !== id) {
      return { success: false, message: "An index with this name already exists" }
   }

   try {
      await db
         .update(indexMaster)
         .set({ name: input.name, description: input.description || null, updatedAt: new Date() })
         .where(eq(indexMaster.id, id))
      revalidatePath("/admin/index")
      revalidatePath(`/admin/index/${id}`)
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function deleteIndex(id: string): Promise<ActionResult> {
   try {
      await db.delete(indexMaster).where(eq(indexMaster.id, id))
      revalidatePath("/admin/index")
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

// ---------------------------------------------------------------------------
// Company membership
// ---------------------------------------------------------------------------

export async function removeCompanyFromIndex(indexCompanyId: string, indexId: string): Promise<ActionResult> {
   try {
      await db.delete(indexCompany).where(eq(indexCompany.id, indexCompanyId))
      revalidatePath(`/admin/index/${indexId}`)
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function getAllCompanyNames(): Promise<{ name: string; isActive: boolean }[]> {
   const rows = await db
      .select({ companyName: companyMaster.companyName, isActive: companyMaster.isActive })
      .from(companyMaster)
      .orderBy(companyMaster.companyName)
   return rows.map((r) => ({ name: r.companyName, isActive: r.isActive }))
}

// Sync: given a list of company names, add new ones and remove missing ones.
// Returns counts of added, removed, unchanged, and notFound (names not in company master).
export async function syncIndexCompanies(
   indexId: string,
   companyNames: string[],
): Promise<{ added: number; removed: number; unchanged: number; notFound: string[] }> {
   // Resolve company names -> ids (case-insensitive)
   const allCompanies = await db
      .select({ id: companyMaster.id, companyName: companyMaster.companyName })
      .from(companyMaster)

   const nameToId = new Map(allCompanies.map((c) => [c.companyName.toLowerCase(), c.id]))

   // Resolve which names map to valid company IDs
   const resolvedIds = new Set<string>()
   const notFound: string[] = []
   for (const name of companyNames) {
      const id = nameToId.get(name.toLowerCase())
      if (id) resolvedIds.add(id)
      else notFound.push(name)
   }

   // Existing members of this index
   const existing = await db
      .select({ id: indexCompany.id, companyId: indexCompany.companyId })
      .from(indexCompany)
      .where(eq(indexCompany.indexId, indexId))

   const existingMap = new Map(existing.map((r) => [r.companyId, r.id]))

   // Remove members not in the CSV
   let removed = 0
   for (const [companyId, rowId] of existingMap) {
      if (!resolvedIds.has(companyId)) {
         await db.delete(indexCompany).where(eq(indexCompany.id, rowId))
         removed++
      }
   }

   // Add members in CSV not yet in index
   let added = 0
   let unchanged = 0
   for (const companyId of resolvedIds) {
      if (existingMap.has(companyId)) {
         unchanged++
      } else {
         await db.insert(indexCompany).values({
            id: randomUUID(),
            indexId,
            companyId,
            addedAt: new Date(),
         })
         added++
      }
   }

   revalidatePath(`/admin/index/${indexId}`)
   return { added, removed, unchanged, notFound }
}
