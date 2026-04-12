import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

import { db } from "@/src/db/client"
import { user, verification } from "@/src/db/schema"
import { generateOtp, sendOtpEmail } from "@/src/lib/mailer"

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(req: Request) {
   const { email } = await req.json()

   if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
   }

   // Look up user — always return the same response to avoid email enumeration
   const [found] = await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

   if (found) {
      const otp = generateOtp()
      const identifier = `forgot-password:${email}`

      // Upsert: delete any existing OTP for this email then insert fresh
      await db.delete(verification).where(eq(verification.identifier, identifier))

      await db.insert(verification).values({
         id: randomUUID(),
         identifier,
         value: otp,
         expiresAt: new Date(Date.now() + OTP_TTL_MS),
      })

      await sendOtpEmail({ to: found.email, name: found.name, otp })
   }

   // Always return success to prevent email enumeration
   return NextResponse.json({ success: true })
}
