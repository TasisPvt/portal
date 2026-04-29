"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import { pricingPlan, indexMaster, user } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"

type ActionResult = { success: true } | { success: false; message: string }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanType = "snapshot" | "list"

export type PlanInput = {
   name: string
   type: PlanType
   // list-only
   indexId?: string | null
   // prices
   oneTimePrice: string
   monthlyPrice?: string | null      // snapshot only
   quarterlyPrice: string
   annualPrice: string
   // stocks per duration (snapshot only — each duration has independent limits)
   oneTimeStocksPerDay?: number | null
   oneTimeStocksInDuration?: number | null
   monthlyStocksPerDay?: number | null
   monthlyStocksInDuration?: number | null
   quarterlyStocksPerDay?: number | null
   quarterlyStocksInDuration?: number | null
   annualStocksPerDay?: number | null
   annualStocksInDuration?: number | null
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getPricingPlans() {
   const rows = await db
      .select({
         id: pricingPlan.id,
         name: pricingPlan.name,
         type: pricingPlan.type,
         isActive: pricingPlan.isActive,
         indexId: pricingPlan.indexId,
         indexName: indexMaster.name,
         oneTimePrice: pricingPlan.oneTimePrice,
         monthlyPrice: pricingPlan.monthlyPrice,
         quarterlyPrice: pricingPlan.quarterlyPrice,
         annualPrice: pricingPlan.annualPrice,
         oneTimeStocksPerDay: pricingPlan.oneTimeStocksPerDay,
         oneTimeStocksInDuration: pricingPlan.oneTimeStocksInDuration,
         monthlyStocksPerDay: pricingPlan.monthlyStocksPerDay,
         monthlyStocksInDuration: pricingPlan.monthlyStocksInDuration,
         quarterlyStocksPerDay: pricingPlan.quarterlyStocksPerDay,
         quarterlyStocksInDuration: pricingPlan.quarterlyStocksInDuration,
         annualStocksPerDay: pricingPlan.annualStocksPerDay,
         annualStocksInDuration: pricingPlan.annualStocksInDuration,
         createdById: pricingPlan.createdById,
         createdByName: user.name,
         createdAt: pricingPlan.createdAt,
      })
      .from(pricingPlan)
      .leftJoin(indexMaster, eq(pricingPlan.indexId, indexMaster.id))
      .leftJoin(user, eq(pricingPlan.createdById, user.id))
      .orderBy(pricingPlan.name)

   return rows
}

export async function getAvailableIndexes() {
   return db
      .select({ id: indexMaster.id, name: indexMaster.name })
      .from(indexMaster)
      .orderBy(indexMaster.name)
}

// ---------------------------------------------------------------------------
// Shared values builder
// ---------------------------------------------------------------------------

function buildValues(input: PlanInput) {
   const isSnapshot = input.type === "snapshot"
   return {
      name: input.name.trim(),
      type: input.type,
      indexId: !isSnapshot ? (input.indexId ?? null) : null,
      oneTimePrice: input.oneTimePrice,
      monthlyPrice: isSnapshot ? (input.monthlyPrice ?? null) : null,
      quarterlyPrice: input.quarterlyPrice,
      annualPrice: input.annualPrice,
      oneTimeStocksPerDay: isSnapshot ? (input.oneTimeStocksPerDay ?? null) : null,
      oneTimeStocksInDuration: isSnapshot ? (input.oneTimeStocksInDuration ?? null) : null,
      monthlyStocksPerDay: isSnapshot ? (input.monthlyStocksPerDay ?? null) : null,
      monthlyStocksInDuration: isSnapshot ? (input.monthlyStocksInDuration ?? null) : null,
      quarterlyStocksPerDay: isSnapshot ? (input.quarterlyStocksPerDay ?? null) : null,
      quarterlyStocksInDuration: isSnapshot ? (input.quarterlyStocksInDuration ?? null) : null,
      annualStocksPerDay: isSnapshot ? (input.annualStocksPerDay ?? null) : null,
      annualStocksInDuration: isSnapshot ? (input.annualStocksInDuration ?? null) : null,
   }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPricingPlan(input: PlanInput): Promise<ActionResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Unauthorized" }

   const existing = await db
      .select({ id: pricingPlan.id })
      .from(pricingPlan)
      .where(eq(pricingPlan.name, input.name.trim()))
      .limit(1)

   if (existing.length > 0) {
      return { success: false, message: "A plan with this name already exists" }
   }

   try {
      await db.insert(pricingPlan).values({
         id: randomUUID(),
         isActive: true,
         createdById: session.user.id,
         createdAt: new Date(),
         updatedAt: new Date(),
         ...buildValues(input),
      })
      revalidatePath("/admin/pricing-plans")
      return { success: true }
   } catch (err: any) {
      console.error("[createPricingPlan]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updatePricingPlan(id: string, input: PlanInput): Promise<ActionResult> {
   const duplicate = await db
      .select({ id: pricingPlan.id })
      .from(pricingPlan)
      .where(eq(pricingPlan.name, input.name.trim()))
      .limit(1)

   if (duplicate.length > 0 && duplicate[0].id !== id) {
      return { success: false, message: "A plan with this name already exists" }
   }

   try {
      await db
         .update(pricingPlan)
         .set({ ...buildValues(input), updatedAt: new Date() })
         .where(eq(pricingPlan.id, id))
      revalidatePath("/admin/pricing-plans")
      return { success: true }
   } catch (err: any) {
      console.error("[updatePricingPlan]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

// ---------------------------------------------------------------------------
// Toggle status
// ---------------------------------------------------------------------------

export async function togglePricingPlanStatus(id: string, isActive: boolean): Promise<ActionResult> {
   try {
      await db
         .update(pricingPlan)
         .set({ isActive, updatedAt: new Date() })
         .where(eq(pricingPlan.id, id))
      revalidatePath("/admin/pricing-plans")
      return { success: true }
   } catch (err: any) {
      console.error("[togglePricingPlanStatus]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deletePricingPlan(id: string): Promise<ActionResult> {
   try {
      await db.delete(pricingPlan).where(eq(pricingPlan.id, id))
      revalidatePath("/admin/pricing-plans")
      return { success: true }
   } catch (err: any) {
      console.error("[deletePricingPlan]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}
