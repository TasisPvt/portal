import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { ACCOUNT_BLOCKED_MESSAGE } from "@/src/lib/constants"
import { expireStaleSubscriptions, expireAllStaleSubscriptions } from "@/src/lib/subscription-access"

export async function POST(req: Request) {
   const { email, password } = await req.json()

   if (!email || !password) {
      return NextResponse.json(
         { message: "Email and password are required" },
         { status: 400 }
      )
   }

   try {
      const result = await auth.api.signInEmail({
         body: { email, password },
         headers: req.headers,
      })

      // Refresh the status column for subscriptions that expired while away.
      // Admins need every client's status current (they manage all of them);
      // clients only their own. Best-effort — must never fail the login.
      if (result?.user?.id) {
         try {
            if (result.user.userType === "admin") {
               await expireAllStaleSubscriptions()
            } else {
               await expireStaleSubscriptions(result.user.id)
            }
         } catch (err) {
            console.error("[login] expireStaleSubscriptions", err)
         }
      }

      return NextResponse.json({ success: true })
   } catch (err: any) {
      // better-auth throws APIError with statusCode for known failures
      if (err?.statusCode === 403) {
         return NextResponse.json(
            { message: err.body?.message ?? ACCOUNT_BLOCKED_MESSAGE },
            { status: 403 }
         )
      }

      return NextResponse.json(
         { message: "Invalid email or password" },
         { status: 401 }
      )
   }
}
