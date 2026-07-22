"use server"

import { randomUUID } from "crypto"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import {
   pricingPlan,
   subscription,
   ticket,
   ticketMessage,
   user,
} from "@/src/db/schema"
import { DURATION_LABELS } from "@/src/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MyTicketRow = {
   id: string
   subject: string
   description: string
   status: string
   planName: string | null
   messageCount: number
   createdAt: Date
   updatedAt: Date
}

export type SubscriptionOption = {
   id: string
   label: string
}

export type MyTicketDetail = {
   id: string
   subject: string
   description: string
   status: string
   allowClientReplies: boolean
   planName: string | null
   clientName: string | null
   createdAt: Date
   messages: {
      id: string
      senderRole: string
      senderName: string | null
      body: string
      createdAt: Date
   }[]
}

type ActionResult = { success: true } | { success: false; message: string }

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getMyTickets(): Promise<MyTicketRow[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return []

   return db
      .select({
         id: ticket.id,
         subject: ticket.subject,
         description: ticket.description,
         status: ticket.status,
         planName: pricingPlan.name,
         messageCount: sql<number>`(select count(*)::int from ${ticketMessage} where ${ticketMessage.ticketId} = ${ticket.id})`,
         createdAt: ticket.createdAt,
         updatedAt: ticket.updatedAt,
      })
      .from(ticket)
      .leftJoin(subscription, eq(ticket.subscriptionId, subscription.id))
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(eq(ticket.clientId, session.user.id))
      .orderBy(desc(ticket.updatedAt))
}

// The client's subscriptions for the "related subscription" dropdown when
// raising a ticket. Includes non-active ones — issues often concern them.
export async function getMySubscriptionOptions(): Promise<SubscriptionOption[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return []

   const rows = await db
      .select({
         id: subscription.id,
         planName: pricingPlan.name,
         durationType: subscription.durationType,
         status: subscription.status,
      })
      .from(subscription)
      .innerJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(eq(subscription.clientId, session.user.id))
      .orderBy(desc(subscription.createdAt))

   return rows.map((r) => ({
      id: r.id,
      label: `${r.planName} · ${DURATION_LABELS[r.durationType] ?? r.durationType}${r.status !== "active" ? ` (${r.status})` : ""}`,
   }))
}

export async function getMyTicket(ticketId: string): Promise<MyTicketDetail | null> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return null

   const [row] = await db
      .select({
         id: ticket.id,
         subject: ticket.subject,
         description: ticket.description,
         status: ticket.status,
         allowClientReplies: ticket.allowClientReplies,
         planName: pricingPlan.name,
         createdAt: ticket.createdAt,
      })
      .from(ticket)
      .leftJoin(subscription, eq(ticket.subscriptionId, subscription.id))
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(and(eq(ticket.id, ticketId), eq(ticket.clientId, session.user.id)))
      .limit(1)

   if (!row) return null

   const messages = await db
      .select({
         id: ticketMessage.id,
         senderRole: ticketMessage.senderRole,
         senderName: user.name,
         body: ticketMessage.body,
         createdAt: ticketMessage.createdAt,
      })
      .from(ticketMessage)
      .leftJoin(user, eq(ticketMessage.senderId, user.id))
      .where(eq(ticketMessage.ticketId, ticketId))
      .orderBy(ticketMessage.createdAt)

   return { ...row, clientName: session.user.name ?? null, messages }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function createTicket(input: {
   subject: string
   description: string
   subscriptionId?: string | null
}): Promise<ActionResult & { ticketId?: string }> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { success: false, message: "Unauthorized" }

   const subject = input.subject.trim()
   const description = input.description.trim()
   if (subject.length < 3) return { success: false, message: "Subject must be at least 3 characters" }
   if (!description) return { success: false, message: "Please describe the issue" }

   // A linked subscription must belong to the caller.
   let subscriptionId: string | null = null
   if (input.subscriptionId) {
      const [own] = await db
         .select({ id: subscription.id })
         .from(subscription)
         .where(
            and(
               eq(subscription.id, input.subscriptionId),
               eq(subscription.clientId, session.user.id),
            ),
         )
         .limit(1)
      if (!own) return { success: false, message: "Invalid subscription" }
      subscriptionId = own.id
   }

   const ticketId = randomUUID()
   try {
      await db.insert(ticket).values({
         id: ticketId,
         clientId: session.user.id,
         subscriptionId,
         subject,
         description,
         status: "open",
      })
      revalidatePath("/support")
      return { success: true, ticketId }
   } catch (err) {
      console.error("[createTicket]", err)
      return { success: false, message: "Something went wrong. Please try again." }
   }
}

export async function addMyTicketMessage(ticketId: string, body: string): Promise<ActionResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return { success: false, message: "Unauthorized" }

   const text = body.trim()
   if (!text) return { success: false, message: "Message can't be empty" }

   const [row] = await db
      .select({
         id: ticket.id,
         status: ticket.status,
         allowClientReplies: ticket.allowClientReplies,
      })
      .from(ticket)
      .where(and(eq(ticket.id, ticketId), eq(ticket.clientId, session.user.id)))
      .limit(1)

   if (!row) return { success: false, message: "Ticket not found" }
   if (row.status === "closed") return { success: false, message: "This ticket is closed" }
   if (!row.allowClientReplies) {
      return { success: false, message: "Replies are not enabled for this ticket" }
   }

   try {
      await db.insert(ticketMessage).values({
         id: randomUUID(),
         ticketId,
         senderId: session.user.id,
         senderRole: "client",
         body: text,
      })
      await db.update(ticket).set({ updatedAt: new Date() }).where(eq(ticket.id, ticketId))
      revalidatePath(`/support/${ticketId}`)
      return { success: true }
   } catch (err) {
      console.error("[addMyTicketMessage]", err)
      return { success: false, message: "Something went wrong. Please try again." }
   }
}
