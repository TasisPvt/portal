"use server"

import { randomUUID } from "crypto"
import { and, eq, inArray, max } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import {
   subscription,
   pricingPlan,
   indexMaster,
   indexCompany,
   companyShariah,
   subscriptionListSnapshot,
} from "@/src/db/schema"
import { auth } from "@/src/lib/auth"

export type DurationType = "one_time" | "monthly" | "quarterly" | "annual"

type ActionResult = { success: true } | { success: false; message: string }

const VALID_DURATIONS: Record<string, DurationType[]> = {
   snapshot: ["one_time", "monthly", "quarterly", "annual"],
   list: ["one_time", "quarterly", "annual"],
}

type PlanRow = typeof pricingPlan.$inferSelect

function snapshotFromPlan(
   plan: PlanRow,
   durationType: DurationType,
): { price: string; stocksPerDay: number | null; stocksInDuration: number | null } {
   switch (durationType) {
      case "one_time":
         return { price: plan.oneTimePrice!, stocksPerDay: plan.oneTimeStocksPerDay, stocksInDuration: plan.oneTimeStocksInDuration }
      case "monthly":
         return { price: plan.monthlyPrice!, stocksPerDay: plan.monthlyStocksPerDay, stocksInDuration: plan.monthlyStocksInDuration }
      case "quarterly":
         return { price: plan.quarterlyPrice!, stocksPerDay: plan.quarterlyStocksPerDay, stocksInDuration: plan.quarterlyStocksInDuration }
      case "annual":
         return { price: plan.annualPrice!, stocksPerDay: plan.annualStocksPerDay, stocksInDuration: plan.annualStocksInDuration }
   }
}

function computeEndDate(durationType: DurationType, startDate: Date): Date {
   if (durationType === "one_time") {
      const end = new Date(startDate)
      end.setHours(23, 59, 59, 999)
      return end
   }
   const days: Record<Exclude<DurationType, "one_time">, number> = {
      monthly: 30,
      quarterly: 90,
      annual: 365,
   }
   return new Date(startDate.getTime() + days[durationType] * 24 * 60 * 60 * 1000)
}

export async function getActivePlans() {
   return db
      .select({
         id: pricingPlan.id,
         name: pricingPlan.name,
         type: pricingPlan.type,
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
      })
      .from(pricingPlan)
      .leftJoin(indexMaster, eq(pricingPlan.indexId, indexMaster.id))
      .where(eq(pricingPlan.isActive, true))
      .orderBy(pricingPlan.name)
}

export async function subscribeToPlan(
   planId: string,
   durationType: DurationType,
): Promise<ActionResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Unauthorized" }

   const [plan] = await db
      .select()
      .from(pricingPlan)
      .where(and(eq(pricingPlan.id, planId), eq(pricingPlan.isActive, true)))
      .limit(1)

   if (!plan) return { success: false, message: "Plan not found or inactive" }

   if (!(VALID_DURATIONS[plan.type] ?? []).includes(durationType)) {
      return { success: false, message: "Invalid duration for this plan type" }
   }

   const existing = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            eq(subscription.planId, planId),
            eq(subscription.durationType, durationType),
            eq(subscription.status, "active"),
         ),
      )
      .limit(1)

   if (existing.length > 0) {
      return { success: false, message: "You already have an active subscription for this plan and duration" }
   }

   const { price, stocksPerDay, stocksInDuration } = snapshotFromPlan(plan, durationType)
   const startDate = new Date()
   const endDate = computeEndDate(durationType, startDate)

   const subscriptionId = randomUUID()

   try {
      await db.transaction(async (tx) => {
         await tx.insert(subscription).values({
            id: subscriptionId,
            clientId: session.user.id,
            planId,
            durationType,
            status: "active",
            startDate,
            endDate,
            priceSnapshot: price,
            stocksPerDaySnapshot: stocksPerDay,
            stocksInDurationSnapshot: stocksInDuration,
            createdAt: startDate,
            updatedAt: startDate,
         })

         // For list plans: snapshot the current index companies so the client's
         // company list is frozen at subscription time and never affected by
         // later index changes.
         if (plan.type === "list" && plan.indexId) {
            await createListSnapshot(tx, subscriptionId, plan.indexId, durationType, startDate)
         }
      })

      revalidatePath("/plans")
      revalidatePath("/subscriptions")
      revalidatePath("/stock/list")
      return { success: true }
   } catch (err: any) {
      console.error("[subscribeToPlan]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}

// ─── Snapshot helpers ─────────────────────────────────────────────────────────

async function createListSnapshot(
   tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
   subscriptionId: string,
   indexId: string,
   durationType: DurationType,
   startDate: Date,
) {
   const members = await tx
      .select({ companyId: indexCompany.companyId })
      .from(indexCompany)
      .where(eq(indexCompany.indexId, indexId))

   if (!members.length) return

   const companyIds = members.map((m) => m.companyId)

   // one_time: pin to the latest month that was already uploaded as of now.
   // quarterly/annual: use the current month (snapshot is for the start month;
   //   subsequent months are added when the admin uploads monthly data).
   let snapshotMonth: string | null

   if (durationType === "one_time") {
      const [row] = await tx
         .select({ month: max(companyShariah.month) })
         .from(companyShariah)
         .where(inArray(companyShariah.companyId, companyIds))
      snapshotMonth = row?.month ?? null
   } else {
      snapshotMonth = startDate.toISOString().slice(0, 7)
   }

   if (!snapshotMonth) return

   await tx
      .insert(subscriptionListSnapshot)
      .values(members.map((m) => ({
         id: randomUUID(),
         subscriptionId,
         companyId: m.companyId,
         month: snapshotMonth!,
      })))
      .onConflictDoNothing()
}
