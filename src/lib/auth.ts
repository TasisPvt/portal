import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { db } from "@/src/db/client"
import * as schema from "@/src/db/schema"

export const auth = betterAuth({
   database: drizzleAdapter(db, {
      provider: "mysql",
      schema,
   }),

   emailAndPassword: {
      enabled: true,
   },

   plugins: [nextCookies()],
})

export type User = typeof auth.$Infer.Session.user