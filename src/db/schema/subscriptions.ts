import { relations } from "drizzle-orm"
import { pgTable, varchar, timestamp, numeric, integer, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { pricingPlan } from "./pricing"

export const subscription = pgTable(
   "subscription",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      clientId: varchar("client_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      planId: varchar("plan_id", { length: 36 })
         .notNull()
         .references(() => pricingPlan.id, { onDelete: "restrict" }),
      durationType: varchar("duration_type", { length: 20 }).notNull(), // "one_time" | "monthly" | "quarterly" | "annual"
      status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "expired" | "cancelled"
      startDate: timestamp("start_date", { precision: 3 }).notNull(),
      endDate: timestamp("end_date", { precision: 3 }),
      // Snapshots taken at the time of subscription
      priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
      stocksPerDaySnapshot: integer("stocks_per_day_snapshot"),
      stocksInDurationSnapshot: integer("stocks_in_duration_snapshot"),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("subscription_client_idx").on(table.clientId),
      index("subscription_plan_idx").on(table.planId),
      index("subscription_status_idx").on(table.status),
   ],
)

export const subscriptionRelations = relations(subscription, ({ one }) => ({
   client: one(user, { fields: [subscription.clientId], references: [user.id] }),
   plan: one(pricingPlan, { fields: [subscription.planId], references: [pricingPlan.id] }),
}))

export type Subscription = typeof subscription.$inferSelect
