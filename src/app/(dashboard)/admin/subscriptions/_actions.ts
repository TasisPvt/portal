"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { subscription, pricingPlan, user } from "@/src/db/schema"

type ActionResult = { success: true } | { success: false; message: string }

export async function getAllSubscriptions() {
   return db
      .select({
         id: subscription.id,
         clientId: subscription.clientId,
         clientName: user.name,
         clientEmail: user.email,
         planId: subscription.planId,
         planName: pricingPlan.name,
         planType: pricingPlan.type,
         durationType: subscription.durationType,
         status: subscription.status,
         startDate: subscription.startDate,
         endDate: subscription.endDate,
         priceSnapshot: subscription.priceSnapshot,
         stocksPerDaySnapshot: subscription.stocksPerDaySnapshot,
         stocksInDurationSnapshot: subscription.stocksInDurationSnapshot,
         createdAt: subscription.createdAt,
      })
      .from(subscription)
      .leftJoin(user, eq(subscription.clientId, user.id))
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .orderBy(desc(subscription.createdAt))
}

export async function adminCancelSubscription(subscriptionId: string): Promise<ActionResult> {
   const [row] = await db
      .select({ id: subscription.id, status: subscription.status })
      .from(subscription)
      .where(eq(subscription.id, subscriptionId))
      .limit(1)

   if (!row) return { success: false, message: "Subscription not found" }
   if (row.status !== "active") return { success: false, message: "Subscription is not active" }

   try {
      await db
         .update(subscription)
         .set({ status: "cancelled", updatedAt: new Date() })
         .where(eq(subscription.id, subscriptionId))
      revalidatePath("/admin/subscriptions")
      return { success: true }
   } catch (err: any) {
      console.error("[adminCancelSubscription]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}
