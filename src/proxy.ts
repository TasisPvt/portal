import { betterFetch } from "@better-fetch/fetch"
import { NextResponse, type NextRequest } from "next/server"

// ─── Types ────────────────────────────────────────────────────────────────────

type UserType = "client" | "admin"

interface SessionUser {
   id: string
   name: string
   email: string
   userType: UserType
   adminRole: "super_admin" | "admin" | "manager" | "support" | null
   mustChangePassword: boolean
}

interface Session {
   session: { id: string; userId: string; expiresAt: string }
   user: SessionUser
}

// ─── Route config ─────────────────────────────────────────────────────────────

/** Routes accessible without a session. */
const PUBLIC_ROUTES = ["/login", "/signup"]

/** Where each user type lands after login (or when hitting /). */
const HOME: Record<UserType, string> = {
   admin: "/admin/dashboard",
   client: "/dashboard",
}

/** Route prefixes each user type is permitted to visit. */
const ALLOWED: Record<UserType, string[]> = {
   admin: ["/admin"],
   client: ["/dashboard"],
}

// ─── Proxy ────────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
   const { pathname } = request.nextUrl

   const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
         baseURL: request.nextUrl.origin,
         headers: { cookie: request.headers.get("cookie") ?? "" },
      },
   )

   const user = session?.user ?? null

   // ── Not authenticated ──────────────────────────────────────────────────────
   if (!user) {
      // Allow public routes through
      if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
         return NextResponse.next()
      }
      // Everything else → login
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
   }

   // ── Authenticated ──────────────────────────────────────────────────────────

   // Redirect away from public routes (login, signup)
   if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL(HOME[user.userType], request.url))
   }

   // Root → type-specific home
   if (pathname === "/") {
      return NextResponse.redirect(new URL(HOME[user.userType], request.url))
   }

   // Force password change — lock the user to /change-password until done
   if (user.mustChangePassword) {
      if (pathname.startsWith("/change-password")) return NextResponse.next()
      return NextResponse.redirect(new URL("/change-password", request.url))
   }

   // Prevent accessing /change-password when not required
   if (pathname.startsWith("/change-password")) {
      return NextResponse.redirect(new URL(HOME[user.userType], request.url))
   }

   // Block access to routes that don't belong to the user's type
   const allowed = ALLOWED[user.userType]
   const isAllowed = allowed.some((prefix) => pathname.startsWith(prefix))

   if (!isAllowed) {
      return NextResponse.redirect(new URL(HOME[user.userType], request.url))
   }

   return NextResponse.next()
}

export const config = {
   // Skip Next.js internals, static files, and the auth API itself
   matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
}
