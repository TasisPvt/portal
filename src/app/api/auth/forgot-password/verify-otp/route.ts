import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/src/db/client"
import { verification } from "@/src/db/schema"

/** Validates the OTP without consuming it — the password reset step will consume it. */
export async function POST(req: Request) {
   const { email, otp } = await req.json()

   if (!email || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 })
   }

   const identifier = `forgot-password:${email}`

   const [record] = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, identifier))
      .limit(1)

   if (!record) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 })
   }

   if (record.value !== otp) {
      return NextResponse.json({ message: "Incorrect OTP" }, { status: 400 })
   }

   if (new Date() > record.expiresAt) {
      await db.delete(verification).where(eq(verification.identifier, identifier))
      return NextResponse.json({ message: "OTP has expired. Please request a new one." }, { status: 400 })
   }

   return NextResponse.json({ success: true })
}
