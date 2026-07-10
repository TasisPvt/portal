"use server"

import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"

import { db } from "@/src/db/client"
import { subscription, pricingPlan } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"
import { expireStaleSubscriptions } from "@/src/lib/subscription-access"

export async function getMySubscriptions() {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) return []

   // Keep the status column truthful before rendering the page.
   await expireStaleSubscriptions(session.user.id)

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
         createdAt: subscription.createdAt,
      })
      .from(subscription)
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(eq(subscription.clientId, session.user.id))
      .orderBy(desc(subscription.createdAt))
}
