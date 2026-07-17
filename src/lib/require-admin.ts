import "server-only"

import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { Roles, type Role } from "@/src/lib/constants"

type SessionUser = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"]

/**
 * Authorizes the caller as an admin-type user for a server action.
 *
 * Allowlist by design: only `userType === "admin"` passes. A client's
 * `adminRole` is null, so a `adminRole === MANAGER` blocklist would fail *open*
 * for clients — this helper never does. Pass `allowedRoles` to further restrict
 * an action to specific admin roles (e.g. keep managers out of destructive ops).
 *
 * Throws on failure — the rejected promise surfaces to the caller. Admin-only
 * UIs never trigger the throw, so legitimate flows are unaffected.
 */
export async function requireAdmin(allowedRoles?: Role[]): Promise<SessionUser> {
   const session = await auth.api.getSession({ headers: await headers() })
   const actor = session?.user
   if (!actor || actor.userType !== "admin") {
      throw new Error("Not authorized.")
   }
   if (allowedRoles && !allowedRoles.includes(actor.adminRole as Role)) {
      throw new Error("Your role is not permitted to perform this action.")
   }
   return actor
}

// Admin roles permitted to perform account activation/deactivation and other
// operations that managers are explicitly barred from.
export const NON_MANAGER_ROLES: Role[] = [Roles.SUPER_ADMIN, Roles.ADMIN]
