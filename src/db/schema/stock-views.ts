import { relations } from "drizzle-orm"
import { pgTable, varchar, date, timestamp, unique, index } from "drizzle-orm/pg-core"
import { companyMaster } from "./masters"
import { subscription } from "./subscriptions"

export const stockViewLog = pgTable(
   "stock_view_log",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      subscriptionId: varchar("subscription_id", { length: 36 })
         .notNull()
         .references(() => subscription.id, { onDelete: "cascade" }),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "cascade" }),
      viewedDate: date("viewed_date").notNull(), // "YYYY-MM-DD"
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [
      unique("stock_view_log_sub_company_date_unique").on(
         table.subscriptionId,
         table.companyId,
         table.viewedDate,
      ),
      index("stock_view_log_subscription_idx").on(table.subscriptionId),
      index("stock_view_log_viewed_date_idx").on(table.viewedDate),
   ],
)

export const stockViewLogRelations = relations(stockViewLog, ({ one }) => ({
   subscription: one(subscription, {
      fields: [stockViewLog.subscriptionId],
      references: [subscription.id],
   }),
   company: one(companyMaster, {
      fields: [stockViewLog.companyId],
      references: [companyMaster.id],
   }),
}))

export type StockViewLog = typeof stockViewLog.$inferSelect
