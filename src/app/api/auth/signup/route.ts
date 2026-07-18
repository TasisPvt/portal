import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { eq, or } from "drizzle-orm"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { generatePassword, sendWelcomeEmail } from "@/src/lib/mailer"
import { isWithinOtpDailyLimit, recordOtpSend, OTP_DAILY_LIMIT } from "@/src/lib/otp-rate-limit"

export async function POST(req: Request) {
   const { name, state, address, gstNumber, email, phone, aadharNumber, panNumber } =
      await req.json()

   if (!name || !state || !address || !email || !phone || !aadharNumber || !panNumber) {
      return NextResponse.json(
         { message: "All required fields must be filled" },
         { status: 400 },
      )
   }

   // Cap account emails per address per day (shared with the forgot-password
   // flow) so an inbox can't be spammed by repeated registration attempts.
   if (!(await isWithinOtpDailyLimit(email))) {
      return NextResponse.json(
         {
            message: `You've reached the daily limit of ${OTP_DAILY_LIMIT} email requests for this address. Please try again after 24 hours.`,
         },
         { status: 429 },
      )
   }

   // ── Pre-validate unique clientProfile fields BEFORE creating the user ──────
   // This prevents orphaned user/account rows when a profile field is a duplicate.
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
         taken.phone === phone ? "Phone number" :
         taken.aadharNumber === aadharNumber ? "Aadhar number" :
         "PAN number"

      return NextResponse.json(
         { message: `${field} is already registered` },
         { status: 409 },
      )
   }

   // ── Create the user ────────────────────────────────────────────────────────
   const tempPassword = generatePassword()
   let createdUserId: string | null = null

   try {
      const result = await auth.api.signUpEmail({
         body: { name, email, password: tempPassword, userType: "client" },
      })
      createdUserId = result.user.id

      await db
         .update(user)
         .set({ mustChangePassword: true })
         .where(eq(user.id, createdUserId))

      await db.insert(clientProfile).values({
         id: randomUUID(),
         userId: createdUserId,
         state,
         address,
         gstNumber: gstNumber || null,
         phone,
         aadharNumber,
         panNumber,
      })

      await sendWelcomeEmail({ to: email, name, password: tempPassword })
      await recordOtpSend(email, "register")

      // signUpEmail creates a session automatically - revoke it so the user
      // is redirected to login and must authenticate explicitly.
      await auth.api.signOut({ headers: req.headers })

      return NextResponse.json({ success: true })
   } catch (err: any) {
      // ── Cleanup: delete the user if anything after signUpEmail failed ────────
      if (createdUserId) {
         await db.delete(user).where(eq(user.id, createdUserId)).catch(() => {})
      }

      const message: string = err?.message ?? "Something went wrong"

      if (
         message.toLowerCase().includes("duplicate") ||
         message.toLowerCase().includes("unique")
      ) {
         return NextResponse.json(
            { message: "Email is already registered" },
            { status: 409 },
         )
      }

      return NextResponse.json({ message }, { status: 500 })
   }
}
