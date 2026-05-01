"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import { subscription, pricingPlan } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"

type ActionResult = { success: true } | { success: false; message: string }

export async function getMySubscriptions() {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return []

   return db
      .select({
         id: subscription.id,
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
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(eq(subscription.clientId, session.user.id))
      .orderBy(desc(subscription.createdAt))
}

export async function cancelMySubscription(subscriptionId: string): Promise<ActionResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return { success: false, message: "Unauthorized" }

   const [row] = await db
      .select({ id: subscription.id, status: subscription.status, clientId: subscription.clientId })
      .from(subscription)
      .where(eq(subscription.id, subscriptionId))
      .limit(1)

   if (!row) return { success: false, message: "Subscription not found" }
   if (row.clientId !== session.user.id) return { success: false, message: "Unauthorized" }
   if (row.status !== "active") return { success: false, message: "Subscription is not active" }

   try {
      await db
         .update(subscription)
         .set({ status: "cancelled", updatedAt: new Date() })
         .where(eq(subscription.id, subscriptionId))
      revalidatePath("/subscriptions")
      return { success: true }
   } catch (err: any) {
      console.error("[cancelMySubscription]", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}
