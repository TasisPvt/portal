"use server"

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"

import { db } from "@/src/db/client"
import { user, account } from "@/src/db/schema"
import { generatePassword, sendWelcomeEmail } from "@/src/lib/mailer"
import { revalidatePath } from "next/cache"

type AdminRole = "super_admin" | "admin" | "manager"

type CreateAdminInput = {
  name: string
  email: string
  adminRole: AdminRole
}

type ActionResult =
  | { success: true }
  | { success: false; message: string; field?: string }

export async function createAdminUser(input: CreateAdminInput): Promise<ActionResult> {
  const { name, email, adminRole } = input

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  if (existing.length > 0) {
    return { success: false, message: "Email is already registered", field: "email" }
  }

  const tempPassword = generatePassword()
  const userId = randomUUID()

  try {
    const hashedPassword = await hashPassword(tempPassword)

    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: false,
      userType: "admin",
      adminRole,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await sendWelcomeEmail({ to: email, name, password: tempPassword })

    revalidatePath("/admin/users")
    return { success: true }
  } catch (err: any) {
    await db.delete(user).where(eq(user.id, userId)).catch(() => {})
    console.error("[createAdminUser] error:", err)
    return { success: false, message: err?.message ?? "Something went wrong" }
  }
}

export async function toggleUserStatus(id: string, isActive: boolean) {
  await db.update(user).set({ isActive }).where(eq(user.id, id))
  revalidatePath("/admin/users")
}
