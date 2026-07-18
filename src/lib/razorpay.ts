import "server-only"

import crypto from "crypto"
import Razorpay from "razorpay"

// Public key id is safe to expose to the browser; the secret never leaves the server.
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? ""

let client: Razorpay | null = null

/** Lazily-constructed Razorpay client. Throws a clear error if keys are missing. */
export function getRazorpay(): Razorpay {
   const key_id = process.env.RAZORPAY_KEY_ID
   const key_secret = process.env.RAZORPAY_KEY_SECRET
   if (!key_id || !key_secret) {
      throw new Error("Razorpay is not configured - set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
   }
   if (!client) client = new Razorpay({ key_id, key_secret })
   return client
}

/**
 * Verifies the checkout signature Razorpay returns to the browser.
 * signature = HMAC_SHA256(`${orderId}|${paymentId}`, key_secret).
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
   const secret = process.env.RAZORPAY_KEY_SECRET
   if (!secret) return false
   return timingSafeEqualHex(
      crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"),
      signature,
   )
}

function timingSafeEqualHex(expected: string, received: string): boolean {
   try {
      const a = Buffer.from(expected)
      const b = Buffer.from(received)
      return a.length === b.length && crypto.timingSafeEqual(a, b)
   } catch {
      return false
   }
}
