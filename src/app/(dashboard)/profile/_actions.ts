"use server"

import { headers } from "next/headers"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateDisplayName(name: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error("Unauthorized")

  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) throw new Error("Name must be at least 2 characters.")

  await db.update(user).set({ name: trimmed }).where(eq(user.id, session.user.id))
  revalidatePath("/profile")
}

export async function updatePhone(phone: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error("Unauthorized")

  const trimmed = phone.trim()
  if (!trimmed) throw new Error("Phone number is required.")

  try {
    await db
      .update(clientProfile)
      .set({ phone: trimmed })
      .where(eq(clientProfile.userId, session.user.id))
  } catch (e: any) {
    // PostgreSQL unique violation
    if (e.code === "23505") throw new Error("Phone number is already in use.")
    throw e
  }

  revalidatePath("/profile")
}