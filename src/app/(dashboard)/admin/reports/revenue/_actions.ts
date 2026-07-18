"use server"

import { desc, eq } from "drizzle-orm"

import { db } from "@/src/db/client"
import { payment, pricingPlan, user } from "@/src/db/schema"
import { requireAdmin } from "@/src/lib/require-admin"

export type RevenueService = "list" | "snapshot"

export type RevenuePayment = {
   id: string
   clientId: string
   clientName: string
   planName: string
   service: RevenueService
   durationType: string
   // Place of supply (client's state at order time); "" when unknown.
   state: string
   // Gross amount collected in rupees (GST-inclusive - payment.amount is paise).
   gross: number
   // GST portion of the gross, in rupees (cgst + sgst + igst).
   gst: number
   date: string // ISO timestamp
}

// Every settled (paid) payment, newest first, with the fields the revenue report
// needs. Filtering/aggregation happens client-side so the filters respond
// instantly without a round-trip per change.
export async function getPaidPayments(): Promise<RevenuePayment[]> {
   await requireAdmin()

   const rows = await db
      .select({
         id: payment.id,
         clientId: payment.clientId,
         clientName: user.name,
         planName: pricingPlan.name,
         service: pricingPlan.type,
         durationType: payment.durationType,
         state: payment.placeOfSupply,
         amount: payment.amount,
         cgst: payment.cgst,
         sgst: payment.sgst,
         igst: payment.igst,
         createdAt: payment.createdAt,
      })
      .from(payment)
      .innerJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .leftJoin(user, eq(payment.clientId, user.id))
      .where(eq(payment.status, "paid"))
      .orderBy(desc(payment.createdAt))

   return rows.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      clientName: r.clientName ?? "-",
      planName: r.planName ?? "-",
      service: r.service as RevenueService,
      durationType: r.durationType,
      state: r.state ?? "",
      gross: r.amount / 100,
      gst: Number(r.cgst) + Number(r.sgst) + Number(r.igst),
      date: r.createdAt.toISOString(),
   }))
}
