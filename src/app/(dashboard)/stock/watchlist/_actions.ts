"use server"

import { randomUUID } from "crypto"
import { and, count, desc, eq, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { watchlist, companyMaster, companyShariah, industryGroup } from "@/src/db/schema"
import { getSubscriptionAccess, canViewCompanySnapshot } from "@/src/lib/subscription-access"
import { WATCHLIST_LIMIT } from "@/src/lib/constants"

export type ToggleWatchlistResult =
   | { ok: true; watchlisted: boolean }
   | { ok: false; error: "unauthenticated" | "no_active_subscription" | "limit_reached" | "failed" }

// Add/remove a company from the current user's watchlist. Requires an active
// list OR snapshot subscription (bookmarks are user-owned but gated on access).
export async function toggleWatchlist(companyId: string): Promise<ToggleWatchlistResult> {
   const access = await getSubscriptionAccess()
   if (!access) return { ok: false, error: "unauthenticated" }
   if (!access.hasActiveList && !access.hasActiveSnapshot) {
      return { ok: false, error: "no_active_subscription" }
   }

   try {
      const [existing] = await db
         .select({ id: watchlist.id })
         .from(watchlist)
         .where(and(eq(watchlist.userId, access.userId), eq(watchlist.companyId, companyId)))
         .limit(1)

      if (existing) {
         await db.delete(watchlist).where(eq(watchlist.id, existing.id))
         revalidatePath("/stock/watchlist")
         return { ok: true, watchlisted: false }
      }

      // Enforce the cap only on additions - the user must free a slot first.
      const [{ value: current }] = await db
         .select({ value: count() })
         .from(watchlist)
         .where(eq(watchlist.userId, access.userId))

      if (current >= WATCHLIST_LIMIT) {
         return { ok: false, error: "limit_reached" }
      }

      await db
         .insert(watchlist)
         .values({ id: randomUUID(), userId: access.userId, companyId })
         .onConflictDoNothing()
      revalidatePath("/stock/watchlist")
      return { ok: true, watchlisted: true }
   } catch (err) {
      console.error("[toggleWatchlist]", err)
      return { ok: false, error: "failed" }
   }
}

// All companyIds the current user has bookmarked - used to seed the bookmark
// state on the snapshot and list pages. Reading your own bookmarks is ungated.
export async function getWatchlistedCompanyIds(): Promise<string[]> {
   const session = await auth.api.getSession({ headers: await headers() })
   if (!session) return []
   const rows = await db
      .select({ companyId: watchlist.companyId })
      .from(watchlist)
      .where(eq(watchlist.userId, session.user.id))
   return rows.map((r) => r.companyId)
}

export type WatchlistItem = {
   id: string
   companyName: string
   nseSymbol: string | null
   bseScripCode: string | null
   industryGroup: string | null
   shariahStatus: number | null
   canViewSnapshot: boolean
}

export type WatchlistData =
   | { noAccess: true }
   | { noAccess: false; hasActiveSnapshot: boolean; items: WatchlistItem[] }

export async function getWatchlist(): Promise<WatchlistData> {
   const access = await getSubscriptionAccess()
   if (!access || (!access.hasActiveList && !access.hasActiveSnapshot)) {
      return { noAccess: true }
   }

   const rows = await db
      .select({
         id: companyMaster.id,
         companyName: companyMaster.companyName,
         nseSymbol: companyMaster.nseSymbol,
         bseScripCode: companyMaster.bseScripCode,
         industryGroup: industryGroup.name,
      })
      .from(watchlist)
      .innerJoin(companyMaster, eq(watchlist.companyId, companyMaster.id))
      .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
      .where(eq(watchlist.userId, access.userId))
      .orderBy(desc(watchlist.createdAt))

   if (!rows.length) {
      return { noAccess: false, hasActiveSnapshot: access.hasActiveSnapshot, items: [] }
   }

   const ids = rows.map((r) => r.id)

   // Latest shariah status per company (one row per company, newest month).
   const shariahRows = await db
      .selectDistinctOn([companyShariah.companyId], {
         companyId: companyShariah.companyId,
         shariahStatus: companyShariah.shariahStatus,
      })
      .from(companyShariah)
      .where(inArray(companyShariah.companyId, ids))
      .orderBy(companyShariah.companyId, desc(companyShariah.month))

   const statusMap = new Map(shariahRows.map((r) => [r.companyId, r.shariahStatus]))

   const items: WatchlistItem[] = rows.map((r) => ({
      id: r.id,
      companyName: r.companyName,
      nseSymbol: r.nseSymbol,
      bseScripCode: r.bseScripCode,
      industryGroup: r.industryGroup,
      shariahStatus: statusMap.get(r.id) ?? null,
      canViewSnapshot: canViewCompanySnapshot(access, r.id),
   }))

   return { noAccess: false, hasActiveSnapshot: access.hasActiveSnapshot, items }
}
