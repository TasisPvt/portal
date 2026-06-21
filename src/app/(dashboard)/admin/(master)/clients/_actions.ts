"use server"

import { randomUUID } from "crypto"
import { eq, or } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"

import { db } from "@/src/db/client"
import { user, account, clientProfile } from "@/src/db/schema"
import { generatePassword, sendWelcomeEmail } from "@/src/lib/mailer"

type CreateClientInput = {
   name: string
   email: string
   phone: string
   aadharNumber: string
   panNumber: string
   state: string
   address: string
   gstNumber?: string
}

type ActionResult =
   | { success: true }
   | { success: false; message: string; field?: string }

export async function createClient(input: CreateClientInput): Promise<ActionResult> {
   const { name, email, phone, aadharNumber, panNumber, state, address, gstNumber } = input

   // ── Check clientProfile-level unique fields ────────────────────────────────
   const duplicate = await db
      .select({
         phone: clientProfile.phone,
         aadharNumber: clientProfile.aadharNumber,
         panNumber: clientProfile.panNumber,
      })
      .from(clientProfile)
      .where(
         or(
            eq(clientProfile.phone, phone),
            eq(clientProfile.aadharNumber, aadharNumber),
            eq(clientProfile.panNumber, panNumber),
         ),
      )
      .limit(1)

   if (duplicate.length > 0) {
      const taken = duplicate[0]
      const field =
         taken.phone === phone ? "phone" :
         taken.aadharNumber === aadharNumber ? "aadharNumber" :
         "panNumber"
      const label =
         field === "phone" ? "Phone number" :
         field === "aadharNumber" ? "Aadhar number" :
         "PAN number"
      return { success: false, message: `${label} is already registered`, field }
   }

   // ── Check email uniqueness ─────────────────────────────────────────────────
   const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

   if (existingUser.length > 0) {
      return { success: false, message: "Email is already registered", field: "email" }
   }

   // ── Create user + account + profile ───────────────────────────────────────
   const tempPassword = generatePassword()
   const userId = randomUUID()

   try {
      const hashedPassword = await hashPassword(tempPassword)

      // Insert the user row
      await db.insert(user).values({
         id: userId,
         name,
         email,
         emailVerified: false,
         userType: "client",
         mustChangePassword: true,
         isActive: true,
         createdAt: new Date(),
         updatedAt: new Date(),
      })

      // Insert the credential account (required for better-auth email/password login)
      await db.insert(account).values({
         id: randomUUID(),
         accountId: userId,
         providerId: "credential",
         userId,
         password: hashedPassword,
         createdAt: new Date(),
         updatedAt: new Date(),
      })

      // Insert KYC profile
      await db.insert(clientProfile).values({
         id: randomUUID(),
         userId,
         state,
         address,
         gstNumber: gstNumber || null,
         phone,
         aadharNumber,
         panNumber,
         createdAt: new Date(),
         updatedAt: new Date(),
      })

      await sendWelcomeEmail({ to: email, name, password: tempPassword })

      return { success: true }
   } catch (err: any) {
      // Best-effort cleanup if anything after the user insert failed
      await db.delete(user).where(eq(user.id, userId)).catch(() => {})

      console.error("[createClient] error:", err)
      return { success: false, message: err?.message ?? "Something went wrong" }
   }
}
