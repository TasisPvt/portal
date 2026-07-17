"use server"

import { randomUUID } from "crypto"
import { and, desc, eq, gt } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/src/db/client"
import { user, session, clientStatusHistory } from "@/src/db/schema"
import { requireAdmin } from "@/src/lib/require-admin"

// Allowlist authorization: only admin-type users pass (a client's null role can
// never slip through), then returns the acting admin for audit attribution.
async function requireActor() {
  return requireAdmin()
}

export async function updateUserRole(id: string, adminRole: "super_admin" | "admin" | "manager") {
  const actor = await requireActor()
  if (actor.id === id) throw new Error("You cannot change your own role.")

  await db.update(user).set({ adminRole }).where(eq(user.id, id))
  revalidatePath(`/admin/users/${id}`)
  revalidatePath("/admin/users")
}

// Toggle a user's active status. Records an audit-trail entry (who, why, when),
// flips the flag, and — on deactivation — revokes the user's existing sessions
// so any logged-in device loses access on its next request. Admins cannot change
// their own status.
export async function toggleUserStatus(id: string, isActive: boolean, reason: string) {
  const actor = await requireActor()
  if (actor.id === id) throw new Error("You cannot change your own account status.")

  const trimmedReason = reason.trim()
  if (!trimmedReason) throw new Error("A reason is required.")

  await db.insert(clientStatusHistory).values({
    id: randomUUID(),
    clientId: id,
    action: isActive ? "activated" : "deactivated",
    reason: trimmedReason,
    performedById: actor.id,
    performedByName: actor.name,
  })

  await db.update(user).set({ isActive }).where(eq(user.id, id))

  if (!isActive) {
    await db.delete(session).where(eq(session.userId, id))
  }

  revalidatePath(`/admin/users/${id}`)
  revalidatePath("/admin/users")
}

export async function getUserStatusHistory(userId: string) {
  await requireActor()
  return db
    .select({
      id: clientStatusHistory.id,
      action: clientStatusHistory.action,
      reason: clientStatusHistory.reason,
      performedByName: clientStatusHistory.performedByName,
      createdAt: clientStatusHistory.createdAt,
    })
    .from(clientStatusHistory)
    .where(eq(clientStatusHistory.clientId, userId))
    .orderBy(desc(clientStatusHistory.createdAt))
}

// Active (non-expired) login sessions for a user, newest activity first.
export async function getUserSessions(userId: string) {
  await requireActor()
  return db
    .select({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt))
}

// Admin-initiated revoke of a user's login session. Scoped to the target userId.
export async function revokeUserSession(userId: string, sessionId: string) {
  await requireActor()
  await db.delete(session).where(and(eq(session.id, sessionId), eq(session.userId, userId)))
  revalidatePath(`/admin/users/${userId}`)
}
