import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db } from "@/src/db/client"
import * as schema from "@/src/db/schema"
import type { AdminRole, UserType } from "@/src/db/schema"

export const auth = betterAuth({
   database: drizzleAdapter(db, {
      provider: "mysql",
      schema,
   }),

   emailAndPassword: {
      enabled: true,
   },

   // Surfaces userType and adminRole on the session object so every
   // server component / API route can gate access without an extra query.
   user: {
      additionalFields: {
         userType: {
            type: "string" as const,
            required: true,
            defaultValue: "client" satisfies UserType,
            // Clients choose their type at registration; admins are set server-side.
            input: true,
         },
         adminRole: {
            type: "string" as const,
            required: false,
            // Never accepted from the client — set programmatically by super_admin.
            input: false,
         },
      },
   },

   plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user & {
   userType: UserType
   adminRole: AdminRole | null
}
