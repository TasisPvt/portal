import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { Roles } from "@/src/lib/constants"

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function signUp(name: string, email: string, password: string, userType: "client" | "admin") {
   const result = await auth.api.signUpEmail({
      body: { name, email, password, userType },
   })
   return result.user
}

// ─── Seeds ───────────────────────────────────────────────────────────────────

async function seedClient() {
   const created = await signUp(
      "Demo Client",
      "client@gmail.com",
      "Demo@123",
      "client",
   )

   await db.insert(clientProfile).values({
      id: randomUUID(),
      userId: created.id,
      username: "democlient",
      phone: "9000000001",
      aadharNumber: "234567890123",
      panNumber: "BCDFE2345G",
   })

   // signUpEmail creates a session — revoke it so seed doesn't leave stale sessions
   await auth.api.signOut({ headers: new Headers() })

   console.log(`✓ Client       ${created.email}  (id: ${created.id})`)
}

async function seedSuperAdmin() {
   const created = await signUp(
      "Super Admin",
      "sayedisa96@gmail.com",
      "Demo@123",
      "admin",
   )

   await db.update(user)
      .set({ adminRole: Roles.SUPER_ADMIN })
      .where(eq(user.id, created.id))

   console.log(`✓ Super Admin  ${created.email}  (id: ${created.id})`)
}

async function seedAdmin() {
   const created = await signUp(
      "Demo Admin",
      "admin@gmail.com",
      "Demo@123",
      "admin",
   )

   await db.update(user)
      .set({ adminRole: Roles.ADMIN })
      .where(eq(user.id, created.id))

   console.log(`✓ Admin        ${created.email}  (id: ${created.id})`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
   console.log("\nSeeding database...\n")

   await seedClient()
   await seedSuperAdmin()
   await seedAdmin()

   console.log("\nDone.\n")
   process.exit(0)
}

main().catch((err) => {
   console.error("\nSeed failed:", err)
   process.exit(1)
})
