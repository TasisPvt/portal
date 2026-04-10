import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { auth } from "@/src/lib/auth"

export const authClient = createAuthClient({
   /** The base URL of the server (optional if you're using the same domain) */
   plugins: [inferAdditionalFields<typeof auth>()],
   baseURL: process.env.NEXT_PUBLIC_APP_BASE_URL,
})