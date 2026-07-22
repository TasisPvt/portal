"use server"

import { headers } from "next/headers"
import { eq } from "drizzle-orm"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { clientProfile } from "@/src/db/schema"
import { sendFeedbackEmail } from "@/src/lib/mailer"
import { SUPPORT_EMAIL } from "@/src/lib/constants"

export type FeedbackCategory = "feedback" | "suggestion" | "complaint"

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
   feedback: "Feedback",
   suggestion: "Suggestion",
   complaint: "Issue",
}

const MESSAGE_MAX = 1000
const MESSAGE_MIN = 5

export type FeedbackInput = {
   category: FeedbackCategory
   subject?: string
   message: string
}

type ActionResult = { success: true } | { success: false; message: string }

export async function submitFeedback(input: FeedbackInput): Promise<ActionResult> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session?.user?.id) {
      return { success: false, message: "You must be signed in to submit feedback." }
   }

   const category = input.category
   if (!CATEGORY_LABELS[category]) {
      return { success: false, message: "Please choose a category." }
   }

   const message = input.message.trim()
   if (message.length < MESSAGE_MIN) {
      return { success: false, message: "Please add a little more detail before submitting." }
   }
   if (message.length > MESSAGE_MAX) {
      return { success: false, message: `Detail must be ${MESSAGE_MAX} characters or fewer.` }
   }

   // Subject is only used for complaints, where it's required.
   const subject = category === "complaint" ? (input.subject ?? "").trim() : ""
   if (category === "complaint" && subject.length === 0) {
      return { success: false, message: "Please add a subject for your issue." }
   }

   // Pull the extra client details to include in the email to the admin.
   const [profile] = await db
      .select({ phone: clientProfile.phone, state: clientProfile.state })
      .from(clientProfile)
      .where(eq(clientProfile.userId, session.user.id))
      .limit(1)

   try {
      await sendFeedbackEmail({
         to: process.env.FEEDBACK_EMAIL || SUPPORT_EMAIL,
         categoryLabel: CATEGORY_LABELS[category],
         subject: category === "complaint" ? subject : null,
         message,
         client: {
            name: session.user.name,
            email: session.user.email,
            phone: profile?.phone ?? null,
            state: profile?.state ?? null,
         },
      })
      return { success: true }
   } catch (err: any) {
      return { success: false, message: err?.message ?? "Couldn't send your message. Please try again." }
   }
}
