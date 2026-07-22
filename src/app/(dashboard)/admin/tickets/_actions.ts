"use server"

import { randomUUID } from "crypto"
import { desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import {
   pricingPlan,
   subscription,
   ticket,
   ticketMessage,
   user,
} from "@/src/db/schema"
import { requireAdmin } from "@/src/lib/require-admin"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminTicketRow = {
   id: string
   subject: string
   status: string
   clientName: string | null
   clientEmail: string | null
   planName: string | null
   messageCount: number
   allowClientReplies: boolean
   createdAt: Date
   updatedAt: Date
}

export type AdminTicketDetail = {
   id: string
   subject: string
   description: string
   status: string
   allowClientReplies: boolean
   clientName: string | null
   clientEmail: string | null
   planName: string | null
   createdAt: Date
   messages: {
      id: string
      senderRole: string
      senderName: string | null
      body: string
      createdAt: Date
   }[]
}

export type TicketStatusValue = "open" | "resolved" | "closed"
const VALID_STATUSES: TicketStatusValue[] = ["open", "resolved", "closed"]

type ActionResult = { success: true } | { success: false; message: string }

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getAllTickets(): Promise<AdminTicketRow[]> {
   await requireAdmin()

   return db
      .select({
         id: ticket.id,
         subject: ticket.subject,
         status: ticket.status,
         clientName: user.name,
         clientEmail: user.email,
         planName: pricingPlan.name,
         messageCount: sql<number>`(select count(*)::int from ${ticketMessage} where ${ticketMessage.ticketId} = ${ticket.id})`,
         allowClientReplies: ticket.allowClientReplies,
         createdAt: ticket.createdAt,
         updatedAt: ticket.updatedAt,
      })
      .from(ticket)
      .leftJoin(user, eq(ticket.clientId, user.id))
      .leftJoin(subscription, eq(ticket.subscriptionId, subscription.id))
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .orderBy(desc(ticket.updatedAt))
}

export async function getAdminTicket(ticketId: string): Promise<AdminTicketDetail | null> {
   await requireAdmin()

   const [row] = await db
      .select({
         id: ticket.id,
         subject: ticket.subject,
         description: ticket.description,
         status: ticket.status,
         allowClientReplies: ticket.allowClientReplies,
         clientName: user.name,
         clientEmail: user.email,
         planName: pricingPlan.name,
         createdAt: ticket.createdAt,
      })
      .from(ticket)
      .leftJoin(user, eq(ticket.clientId, user.id))
      .leftJoin(subscription, eq(ticket.subscriptionId, subscription.id))
      .leftJoin(pricingPlan, eq(subscription.planId, pricingPlan.id))
      .where(eq(ticket.id, ticketId))
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

   return { ...row, messages }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function updateTicketStatus(
   ticketId: string,
   status: TicketStatusValue,
): Promise<ActionResult> {
   await requireAdmin()
   if (!VALID_STATUSES.includes(status)) return { success: false, message: "Invalid status" }

   try {
      await db
         .update(ticket)
         .set({ status, updatedAt: new Date() })
         .where(eq(ticket.id, ticketId))
      revalidatePath("/admin/tickets")
      revalidatePath(`/admin/tickets/${ticketId}`)
      revalidatePath("/support")
      revalidatePath(`/support/${ticketId}`)
      return { success: true }
   } catch (err) {
      console.error("[updateTicketStatus]", err)
      return { success: false, message: "Something went wrong" }
   }
}

export async function setTicketClientReplies(
   ticketId: string,
   allow: boolean,
): Promise<ActionResult> {
   await requireAdmin()

   try {
      await db
         .update(ticket)
         .set({ allowClientReplies: allow, updatedAt: new Date() })
         .where(eq(ticket.id, ticketId))
      revalidatePath(`/admin/tickets/${ticketId}`)
      revalidatePath(`/support/${ticketId}`)
      return { success: true }
   } catch (err) {
      console.error("[setTicketClientReplies]", err)
      return { success: false, message: "Something went wrong" }
   }
}

export async function addAdminTicketMessage(
   ticketId: string,
   body: string,
): Promise<ActionResult> {
   const actor = await requireAdmin()

   const text = body.trim()
   if (!text) return { success: false, message: "Message can't be empty" }

   const [row] = await db
      .select({ id: ticket.id, status: ticket.status })
      .from(ticket)
      .where(eq(ticket.id, ticketId))
      .limit(1)

   if (!row) return { success: false, message: "Ticket not found" }
   if (row.status === "closed") return { success: false, message: "This ticket is closed" }

   try {
      await db.insert(ticketMessage).values({
         id: randomUUID(),
         ticketId,
         senderId: actor.id,
         senderRole: "admin",
         body: text,
      })
      await db.update(ticket).set({ updatedAt: new Date() }).where(eq(ticket.id, ticketId))
      revalidatePath(`/admin/tickets/${ticketId}`)
      revalidatePath(`/support/${ticketId}`)
      return { success: true }
   } catch (err) {
      console.error("[addAdminTicketMessage]", err)
      return { success: false, message: "Something went wrong" }
   }
}
