import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

import { db } from "@/src/db/client"
import { user, verification } from "@/src/db/schema"
import { ACCOUNT_BLOCKED_MESSAGE } from "@/src/lib/constants"
import { generateOtp, sendOtpEmail } from "@/src/lib/mailer"

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function POST(req: Request) {
   const { email } = await req.json()

   if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
   }

   // Look up user — always return the same response to avoid email enumeration
   const [found] = await db
      .select({ id: user.id, name: user.name, email: user.email, isActive: user.isActive })
      .from(user)
      .where(eq(user.email, email))
      .limit(1)

   // if (!found) {
   //    return NextResponse.json(
   //       { message: "No account found with this email address." },
   //       { status: 404 }
   //    )
   // }

   if (found && !found.isActive) {
      return NextResponse.json({ message: ACCOUNT_BLOCKED_MESSAGE }, { status: 403 })
   }

   // Only generate and send an OTP for an existing, active account; otherwise
   if (found) {
      const otp = generateOtp()
      const identifier = `forgot-password:${email}`

      await db.delete(verification).where(eq(verification.identifier, identifier))

      await db.insert(verification).values({
         id: randomUUID(),
         identifier,
         value: otp,
         expiresAt: new Date(Date.now() + OTP_TTL_MS),
      })

      await sendOtpEmail({ to: found.email, name: found.name, otp })
   }

   return NextResponse.json({ success: true })
}
