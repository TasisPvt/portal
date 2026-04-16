"use server"

import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function updateUserRole(id: string, adminRole: "super_admin" | "admin" | "manager") {
  await db.update(user).set({ adminRole }).where(eq(user.id, id))
  revalidatePath(`/admin/users/${id}`)
  revalidatePath("/admin/users")
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await db.update(user).set({ isActive }).where(eq(user.id, id))
  revalidatePath(`/admin/users/${id}`)
  revalidatePath("/admin/users")
}
