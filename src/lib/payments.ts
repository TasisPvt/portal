import "server-only"

import { randomUUID } from "crypto"
import { and, eq, inArray, max } from "drizzle-orm"

import { db } from "@/src/db/client"
import {
   subscription,
   pricingPlan,
   indexCompany,
   companyShariah,
   subscriptionListSnapshot,
   payment,
} from "@/src/db/schema"

export type DurationType = "one_time" | "monthly" | "quarterly" | "annual"

type PlanRow = typeof pricingPlan.$inferSelect
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export function computeEndDate(durationType: DurationType, startDate: Date): Date {
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

// For list plans: snapshot the current index companies so the client's company
// list is frozen at subscription time and never affected by later index changes.
async function createListSnapshot(
   tx: Tx,
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

   // one_time: pin to the latest month already uploaded as of now.
   // quarterly/annual: use the current month (later months are added on import).
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

// Creates an active subscription (+ list snapshot for list plans). Prices/limits
// are passed in already locked at order time so they can't drift.
async function createSubscriptionRecord(
   tx: Tx,
   args: {
      clientId: string
      plan: PlanRow
      durationType: DurationType
      price: string
      stocksPerDay: number | null
      stocksInDuration: number | null
      taxableAmount: string
      cgst: string
      sgst: string
      igst: string
      gstRate: string
      placeOfSupply: string
   },
): Promise<string> {
   const startDate = new Date()
   const endDate = computeEndDate(args.durationType, startDate)
   const subscriptionId = randomUUID()

   await tx.insert(subscription).values({
      id: subscriptionId,
      clientId: args.clientId,
      planId: args.plan.id,
      durationType: args.durationType,
      status: "active",
      startDate,
      endDate,
      priceSnapshot: args.price,
      taxableAmount: args.taxableAmount,
      cgst: args.cgst,
      sgst: args.sgst,
      igst: args.igst,
      gstRate: args.gstRate,
      placeOfSupply: args.placeOfSupply,
      stocksPerDaySnapshot: args.stocksPerDay,
      stocksInDurationSnapshot: args.stocksInDuration,
      createdAt: startDate,
      updatedAt: startDate,
   })

   if (args.plan.type === "list" && args.plan.indexId) {
      await createListSnapshot(tx, subscriptionId, args.plan.indexId, args.durationType, startDate)
   }

   return subscriptionId
}

export type FinalizeResult =
   | { ok: true; alreadyPaid: boolean }
   | { ok: false; reason: "not_found" | "plan_not_found" }

/**
 * Idempotent, race-safe finalization of a paid order. Locks the payment row
 * (SELECT … FOR UPDATE) so concurrent calls can't both create a subscription.
 * Creates the subscription (or links an existing active one) and marks the
 * payment paid. Does NOT verify the checkout signature — the caller does that first.
 */
export async function finalizePaidOrder(args: {
   razorpayOrderId: string
   razorpayPaymentId: string
   razorpaySignature?: string | null
}): Promise<FinalizeResult> {
   return db.transaction(async (tx): Promise<FinalizeResult> => {
      const [pay] = await tx
         .select()
         .from(payment)
         .where(eq(payment.razorpayOrderId, args.razorpayOrderId))
         .limit(1)
         .for("update")

      if (!pay) return { ok: false, reason: "not_found" }
      if (pay.status === "paid") return { ok: true, alreadyPaid: true }

      const [plan] = await tx.select().from(pricingPlan).where(eq(pricingPlan.id, pay.planId)).limit(1)
      if (!plan) return { ok: false, reason: "plan_not_found" }

      const durationType = pay.durationType as DurationType

      // Don't create a duplicate active subscription for the same plan + duration.
      const [existingActive] = await tx
         .select({ id: subscription.id })
         .from(subscription)
         .where(
            and(
               eq(subscription.clientId, pay.clientId),
               eq(subscription.planId, pay.planId),
               eq(subscription.durationType, durationType),
               eq(subscription.status, "active"),
            ),
         )
         .limit(1)

      const subscriptionId = existingActive
         ? existingActive.id
         : await createSubscriptionRecord(tx, {
              clientId: pay.clientId,
              plan,
              durationType,
              price: pay.priceSnapshot,
              stocksPerDay: pay.stocksPerDaySnapshot,
              stocksInDuration: pay.stocksInDurationSnapshot,
              taxableAmount: pay.taxableAmount,
              cgst: pay.cgst,
              sgst: pay.sgst,
              igst: pay.igst,
              gstRate: pay.gstRate,
              placeOfSupply: pay.placeOfSupply,
           })

      await tx
         .update(payment)
         .set({
            status: "paid",
            razorpayPaymentId: args.razorpayPaymentId,
            razorpaySignature: args.razorpaySignature ?? pay.razorpaySignature,
            subscriptionId,
         })
         .where(eq(payment.id, pay.id))

      return { ok: true, alreadyPaid: false }
   })
}
