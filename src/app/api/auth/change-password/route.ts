import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"

export async function POST(req: Request) {
   const { currentPassword, newPassword } = await req.json()

   if (!currentPassword || !newPassword) {
      return NextResponse.json(
         { message: "All fields are required" },
         { status: 400 },
      )
   }

   // Identify the caller from their session cookie
   const session = await auth.api.getSession({ headers: req.headers })

   if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
   }

   try {
      // Validate current password and set the new one
      await auth.api.changePassword({
         body: { currentPassword, newPassword, revokeOtherSessions: false },
         headers: req.headers,
      })

      // Clear the forced-change flag — session stays alive, proxy will now allow dashboard access
      await db
         .update(user)
         .set({ mustChangePassword: false })
         .where(eq(user.id, session.user.id))

      return NextResponse.json({ success: true })
   } catch (err: any) {
      const message: string = err?.message ?? "Something went wrong"

      if (message.toLowerCase().includes("incorrect") || message.toLowerCase().includes("invalid")) {
         return NextResponse.json(
            { message: "Current password is incorrect" },
            { status: 400 },
         )
      }

      return NextResponse.json({ message }, { status: 500 })
   }
}
