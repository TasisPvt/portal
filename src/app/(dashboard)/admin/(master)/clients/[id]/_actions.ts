"use server"

import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function toggleClientStatus(id: string, isActive: boolean) {
  await db.update(user).set({ isActive }).where(eq(user.id, id))
  revalidatePath(`/admin/clients/${id}`)
  revalidatePath("/admin/clients")
}
