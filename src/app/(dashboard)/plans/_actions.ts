"use server"

import { randomUUID } from "crypto"
import { and, eq, gte, ne, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import {
   subscription,
   pricingPlan,
   indexMaster,
   indexCompany,
   payment,
   clientProfile,
} from "@/src/db/schema"
import { auth } from "@/src/lib/auth"
import { getRazorpay, RAZORPAY_KEY_ID, verifyRazorpaySignature } from "@/src/lib/razorpay"
import { finalizePaidOrder } from "@/src/lib/payments"
import { expireStaleSubscriptions } from "@/src/lib/subscription-access"
import { computeGstPaise, paiseToAmount, GST_RATE } from "@/src/lib/gst"
import { sendInvoiceForPayment } from "@/src/lib/invoice/generate"

export type DurationType = "one_time" | "monthly" | "quarterly" | "annual"

type ActionResult = { success: true } | { success: false; message: string }

const VALID_DURATIONS: Record<string, DurationType[]> = {
   snapshot: ["one_time", "monthly", "quarterly", "annual"],
   list: ["one_time", "annual"],
}

type PlanRow = typeof pricingPlan.$inferSelect

function snapshotFromPlan(
   plan: PlanRow,
   durationType: DurationType,
): { price: string; stocksPerDay: number | null } {
   switch (durationType) {
      case "one_time":
         return { price: plan.oneTimePrice!, stocksPerDay: plan.oneTimeStocksPerDay }
      case "monthly":
         return { price: plan.monthlyPrice!, stocksPerDay: plan.monthlyStocksPerDay }
      case "quarterly":
         return { price: plan.quarterlyPrice!, stocksPerDay: plan.quarterlyStocksPerDay }
      case "annual":
         return { price: plan.annualPrice!, stocksPerDay: plan.annualStocksPerDay }
   }
}

// Logged-in client's state - drives the GST place-of-supply split in the UI.
export async function getCurrentClientState(): Promise<string | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return null
   const [row] = await db
      .select({ state: clientProfile.state })
      .from(clientProfile)
      .where(eq(clientProfile.userId, session.user.id))
      .limit(1)
   return row?.state ?? null
}

export async function getSubscribedPlanIds(): Promise<string[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return []
   // A plan counts as "subscribed" (and so locks its card on /plans) only for a
   // standing subscription still inside its validity window. A one-time snapshot
   // is a consumable day-pass - it never locks the card, so the user can keep
   // buying more (each purchase tops up the day's quota; see finalizePaidOrder).
   // Validity is derived from endDate, not the (unreliable) status column.
   const rows = await db
      .select({ planId: subscription.planId })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(
         and(
            eq(subscription.clientId, session.user.id),
            ne(subscription.status, "cancelled"),
            gte(subscription.endDate, new Date()),
            or(ne(pricingPlan.type, "snapshot"), ne(subscription.durationType, "one_time")),
         ),
      )
   return [...new Set(rows.map((r) => r.planId))]
}

export async function getActivePlans() {
   return db
      .select({
         id: pricingPlan.id,
         name: pricingPlan.name,
         type: pricingPlan.type,
         indexId: pricingPlan.indexId,
         indexName: indexMaster.name,
         // Number of companies in the plan's index (0 for non-list plans).
         indexCompanyCount: sql<number>`(select count(*)::int from ${indexCompany} where ${indexCompany.indexId} = ${pricingPlan.indexId})`,
         category: pricingPlan.category,
         oneTimePrice: pricingPlan.oneTimePrice,
         monthlyPrice: pricingPlan.monthlyPrice,
         quarterlyPrice: pricingPlan.quarterlyPrice,
         annualPrice: pricingPlan.annualPrice,
         oneTimeStocksPerDay: pricingPlan.oneTimeStocksPerDay,
         monthlyStocksPerDay: pricingPlan.monthlyStocksPerDay,
         quarterlyStocksPerDay: pricingPlan.quarterlyStocksPerDay,
         annualStocksPerDay: pricingPlan.annualStocksPerDay,
      })
      .from(pricingPlan)
      .leftJoin(indexMaster, eq(pricingPlan.indexId, indexMaster.id))
      .where(eq(pricingPlan.isActive, true))
      .orderBy(pricingPlan.name)
}

async function hasActiveSubscription(
   clientId: string,
   planId: string,
   durationType: DurationType,
): Promise<boolean> {
   const existing = await db
      .select({ id: subscription.id })
      .from(subscription)
      .where(
         and(
            eq(subscription.clientId, clientId),
            eq(subscription.planId, planId),
            eq(subscription.durationType, durationType),
            eq(subscription.status, "active"),
         ),
      )
      .limit(1)
   return existing.length > 0
}

// ─── Razorpay payment flow ──────────────────────────────────────────────────

export type CreateOrderResult =
   | {
        success: true
        orderId: string
        amount: number
        currency: string
        keyId: string
        planName: string
        prefill: { name: string; email: string; contact: string }
     }
   | { success: false; message: string }

// Step 1 - create a Razorpay order + a pending payment row. No subscription is
// created yet. Amount is always derived server-side from the plan.
export async function createPaymentOrder(
   planId: string,
   durationType: DurationType,
): Promise<CreateOrderResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Unauthorized" }
   const userId = session.user.id

   const [plan] = await db
      .select()
      .from(pricingPlan)
      .where(and(eq(pricingPlan.id, planId), eq(pricingPlan.isActive, true)))
      .limit(1)
   if (!plan) return { success: false, message: "Plan not found or inactive" }

   if (!(VALID_DURATIONS[plan.type] ?? []).includes(durationType)) {
      return { success: false, message: "Invalid duration for this plan type" }
   }

   // Expire any of this user's lapsed subscriptions right here on the purchase
   // path, so the re-purchase check below (and finalize) can't mistake an
   // expired-but-not-yet-swept subscription for an active one - otherwise a
   // re-purchase of an expired plan would be wrongly blocked as "already active".
   await expireStaleSubscriptions(userId)

   // One-time snapshot is a consumable day-pass - re-purchasing tops up the day's
   // quota (see finalizePaidOrder), so it is never blocked as "already active".
   const isOneTimeSnapshot = plan.type === "snapshot" && durationType === "one_time"
   if (!isOneTimeSnapshot && (await hasActiveSubscription(userId, planId, durationType))) {
      return { success: false, message: "You already have an active subscription for this plan and duration" }
   }

   const { price, stocksPerDay } = snapshotFromPlan(plan, durationType)
   const amountPaise = Math.round(parseFloat(price ?? "") * 100)
   if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return { success: false, message: "This plan option is not available for purchase" }
   }

   // Client profile - used for the GST place of supply + Razorpay prefill.
   const [profile] = await db
      .select({ phone: clientProfile.phone, state: clientProfile.state })
      .from(clientProfile)
      .where(eq(clientProfile.userId, userId))
      .limit(1)

   // GST is included in the gross price (18% of gross); split by place of supply.
   const gst = computeGstPaise(amountPaise, profile?.state)

   const paymentId = randomUUID()

   let order: { id: string }
   try {
      order = await getRazorpay().orders.create({
         amount: amountPaise,
         currency: "INR",
         receipt: paymentId, // ≤ 40 chars (UUID is 36)
         notes: { paymentId, planId, durationType, clientId: userId },
      })
   } catch (err) {
      console.error("[createPaymentOrder] razorpay", err)
      return { success: false, message: "Could not initiate payment. Please try again." }
   }

   await db.insert(payment).values({
      id: paymentId,
      clientId: userId,
      planId,
      durationType,
      amount: amountPaise,
      currency: "INR",
      priceSnapshot: price!,
      taxableAmount: paiseToAmount(gst.taxable),
      cgst: paiseToAmount(gst.cgst),
      sgst: paiseToAmount(gst.sgst),
      igst: paiseToAmount(gst.igst),
      gstRate: String(GST_RATE),
      placeOfSupply: profile?.state ?? "",
      stocksPerDaySnapshot: stocksPerDay,
      razorpayOrderId: order.id,
      status: "created",
   })

   return {
      success: true,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
      planName: plan.name,
      prefill: {
         name: session.user.name ?? "",
         email: session.user.email ?? "",
         contact: profile?.phone ?? "",
      },
   }
}

// Step 2 - verify the checkout signature, then create the subscription. The
// amount is never trusted from the client; we use the row created in step 1.
export async function verifyPayment(args: {
   razorpayOrderId: string
   razorpayPaymentId: string
   razorpaySignature: string
}): Promise<ActionResult & { orderId?: string }> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Unauthorized" }
   const userId = session.user.id

   const [pay] = await db
      .select({ status: payment.status })
      .from(payment)
      .where(and(eq(payment.razorpayOrderId, args.razorpayOrderId), eq(payment.clientId, userId)))
      .limit(1)

   if (!pay) return { success: false, message: "Payment record not found" }
   // Idempotent: the webhook or a double-submit may have already finalized it.
   if (pay.status === "paid") return { success: true, orderId: args.razorpayOrderId }

   if (!verifyRazorpaySignature(args.razorpayOrderId, args.razorpayPaymentId, args.razorpaySignature)) {
      await db
         .update(payment)
         .set({ status: "failed", razorpayPaymentId: args.razorpayPaymentId })
         .where(and(eq(payment.razorpayOrderId, args.razorpayOrderId), eq(payment.clientId, userId)))
      return { success: false, message: "Payment verification failed" }
   }

   // Create the subscription + mark paid (race-safe & idempotent; shared with the webhook).
   const result = await finalizePaidOrder({
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
   })
   if (!result.ok) {
      console.error("[verifyPayment] finalize failed", result.reason)
      return { success: false, message: "Payment succeeded but activating the subscription failed. Please contact support." }
   }

   // Email the GST invoice once (only on first successful finalization).
   // Never let invoice/email failures fail the payment.
   if (!result.alreadyPaid) {
      try {
         await sendInvoiceForPayment(args.razorpayOrderId)
      } catch (err) {
         console.error("[verifyPayment] invoice email failed", err)
      }
   }

   revalidatePath("/plans")
   revalidatePath("/subscriptions")
   revalidatePath("/payments")
   revalidatePath("/stock/list")
   revalidatePath("/stock/snapshot")
   revalidatePath("/stock/watchlist")
   return { success: true, orderId: args.razorpayOrderId }
}

// Marks a pending order as failed (called from the client on a failed payment)
// so the confirm page can show an accurate status.
export async function markPaymentFailed(razorpayOrderId: string): Promise<void> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return
   await db
      .update(payment)
      .set({ status: "failed" })
      .where(
         and(
            eq(payment.razorpayOrderId, razorpayOrderId),
            eq(payment.clientId, session.user.id),
            eq(payment.status, "created"),
         ),
      )
}

// Marks a pending order as cancelled (called when the user dismisses the
// checkout without paying). Only affects still-pending orders.
export async function markPaymentCancelled(razorpayOrderId: string): Promise<void> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return
   await db
      .update(payment)
      .set({ status: "cancelled" })
      .where(
         and(
            eq(payment.razorpayOrderId, razorpayOrderId),
            eq(payment.clientId, session.user.id),
            eq(payment.status, "created"),
         ),
      )
}

export type PaymentDetails = {
   status: string
   planName: string | null
   planType: string | null
   durationType: string
   amount: number
   currency: string
   priceSnapshot: string
   taxableAmount: string
   cgst: string
   sgst: string
   igst: string
   gstRate: string
   placeOfSupply: string
   startDate: Date | null
   endDate: Date | null
   subscriptionId: string | null
}

// Read model for the /confirm-payment page. Scoped to the logged-in user.
export async function getPaymentDetails(razorpayOrderId: string): Promise<PaymentDetails | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return null

   const [row] = await db
      .select({
         status: payment.status,
         durationType: payment.durationType,
         amount: payment.amount,
         currency: payment.currency,
         priceSnapshot: payment.priceSnapshot,
         taxableAmount: payment.taxableAmount,
         cgst: payment.cgst,
         sgst: payment.sgst,
         igst: payment.igst,
         gstRate: payment.gstRate,
         placeOfSupply: payment.placeOfSupply,
         planName: pricingPlan.name,
         planType: pricingPlan.type,
         startDate: subscription.startDate,
         endDate: subscription.endDate,
         subscriptionId: payment.subscriptionId,
      })
      .from(payment)
      .leftJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .leftJoin(subscription, eq(payment.subscriptionId, subscription.id))
      .where(and(eq(payment.razorpayOrderId, razorpayOrderId), eq(payment.clientId, session.user.id)))
      .limit(1)

   return row ?? null
}
