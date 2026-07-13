"use server"

import { randomUUID } from "crypto"
import { and, desc, eq, gt } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { user, session, clientStatusHistory } from "@/src/db/schema"
import { auth } from "@/src/lib/auth"
import { Roles } from "@/src/lib/constants"

// Toggle a client's active status. Records an audit-trail entry (who, why, when)
// in the same request, then flips the flag. Managers are not permitted to
// activate/deactivate accounts — only admin / super-admin.
export async function toggleClientStatus(id: string, isActive: boolean, reason: string) {
   const authSession = await auth.api.getSession({ headers: await headers() })
   const actor = authSession?.user
   if (!actor) {
      throw new Error("Not authenticated")
   }
   if (actor.adminRole === Roles.MANAGER) {
      throw new Error("Your role cannot activate or deactivate accounts.")
   }

   const trimmedReason = reason.trim()
   if (!trimmedReason) {
      throw new Error("A reason is required.")
   }

   await db.insert(clientStatusHistory).values({
      id: randomUUID(),
      clientId: id,
      action: isActive ? "activated" : "deactivated",
      reason: trimmedReason,
      performedById: actor.id,
      performedByName: actor.name,
   })

   await db.update(user).set({ isActive }).where(eq(user.id, id))

   // On deactivation, revoke every existing session for this client so any
   // already-logged-in device loses access on its next request (the login hook
   // then blocks re-entry). Login enforcement alone only stops new sign-ins.
   if (!isActive) {
      await db.delete(session).where(eq(session.userId, id))
   }

   revalidatePath(`/admin/clients/${id}`)
   revalidatePath("/admin/clients")
}

// Active (non-expired) login sessions for a client, newest activity first.
export async function getClientSessions(clientId: string) {
   return db
      .select({
         id: session.id,
         ipAddress: session.ipAddress,
         userAgent: session.userAgent,
         createdAt: session.createdAt,
         updatedAt: session.updatedAt,
      })
      .from(session)
      .where(and(eq(session.userId, clientId), gt(session.expiresAt, new Date())))
      .orderBy(desc(session.updatedAt))
}

// Admin-initiated revoke of a client's login session (delete a suspicious login
// on the client's behalf). Restricted to admin / super-admin — managers cannot.
export async function revokeClientSession(clientId: string, sessionId: string) {
   const authSession = await auth.api.getSession({ headers: await headers() })
   const actor = authSession?.user
   if (!actor || actor.userType !== "admin") {
      throw new Error("Not authorized")
   }
   if (actor.adminRole === Roles.MANAGER) {
      throw new Error("Your role cannot revoke login sessions.")
   }

   await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, clientId)))

   revalidatePath(`/admin/clients/${clientId}`)
}

export async function getClientStatusHistory(clientId: string) {
   return db
      .select({
         id: clientStatusHistory.id,
         action: clientStatusHistory.action,
         reason: clientStatusHistory.reason,
         performedByName: clientStatusHistory.performedByName,
         createdAt: clientStatusHistory.createdAt,
      })
      .from(clientStatusHistory)
      .where(eq(clientStatusHistory.clientId, clientId))
      .orderBy(desc(clientStatusHistory.createdAt))
}

export type ClientStatusHistoryEntry = Awaited<ReturnType<typeof getClientStatusHistory>>[number]
