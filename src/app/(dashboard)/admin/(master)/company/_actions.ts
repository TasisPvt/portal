"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { companyMaster, companyNameHistory, industryGroup, indexCompany, indexMaster } from "@/src/db/schema"

export type CompanyForBulkValidation = {
   id: string
   prowessId: string
   companyName: string
   isinCode: string | null
   serviceGroup: string | null
   bseScripCode: string | null
   bseScripId: string | null
   bseGroup: string | null
   nseSymbol: string | null
   nseListingDate: string | null
   nseDelistingDate: string | null
   bseListingDate: string | null
   bseDelistingDate: string | null
   industryGroupId: string | null
   industryGroupName: string | null
}

export async function getCompanyDetail(id: string) {
   const [company] = await db
      .select({
         id: companyMaster.id,
         prowessId: companyMaster.prowessId,
         companyName: companyMaster.companyName,
         isinCode: companyMaster.isinCode,
         bseScripCode: companyMaster.bseScripCode,
         bseScripId: companyMaster.bseScripId,
         bseGroup: companyMaster.bseGroup,
         nseSymbol: companyMaster.nseSymbol,
         serviceGroup: companyMaster.serviceGroup,
         nseListingDate: companyMaster.nseListingDate,
         nseDelistingDate: companyMaster.nseDelistingDate,
         bseListingDate: companyMaster.bseListingDate,
         bseDelistingDate: companyMaster.bseDelistingDate,
         industryGroupId: companyMaster.industryGroupId,
         industryGroupName: industryGroup.name,
         createdAt: companyMaster.createdAt,
         updatedAt: companyMaster.updatedAt,
      })
      .from(companyMaster)
      .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
      .where(eq(companyMaster.id, id))
      .limit(1)

   if (!company) return null

   const [history, indexes] = await Promise.all([
      db
         .select({ id: companyNameHistory.id, name: companyNameHistory.name, changedAt: companyNameHistory.changedAt })
         .from(companyNameHistory)
         .where(eq(companyNameHistory.companyId, id))
         .orderBy(companyNameHistory.changedAt),
      db
         .select({ id: indexMaster.id, name: indexMaster.name })
         .from(indexCompany)
         .innerJoin(indexMaster, eq(indexCompany.indexId, indexMaster.id))
         .where(eq(indexCompany.companyId, id))
         .orderBy(indexMaster.name),
   ])

   return { ...company, nameHistory: history, indexes }
}

export async function getCompaniesForBulkValidation(): Promise<CompanyForBulkValidation[]> {
   return db
      .select({
         id: companyMaster.id,
         prowessId: companyMaster.prowessId,
         companyName: companyMaster.companyName,
         isinCode: companyMaster.isinCode,
         serviceGroup: companyMaster.serviceGroup,
         bseScripCode: companyMaster.bseScripCode,
         bseScripId: companyMaster.bseScripId,
         bseGroup: companyMaster.bseGroup,
         nseSymbol: companyMaster.nseSymbol,
         nseListingDate: companyMaster.nseListingDate,
         nseDelistingDate: companyMaster.nseDelistingDate,
         bseListingDate: companyMaster.bseListingDate,
         bseDelistingDate: companyMaster.bseDelistingDate,
         industryGroupId: companyMaster.industryGroupId,
         industryGroupName: industryGroup.name,
      })
      .from(companyMaster)
      .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
}

export type CompanyInput = {
   prowessId: string
   companyName: string
   isinCode?: string
   bseScripCode?: string
   bseScripId?: string
   bseGroup?: string
   nseSymbol?: string
   serviceGroup?: string
   nseListingDate?: string
   nseDelistingDate?: string
   bseListingDate?: string
   bseDelistingDate?: string
   industryGroupId?: string
}

type ActionResult = { success: true } | { success: false; message: string; field?: string }

export async function createCompany(input: CompanyInput): Promise<ActionResult> {
   const prowessDup = await db
      .select({ id: companyMaster.id })
      .from(companyMaster)
      .where(eq(companyMaster.prowessId, input.prowessId))
      .limit(1)

   if (prowessDup.length > 0) {
      return { success: false, message: "A company with this Prowess ID already exists", field: "prowessId" }
   }

   if (input.isinCode) {
      const isinDup = await db
         .select({ id: companyMaster.id })
         .from(companyMaster)
         .where(eq(companyMaster.isinCode, input.isinCode))
         .limit(1)

      if (isinDup.length > 0) {
         return { success: false, message: "A company with this ISIN code already exists", field: "isinCode" }
      }
   }

   try {
      const id = randomUUID()
      const now = new Date()
      await db.insert(companyMaster).values({
         id,
         prowessId: input.prowessId,
         companyName: input.companyName,
         isinCode: input.isinCode,
         bseScripCode: input.bseScripCode || null,
         bseScripId: input.bseScripId || null,
         bseGroup: input.bseGroup || null,
         nseSymbol: input.nseSymbol || null,
         serviceGroup: input.serviceGroup,
         nseListingDate: input.nseListingDate || null,
         nseDelistingDate: input.nseDelistingDate || null,
         bseListingDate: input.bseListingDate || null,
         bseDelistingDate: input.bseDelistingDate || null,
         industryGroupId: input.industryGroupId || null,
         createdAt: now,
         updatedAt: now,
      })
      revalidatePath("/admin/company")
      return { success: true }
   } catch (err: any) {
      console.error("[createCompany]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function updateCompany(id: string, input: CompanyInput): Promise<ActionResult> {
   const prowessDup = await db
      .select({ id: companyMaster.id })
      .from(companyMaster)
      .where(eq(companyMaster.prowessId, input.prowessId))
      .limit(1)

   if (prowessDup.length > 0 && prowessDup[0].id !== id) {
      return { success: false, message: "A company with this Prowess ID already exists", field: "prowessId" }
   }

   if (input.isinCode) {
      const isinDup = await db
         .select({ id: companyMaster.id })
         .from(companyMaster)
         .where(eq(companyMaster.isinCode, input.isinCode))
         .limit(1)

      if (isinDup.length > 0 && isinDup[0].id !== id) {
         return { success: false, message: "A company with this ISIN code already exists", field: "isinCode" }
      }
   }

   try {
      const current = await db
         .select({ companyName: companyMaster.companyName })
         .from(companyMaster)
         .where(eq(companyMaster.id, id))
         .limit(1)

      await db
         .update(companyMaster)
         .set({
            prowessId: input.prowessId,
            companyName: input.companyName,
            isinCode: input.isinCode,
            bseScripCode: input.bseScripCode || null,
            bseScripId: input.bseScripId || null,
            bseGroup: input.bseGroup || null,
            nseSymbol: input.nseSymbol || null,
            serviceGroup: input.serviceGroup || null,
            nseListingDate: input.nseListingDate || null,
            nseDelistingDate: input.nseDelistingDate || null,
            bseListingDate: input.bseListingDate || null,
            bseDelistingDate: input.bseDelistingDate || null,
            industryGroupId: input.industryGroupId || null,
            updatedAt: new Date(),
         })
         .where(eq(companyMaster.id, id))

      if (current[0] && current[0].companyName !== input.companyName) {
         await db.insert(companyNameHistory).values({
            id: randomUUID(),
            companyId: id,
            name: current[0].companyName,
            changedAt: new Date(),
         })
      }

      revalidatePath("/admin/company")
      return { success: true }
   } catch (err: any) {
      console.error("[updateCompany]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
   try {
      await db.delete(companyMaster).where(eq(companyMaster.id, id))
      revalidatePath("/admin/company")
      return { success: true }
   } catch (err: any) {
      console.error("[deleteCompany]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

export async function bulkUpsertCompanies(
   inserts: CompanyInput[],
   updates: { id: string; input: CompanyInput }[],
): Promise<{ inserted: number; updated: number; skipped: { prowessId: string; reason: string }[] }> {
   const existing = await db
      .select({ id: companyMaster.id, prowessId: companyMaster.prowessId, isinCode: companyMaster.isinCode })
      .from(companyMaster)

   // IDs of companies being updated — exclude their own isinCodes from conflict checks
   const updatedIds = new Set(updates.map((u) => u.id))
   const existingProwessIds = new Set(existing.map((r) => r.prowessId))
   const existingIsinCodes = new Set(
      existing
         .filter((r) => !updatedIds.has(r.id) && r.isinCode != null)
         .map((r) => r.isinCode as string),
   )

   let inserted = 0
   let updated = 0
   const skipped: { prowessId: string; reason: string }[] = []

   for (const row of inserts) {
      if (existingProwessIds.has(row.prowessId)) {
         skipped.push({ prowessId: row.prowessId, reason: "Prowess ID already exists" })
         continue
      }
      if (row.isinCode && existingIsinCodes.has(row.isinCode)) {
         skipped.push({ prowessId: row.prowessId, reason: "ISIN code already exists" })
         continue
      }
      try {
         const newId = randomUUID()
         const now = new Date()
         await db.insert(companyMaster).values({
            id: newId,
            prowessId: row.prowessId,
            companyName: row.companyName,
            isinCode: row.isinCode || null,
            serviceGroup: row.serviceGroup || null,
            bseScripCode: row.bseScripCode || null,
            bseScripId: row.bseScripId || null,
            bseGroup: row.bseGroup || null,
            nseSymbol: row.nseSymbol || null,
            nseListingDate: row.nseListingDate || null,
            nseDelistingDate: row.nseDelistingDate || null,
            bseListingDate: row.bseListingDate || null,
            bseDelistingDate: row.bseDelistingDate || null,
            industryGroupId: row.industryGroupId || null,
            createdAt: now,
            updatedAt: now,
         })
         existingProwessIds.add(row.prowessId)
         if (row.isinCode) existingIsinCodes.add(row.isinCode)
         inserted++
      } catch (err: any) {
         console.error("[bulkUpsertCompanies insert]", row.prowessId, err)
         skipped.push({ prowessId: row.prowessId, reason: "Insert failed" })
      }
   }

   // Fetch current names for companies being updated to detect name changes
   const updateIdList = updates.map((u) => u.id)
   const currentNames = updateIdList.length > 0
      ? await db
         .select({ id: companyMaster.id, companyName: companyMaster.companyName })
         .from(companyMaster)
         .then((rows) => new Map(rows.filter((r) => updateIdList.includes(r.id)).map((r) => [r.id, r.companyName])))
      : new Map<string, string>()

   for (const { id, input } of updates) {
      if (input.isinCode && existingIsinCodes.has(input.isinCode)) {
         skipped.push({ prowessId: input.prowessId, reason: "ISIN code conflict" })
         continue
      }
      try {
         await db
            .update(companyMaster)
            .set({
               prowessId: input.prowessId,
               companyName: input.companyName,
               isinCode: input.isinCode || null,
               serviceGroup: input.serviceGroup || null,
               bseScripCode: input.bseScripCode || null,
               bseScripId: input.bseScripId || null,
               bseGroup: input.bseGroup || null,
               nseSymbol: input.nseSymbol || null,
               nseListingDate: input.nseListingDate || null,
               nseDelistingDate: input.nseDelistingDate || null,
               bseListingDate: input.bseListingDate || null,
               bseDelistingDate: input.bseDelistingDate || null,
               industryGroupId: input.industryGroupId || null,
               updatedAt: new Date(),
            })
            .where(eq(companyMaster.id, id))

         const oldName = currentNames.get(id)
         if (oldName && oldName !== input.companyName) {
            await db.insert(companyNameHistory).values({
               id: randomUUID(),
               companyId: id,
               name: oldName,
               changedAt: new Date(),
            })
         }

         if (input.isinCode) existingIsinCodes.add(input.isinCode)
         updated++
      } catch (err: any) {
         console.error("[bulkUpsertCompanies update]", input.prowessId, err)
         skipped.push({ prowessId: input.prowessId, reason: "Update failed" })
      }
   }

   revalidatePath("/admin/company")
   return { inserted, updated, skipped }
}
