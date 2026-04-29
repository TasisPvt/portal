import { relations } from "drizzle-orm"
import {
   pgTable,
   varchar,
   timestamp,
   boolean,
   numeric,
   integer,
   index,
} from "drizzle-orm/pg-core"
import { indexMaster } from "./masters"
import { user } from "./auth"

export const pricingPlan = pgTable(
   "pricing_plan",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      name: varchar("name", { length: 255 }).notNull().unique(),
      type: varchar("type", { length: 20 }).notNull(), // 'snapshot' | 'list'
      isActive: boolean("is_active").notNull().default(true),
      // snapshot-only (stocks per duration — each duration has independent limits)
      oneTimeStocksPerDay: integer("one_time_stocks_per_day"),
      oneTimeStocksInDuration: integer("one_time_stocks_in_duration"),
      monthlyStocksPerDay: integer("monthly_stocks_per_day"),
      monthlyStocksInDuration: integer("monthly_stocks_in_duration"),
      quarterlyStocksPerDay: integer("quarterly_stocks_per_day"),
      quarterlyStocksInDuration: integer("quarterly_stocks_in_duration"),
      annualStocksPerDay: integer("annual_stocks_per_day"),
      annualStocksInDuration: integer("annual_stocks_in_duration"),
      // list-only
      indexId: varchar("index_id", { length: 36 }).references(() => indexMaster.id, { onDelete: "set null" }),
      // prices (monthlyPrice is snapshot-only; null for list)
      oneTimePrice: numeric("one_time_price", { precision: 12, scale: 2 }),
      monthlyPrice: numeric("monthly_price", { precision: 12, scale: 2 }),
      quarterlyPrice: numeric("quarterly_price", { precision: 12, scale: 2 }),
      annualPrice: numeric("annual_price", { precision: 12, scale: 2 }),
      // audit
      createdById: varchar("created_by_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("pricing_plan_type_idx").on(table.type),
      index("pricing_plan_index_idx").on(table.indexId),
      index("pricing_plan_created_by_idx").on(table.createdById),
   ],
)

export const pricingPlanRelations = relations(pricingPlan, ({ one }) => ({
   index: one(indexMaster, { fields: [pricingPlan.indexId], references: [indexMaster.id] }),
   createdBy: one(user, { fields: [pricingPlan.createdById], references: [user.id] }),
}))

export type PricingPlan = typeof pricingPlan.$inferSelect
