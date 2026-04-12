import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/src/db/client"
import { user, account, verification } from "@/src/db/schema"
import { hashPassword } from "@better-auth/utils/password"

export async function POST(req: Request) {
   const { email, otp, newPassword } = await req.json()

   if (!email || !otp || !newPassword) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
   }

   const identifier = `forgot-password:${email}`

   // ── Re-validate OTP (source of truth — prevents skipping the verify step) ─
   const [record] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, identifier))
      .limit(1)

   if (!record || record.value !== otp || new Date() > record.expiresAt) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 })
   }

   // ── Look up the user ──────────────────────────────────────────────────────
   const [found] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

   if (!found) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
   }

   // ── Set the new password ──────────────────────────────────────────────────
   const hashed = await hashPassword(newPassword)

   await db
      .update(account)
      .set({ password: hashed })
      .where(
         and(
            eq(account.userId, found.id),
            eq(account.providerId, "credential"),
         ),
      )

   // ── Consume OTP ───────────────────────────────────────────────────────────
   await db.delete(verification).where(eq(verification.identifier, identifier))

   return NextResponse.json({ success: true })
}
