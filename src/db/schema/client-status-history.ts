import { relations } from "drizzle-orm"
import { pgTable, pgEnum, varchar, text, timestamp, index } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const clientStatusActionEnum = pgEnum("client_status_action", ["activated", "deactivated"])

// Audit trail of every activation / deactivation performed on a client account.
// Append-only: one row per status change, capturing who did it and why. The
// acting admin's name is snapshotted so the log stays readable even if that
// admin is later removed (performedById then nulls out).
export const clientStatusHistory = pgTable(
   "client_status_history",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      clientId: varchar("client_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      action: clientStatusActionEnum("action").notNull(),
      reason: text("reason").notNull(),
      performedById: varchar("performed_by_id", { length: 36 }).references(() => user.id, {
         onDelete: "set null",
      }),
      performedByName: varchar("performed_by_name", { length: 255 }).notNull(),
      // timestamptz so the instant is stored unambiguously — a naive `timestamp`
      // gets misread when the DB session tz (IST) differs from the Node tz (UTC),
      // shifting displayed times by the offset.
      createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
   },
   (table) => [index("client_status_history_client_idx").on(table.clientId)],
)

export const clientStatusHistoryRelations = relations(clientStatusHistory, ({ one }) => ({
   client: one(user, {
      fields: [clientStatusHistory.clientId],
      references: [user.id],
      relationName: "client_status_history_client",
   }),
   performedBy: one(user, {
      fields: [clientStatusHistory.performedById],
      references: [user.id],
      relationName: "client_status_history_performed_by",
   }),
}))

export type ClientStatusHistory = typeof clientStatusHistory.$inferSelect
