import { relations } from "drizzle-orm"
import { pgTable, varchar, timestamp, unique, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { companyMaster } from "./masters"

// A user's bookmarked companies. Keyed to the user (not a subscription) so it
// survives subscription renewals/lapses — rows are only ever added or removed
// by the user, never auto-deleted. Access to view/edit is gated separately on
// the user having an active list or snapshot subscription.
export const watchlist = pgTable(
   "watchlist",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      userId: varchar("user_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [
      unique("watchlist_user_company_uq").on(table.userId, table.companyId),
      index("watchlist_user_idx").on(table.userId),
   ],
)

export const watchlistRelations = relations(watchlist, ({ one }) => ({
   user: one(user, { fields: [watchlist.userId], references: [user.id] }),
   company: one(companyMaster, { fields: [watchlist.companyId], references: [companyMaster.id] }),
}))

export type Watchlist = typeof watchlist.$inferSelect
