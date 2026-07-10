import "server-only"

import { randomUUID } from "crypto"
import { and, eq, gte, inArray, max } from "drizzle-orm"

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

export type PlanType = "list" | "snapshot"

export function computeEndDate(
   durationType: DurationType,
   startDate: Date,
   planType: PlanType,
): Date {
   if (durationType === "one_time") {
      // A one-time snapshot plan is valid for the day only. A one-time list plan
      // stays valid for a full month (its frozen company list is usable that long).
      if (planType === "list") {
         return new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
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
      taxableAmount: string
      cgst: string
      sgst: string
      igst: string
      gstRate: string
      placeOfSupply: string
   },
): Promise<string> {
   const startDate = new Date()
   const endDate = computeEndDate(args.durationType, startDate, args.plan.type as PlanType)
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
      // One-time snapshot is a consumable day-pass: re-buying it while today's
      // pass is still valid tops up that pass's daily quota instead of creating
      // a parallel subscription. A stale pass (endDate passed) starts fresh.
      const isOneTimeSnapshot = plan.type === "snapshot" && durationType === "one_time"

      // Find an existing *still-valid* subscription for the same plan + duration.
      // The endDate guard is essential: `status` is only lazily expired, so
      // without it a re-purchase of a lapsed plan could reattach the dead
      // subscription (no new endDate) and the user would pay for nothing.
      const [existingActive] = await tx
         .select({ id: subscription.id, stocksPerDaySnapshot: subscription.stocksPerDaySnapshot })
         .from(subscription)
         .where(
            and(
               eq(subscription.clientId, pay.clientId),
               eq(subscription.planId, pay.planId),
               eq(subscription.durationType, durationType),
               eq(subscription.status, "active"),
               gte(subscription.endDate, new Date()),
            ),
         )
         .limit(1)

      let subscriptionId: string
      if (existingActive && isOneTimeSnapshot) {
         subscriptionId = existingActive.id
         // Top up the day-pass by this purchase's per-day allotment. Skip when
         // either side is null (unlimited) — an unlimited pass already covers it.
         if (existingActive.stocksPerDaySnapshot !== null && pay.stocksPerDaySnapshot !== null) {
            await tx
               .update(subscription)
               .set({
                  stocksPerDaySnapshot: existingActive.stocksPerDaySnapshot + pay.stocksPerDaySnapshot,
                  updatedAt: new Date(),
               })
               .where(eq(subscription.id, existingActive.id))
         }
      } else if (existingActive) {
         // Standing plans: don't create a duplicate for the same plan + duration.
         subscriptionId = existingActive.id
      } else {
         subscriptionId = await createSubscriptionRecord(tx, {
            clientId: pay.clientId,
            plan,
            durationType,
            price: pay.priceSnapshot,
            stocksPerDay: pay.stocksPerDaySnapshot,
            taxableAmount: pay.taxableAmount,
            cgst: pay.cgst,
            sgst: pay.sgst,
            igst: pay.igst,
            gstRate: pay.gstRate,
            placeOfSupply: pay.placeOfSupply,
         })
      }

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
