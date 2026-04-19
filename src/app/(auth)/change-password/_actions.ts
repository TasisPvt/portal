"use server"

import { headers } from "next/headers"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"
import { eq } from "drizzle-orm"

export async function changePasswordAndVerify(currentPassword: string, newPassword: string) {
  const hdrs = await headers()

  const session = await auth.api.getSession({ headers: hdrs })
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Change password via better-auth (validates currentPassword internally)
  await auth.api.changePassword({
    body: { currentPassword, newPassword, revokeOtherSessions: false },
    headers: hdrs,
  })

  // Mark email verified and clear the forced-change flag in one query
  await db
    .update(user)
    .set({ mustChangePassword: false, emailVerified: true })
    .where(eq(user.id, session.user.id))
}
