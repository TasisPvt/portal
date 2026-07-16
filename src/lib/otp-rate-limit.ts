import "server-only"

import { randomUUID } from "crypto"
import { and, count, eq, gt } from "drizzle-orm"

import { db } from "@/src/db/client"
import { otpRequest } from "@/src/db/schema"

// Combined daily cap on OTP / account emails per address, shared across the
// forgot-password and register flows, to prevent inbox-spamming abuse.
export const OTP_DAILY_LIMIT = 10
const WINDOW_MS = 24 * 60 * 60 * 1000 // rolling 24 hours

export type OtpPurpose = "forgot_password" | "register"

// Emails are matched case-insensitively so casing tricks can't dodge the cap.
function normalize(email: string): string {
   return email.trim().toLowerCase()
}

/** Number of emails sent to this address within the last 24 hours. */
export async function otpSendsInWindow(email: string): Promise<number> {
   const since = new Date(Date.now() - WINDOW_MS)
   const [row] = await db
      .select({ n: count() })
      .from(otpRequest)
      .where(and(eq(otpRequest.email, normalize(email)), gt(otpRequest.createdAt, since)))
   return row?.n ?? 0
}

/** True while the address still has quota to receive another email today. */
export async function isWithinOtpDailyLimit(email: string): Promise<boolean> {
   return (await otpSendsInWindow(email)) < OTP_DAILY_LIMIT
}

/** Records that an email was sent to this address (counts toward the cap). */
export async function recordOtpSend(email: string, purpose: OtpPurpose): Promise<void> {
   await db.insert(otpRequest).values({
      id: randomUUID(),
      email: normalize(email),
      purpose,
   })
}
