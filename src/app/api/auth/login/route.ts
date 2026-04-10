import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET!

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
      })
      const user = result.user

      return NextResponse.json({
         success: true
      })
   } catch {
      return NextResponse.json(
         { message: "Invalid email or password" },
         { status: 401 }
      )
   }
}