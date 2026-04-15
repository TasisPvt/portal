import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"

export async function POST(req: Request) {
   const { email, password } = await req.json()

   if (!email || !password) {
      return NextResponse.json(
         { message: "Email and password are required" },
         { status: 400 }
      )
   }

   try {
      await auth.api.signInEmail({
         body: { email, password },
         headers: req.headers,
      })

      return NextResponse.json({ success: true })
   } catch (err: any) {
      // better-auth throws APIError with statusCode for known failures
      if (err?.statusCode === 403) {
         return NextResponse.json(
            { message: err.body?.message ?? "Your account has been blocked. Contact the admin for further details." },
            { status: 403 }
         )
      }

      return NextResponse.json(
         { message: "Invalid email or password" },
         { status: 401 }
      )
   }
}
