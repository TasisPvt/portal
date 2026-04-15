import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { eq } from "drizzle-orm"

import { db } from "@/src/db/client"
import * as schema from "@/src/db/schema"
import { user } from "@/src/db/schema"
import type { AdminRole, UserType } from "@/src/db/schema"

export const auth = betterAuth({
   database: drizzleAdapter(db, {
      provider: "mysql",
      schema,
   }),

   emailAndPassword: {
      enabled: true,
   },

   // Block inactive users before a session is ever written to the DB.
   // Fires after credentials are validated — so wrong passwords still get
   // the generic "invalid" error, not this one.
   databaseHooks: {
      session: {
         create: {
            before: async (session) => {
               const [found] = await db
                  .select({ isActive: user.isActive })
                  .from(user)
                  .where(eq(user.id, session.userId))
                  .limit(1)

               if (found && !found.isActive) {
                  throw new APIError("FORBIDDEN", {
                     message: "Your account has been blocked. Contact the admin for further details.",
                  })
               }
            },
         },
      },
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
         mustChangePassword: {
            type: "boolean" as const,
            required: false,
            defaultValue: false,
            // Never accepted from the client — set by the server on account creation.
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
   mustChangePassword: boolean
}
