"use server"

import { randomUUID } from "crypto"
import { eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { indexMaster, indexCompany, companyMaster, pricingPlan } from "@/src/db/schema"
import { chunk } from "@/src/lib/db-batch"
import { requireAdmin } from "@/src/lib/require-admin"

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
   await requireAdmin()
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

   // Which pricing plans reference each index - used to pre-empt deletion of an
   // index that is still attached to a plan (the delete button is disabled and
   // explains why, rather than failing after the user confirms).
   const planRows = await db
      .select({ indexId: pricingPlan.indexId, name: pricingPlan.name })
      .from(pricingPlan)

   const planNamesByIndex = new Map<string, string[]>()
   for (const p of planRows) {
      if (!p.indexId) continue
      const list = planNamesByIndex.get(p.indexId)
      if (list) list.push(p.name)
      else planNamesByIndex.set(p.indexId, [p.name])
   }

   return rows.map((r) => ({ ...r, planNames: planNamesByIndex.get(r.id) ?? [] }))
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export async function getIndexDetail(id: string) {
   await requireAdmin()
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
   await requireAdmin()
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
   await requireAdmin()
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
   await requireAdmin()
   try {
      // Block deletion while the index is still attached to a pricing plan -
      // the plan must be pointed at a different index (or the index cleared)
      // first, otherwise the plan would silently lose its index reference.
      const plans = await db
         .select({ name: pricingPlan.name })
         .from(pricingPlan)
         .where(eq(pricingPlan.indexId, id))

      if (plans.length > 0) {
         const names = plans.map((p) => `"${p.name}"`).join(", ")
         return {
            success: false,
            message:
               plans.length === 1
                  ? `This index is used by the pricing plan ${names}. Remove it from that plan before deleting.`
                  : `This index is used by ${plans.length} pricing plans (${names}). Remove it from those plans before deleting.`,
         }
      }

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
   await requireAdmin()
   try {
      await db.delete(indexCompany).where(eq(indexCompany.id, indexCompanyId))
      revalidatePath(`/admin/index/${indexId}`)
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function getAllCompanyNames(): Promise<{ name: string; isActive: boolean }[]> {
   await requireAdmin()
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
   await requireAdmin()
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

   // Diff first, then apply as two batched statements inside one transaction -
   // a mid-sync failure must not leave the index half-updated.
   const rowIdsToRemove = [...existingMap]
      .filter(([companyId]) => !resolvedIds.has(companyId))
      .map(([, rowId]) => rowId)
   const companyIdsToAdd = [...resolvedIds].filter((companyId) => !existingMap.has(companyId))
   const unchanged = resolvedIds.size - companyIdsToAdd.length

   await db.transaction(async (tx) => {
      if (rowIdsToRemove.length) {
         await tx.delete(indexCompany).where(inArray(indexCompany.id, rowIdsToRemove))
      }
      if (companyIdsToAdd.length) {
         // Chunk: a full-universe index sync can add thousands of rows, which
         // overflows Postgres/Drizzle limits in a single INSERT.
         for (const batch of chunk(companyIdsToAdd)) {
            await tx.insert(indexCompany).values(
               batch.map((companyId) => ({
                  id: randomUUID(),
                  indexId,
                  companyId,
                  addedAt: new Date(),
               })),
            )
         }
      }
   })

   revalidatePath(`/admin/index/${indexId}`)
   return { added: companyIdsToAdd.length, removed: rowIdsToRemove.length, unchanged, notFound }
}
