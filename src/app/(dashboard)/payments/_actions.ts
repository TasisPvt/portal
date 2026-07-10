"use server"

import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import { payment, pricingPlan } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"

export type PaymentHistoryRow = {
   id: string
   planName: string | null
   planType: string | null
   durationType: string
   priceSnapshot: string
   status: string
   razorpayPaymentId: string | null
   createdAt: Date
}

// Every checkout the client has made — the true money trail (one row per
// purchase, each with its own emailed invoice). Distinct from /subscriptions,
// which shows current access. A one-time snapshot day-pass tops up a single
// subscription but still appears here as separate purchases.
export async function getMyPayments(): Promise<PaymentHistoryRow[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return []

   return db
      .select({
         id: payment.id,
         planName: pricingPlan.name,
         planType: pricingPlan.type,
         durationType: payment.durationType,
         priceSnapshot: payment.priceSnapshot,
         status: payment.status,
         razorpayPaymentId: payment.razorpayPaymentId,
         createdAt: payment.createdAt,
      })
      .from(payment)
      .leftJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .where(eq(payment.clientId, session.user.id))
      .orderBy(desc(payment.createdAt))
}
